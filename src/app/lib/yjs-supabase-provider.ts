/**
 * Custom Yjs provider using Supabase Realtime as transport.
 * Handles: Y.Doc sync (broadcast), Presence (awareness), and cleanup.
 */
import * as Y from 'yjs';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

// -- Helpers for Uint8Array <-> Base64 --
function uint8ToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// -- User colors for presence --
export const COLLAB_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];

export interface CollabUser {
  userId: string;
  name: string;
  color: string;
  editingSectionId: string | null;
  editingField: string | null;
  lastActive: number;
}

export interface YjsProviderCallbacks {
  onRemoteUpdate: () => void;
  onPresenceChange: (users: CollabUser[]) => void;
  onSynced: () => void;
}

export class YjsSupabaseProvider {
  ydoc: Y.Doc;
  channel: RealtimeChannel | null = null;
  private channelName: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private callbacks: YjsProviderCallbacks;
  private connected = false;
  private destroyed = false;
  private syncRequestSent = false;
  private editingSectionId: string | null = null;
  private editingField: string | null = null;

  constructor(
    newsletterId: string,
    userId: string,
    userName: string,
    ydoc: Y.Doc,
    callbacks: YjsProviderCallbacks,
  ) {
    this.ydoc = ydoc;
    this.channelName = `newsletter-collab-${newsletterId}`;
    this.userId = userId;
    this.userName = userName;
    this.userColor = COLLAB_COLORS[Math.abs(hashCode(userId)) % COLLAB_COLORS.length];
    this.callbacks = callbacks;

    this.setupDoc();
  }

  private setupDoc() {
    // Listen for local changes → broadcast to peers
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin === 'remote' || origin === 'init') return;
      this.broadcastUpdate(update);
    });
  }

  async connect() {
    if (this.destroyed) return;

    this.channel = supabase.channel(this.channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.userId },
      },
    });

    // Listen for Y.Doc updates from peers
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (this.destroyed) return;
      try {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.ydoc, update, 'remote');
        this.callbacks.onRemoteUpdate();
      } catch (e) {
        console.error('Error applying remote Yjs update:', e);
      }
    });

    // Listen for sync requests (new peer joining)
    this.channel.on('broadcast', { event: 'yjs-sync-request' }, ({ payload }) => {
      if (this.destroyed || payload.requesterId === this.userId) return;
      // Send full state to the new peer
      const state = Y.encodeStateAsUpdate(this.ydoc);
      this.channel?.send({
        type: 'broadcast',
        event: 'yjs-sync-response',
        payload: {
          state: uint8ToBase64(state),
          targetId: payload.requesterId,
        },
      });
    });

    // Listen for sync responses
    this.channel.on('broadcast', { event: 'yjs-sync-response' }, ({ payload }) => {
      if (this.destroyed || payload.targetId !== this.userId) return;
      try {
        const state = base64ToUint8(payload.state);
        Y.applyUpdate(this.ydoc, state, 'remote');
        this.callbacks.onRemoteUpdate();
        this.callbacks.onSynced();
      } catch (e) {
        console.error('Error applying sync response:', e);
      }
    });

    // Presence sync
    this.channel.on('presence', { event: 'sync' }, () => {
      this.handlePresenceUpdate();
    });

    this.channel.on('presence', { event: 'join' }, () => {
      this.handlePresenceUpdate();
    });

    this.channel.on('presence', { event: 'leave' }, () => {
      this.handlePresenceUpdate();
    });

    // Subscribe
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;

        // Track presence
        await this.channel?.track({
          userId: this.userId,
          name: this.userName,
          color: this.userColor,
          editingSectionId: this.editingSectionId,
          editingField: this.editingField,
          lastActive: Date.now(),
        });

        // Request sync from existing peers
        if (!this.syncRequestSent) {
          this.syncRequestSent = true;
          this.channel?.send({
            type: 'broadcast',
            event: 'yjs-sync-request',
            payload: { requesterId: this.userId },
          });

          // If no response in 2s, consider ourselves synced (we're first)
          setTimeout(() => {
            if (!this.destroyed) {
              this.callbacks.onSynced();
            }
          }, 2000);
        }
      }
    });
  }

  private broadcastUpdate(update: Uint8Array) {
    if (!this.connected || this.destroyed || !this.channel) return;
    try {
      this.channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: uint8ToBase64(update) },
      });
    } catch (e) {
      console.error('Error broadcasting Yjs update:', e);
    }
  }

  private handlePresenceUpdate() {
    if (!this.channel || this.destroyed) return;
    const presenceState = this.channel.presenceState();
    const users: CollabUser[] = [];

    for (const [_key, presences] of Object.entries(presenceState)) {
      const entries = presences as any[];
      for (const p of entries) {
        if (p.userId === this.userId) continue; // exclude self
        users.push({
          userId: p.userId,
          name: p.name,
          color: p.color,
          editingSectionId: p.editingSectionId || null,
          editingField: p.editingField || null,
          lastActive: p.lastActive || Date.now(),
        });
      }
    }

    this.callbacks.onPresenceChange(users);
  }

  /** Update which section/field the local user is editing */
  async setEditingSection(sectionId: string | null, field: string | null = null) {
    this.editingSectionId = sectionId;
    this.editingField = field;
    if (this.connected && this.channel) {
      await this.channel.track({
        userId: this.userId,
        name: this.userName,
        color: this.userColor,
        editingSectionId: sectionId,
        editingField: field,
        lastActive: Date.now(),
      });
    }
  }

  /** Get current user color */
  getColor(): string {
    return this.userColor;
  }

  /** Get current user info */
  getLocalUser(): CollabUser {
    return {
      userId: this.userId,
      name: this.userName,
      color: this.userColor,
      editingSectionId: this.editingSectionId,
      editingField: this.editingField,
      lastActive: Date.now(),
    };
  }

  destroy() {
    this.destroyed = true;
    this.connected = false;
    if (this.channel) {
      this.channel.untrack();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
