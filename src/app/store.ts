import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { Newsletter, WorkspaceSettings } from './lib/types';
import { DEFAULT_WORKSPACE } from './lib/types';
import { supabase } from './lib/supabase';
import * as api from './lib/api';

// --- Auth Store ---

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  _initialized: boolean;
  _unsubscribe: (() => void) | null;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  _initialized: false,
  _unsubscribe: null,

  initialize: async () => {
    // Guard: only initialize once
    if (get()._initialized) return;
    set({ _initialized: true });

    try {
      // Register the auth state change listener FIRST, before checking session.
      // This ensures we don't miss any events that fire while we're doing async work.
      // Supabase fires INITIAL_SESSION synchronously when registering.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Only update state for meaningful auth events.
        // INITIAL_SESSION is handled below via getSession; skip it here to
        // avoid a race where an async INITIAL_SESSION overwrites state we
        // already set from getSession / getUser.
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          set({ user: session?.user ?? null, session });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        }
        // Ignore other events (USER_UPDATED, PASSWORD_RECOVERY, etc.)
        // unless they carry session info we need
      });

      // Store unsubscribe so we could clean up if needed
      set({ _unsubscribe: () => subscription.unsubscribe() });

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.log('Auth session error during init:', error.message);
        set({ user: null, session: null, loading: false });
      } else if (session?.access_token) {
        // Validate the session server-side via getUser() to catch stale/invalid tokens
        // getUser() contacts the Supabase Auth API directly, not Edge Functions
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          console.log('Session validation failed during init:', userError?.message || 'No user returned');
          // Stale/invalid session — clear local state but do NOT call signOut()
          // because that can trigger a cascade of onAuthStateChange events.
          // Just clear the local state; the invalid session will expire naturally.
          set({ user: null, session: null, loading: false });
        } else {
          // Session is valid — but we might have a refreshed token now, re-read it
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          set({
            user: userData.user,
            session: freshSession ?? session,
            loading: false,
          });
        }
      } else {
        set({ user: null, session: null, loading: false });
      }
    } catch (e) {
      console.error('Auth initialization error:', e);
      set({ user: null, session: null, loading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user, session: data.session });
  },

  signInWithGoogle: async () => {
    // Do not forget to complete setup at https://supabase.com/docs/guides/auth/social-login/auth-google
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  },

  signUp: async (email, password, name) => {
    await api.signUp(email, password, name);
    // Auto sign in after signup
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user, session: data.session });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

// --- Newsletter Store ---

interface NewsletterState {
  newsletters: Newsletter[];
  currentNewsletter: Newsletter | null;
  loading: boolean;
  searchQuery: string;
  filterMonth: number | null;
  filterYear: number | null;
  setSearchQuery: (q: string) => void;
  setFilterMonth: (m: number | null) => void;
  setFilterYear: (y: number | null) => void;
  fetchAll: () => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (payload: Partial<Newsletter>) => Promise<Newsletter>;
  update: (id: string, payload: Partial<Newsletter>) => Promise<void>;
  autoSave: (id: string, payload: Partial<Newsletter>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Newsletter>;
  filteredNewsletters: () => Newsletter[];
}

export const useNewsletterStore = create<NewsletterState>((set, get) => ({
  newsletters: [],
  currentNewsletter: null,
  loading: false,
  searchQuery: '',
  filterMonth: null,
  filterYear: null,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterMonth: (m) => set({ filterMonth: m }),
  setFilterYear: (y) => set({ filterYear: y }),

  fetchAll: async () => {
    set({ loading: true });
    try {
      const newsletters = await api.fetchNewsletters();
      set({ newsletters, loading: false });
    } catch (e) {
      console.error('Error fetching newsletters:', e);
      set({ loading: false });
    }
  },

  fetchOne: async (id) => {
    set({ loading: true });
    try {
      const newsletter = await api.fetchNewsletter(id);
      set({ currentNewsletter: newsletter, loading: false });
    } catch (e) {
      console.error('Error fetching newsletter:', e);
      set({ loading: false });
    }
  },

  create: async (payload) => {
    const newsletter = await api.createNewsletter(payload);
    set((s) => ({ newsletters: [newsletter, ...s.newsletters] }));
    return newsletter;
  },

  update: async (id, payload) => {
    const updated = await api.updateNewsletter(id, payload);
    set((s) => ({
      newsletters: s.newsletters.map((n) => (n.id === id ? updated : n)),
      currentNewsletter: s.currentNewsletter?.id === id ? updated : s.currentNewsletter,
    }));
  },

  /** Auto-save: doesn't increment version */
  autoSave: async (id: string, payload: Partial<Newsletter>) => {
    const updated = await api.autoSaveNewsletter(id, payload);
    set((s) => ({
      newsletters: s.newsletters.map((n) => (n.id === id ? updated : n)),
      currentNewsletter: s.currentNewsletter?.id === id ? updated : s.currentNewsletter,
    }));
  },

  remove: async (id) => {
    await api.deleteNewsletter(id);
    set((s) => ({
      newsletters: s.newsletters.filter((n) => n.id !== id),
      currentNewsletter: s.currentNewsletter?.id === id ? null : s.currentNewsletter,
    }));
  },

  duplicate: async (id) => {
    const newsletter = await api.duplicateNewsletter(id);
    set((s) => ({ newsletters: [newsletter, ...s.newsletters] }));
    return newsletter;
  },

  filteredNewsletters: () => {
    const { newsletters, searchQuery, filterMonth, filterYear } = get();
    return newsletters.filter((n) => {
      const matchesSearch = !searchQuery ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = filterMonth === null || n.month === filterMonth;
      const matchesYear = filterYear === null || n.year === filterYear;
      return matchesSearch && matchesMonth && matchesYear;
    });
  },
}));

// --- Workspace Store ---

interface WorkspaceState {
  workspace: WorkspaceSettings;
  loading: boolean;
  fetch: () => Promise<void>;
  update: (payload: Partial<WorkspaceSettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: { ...DEFAULT_WORKSPACE },
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const workspace = await api.fetchWorkspace();
      set({ workspace, loading: false });
    } catch (e) {
      console.error('Error fetching workspace:', e);
      set({ loading: false });
    }
  },

  update: async (payload) => {
    try {
      const updated = await api.updateWorkspace(payload);
      set({ workspace: updated });
    } catch (e) {
      console.error('Error updating workspace:', e);
      throw e;
    }
  },

  uploadLogo: async (file) => {
    try {
      const logoUrl = await api.uploadLogo(file);
      const ws = get().workspace;
      const updated = await api.updateWorkspace({ ...ws, logo_url: logoUrl });
      set({ workspace: updated });
    } catch (e) {
      console.error('Error uploading logo:', e);
      throw e;
    }
  },
}));