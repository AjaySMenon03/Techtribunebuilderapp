import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

/**
 * Module-level access token cache, kept in sync via onAuthStateChange.
 *
 * IMPORTANT: We skip INITIAL_SESSION because in @supabase/supabase-js v2.39+,
 * INITIAL_SESSION fires asynchronously and carries the session snapshot from
 * localStorage at registration time. If the user signs in between registration
 * and when INITIAL_SESSION fires, it would overwrite the fresh SIGNED_IN token
 * with the stale localStorage token → "Invalid JWT" from Edge Functions.
 *
 * The fallback path in getValidToken() (calling getSession()) handles the
 * page-reload case where INITIAL_SESSION would have been the only source.
 */
let _cachedAccessToken: string | null = null;

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') return;
  _cachedAccessToken = session?.access_token ?? null;
});

export function getCachedAccessToken(): string | null {
  return _cachedAccessToken;
}