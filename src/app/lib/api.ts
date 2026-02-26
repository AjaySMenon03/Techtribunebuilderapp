import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase, getCachedAccessToken } from './supabase';
import type { Newsletter, WorkspaceSettings } from './types';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-607373f0`;

/**
 * Check whether a JWT is expired (with a 60-second safety buffer).
 * Returns true if expired or malformed.
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    // JWT uses base64url — convert to standard base64 before decoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false; // no expiry claim = not expired
    // Expired if less than 60 seconds remain
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true; // malformed = treat as expired
  }
}

/**
 * Get a valid auth token.
 *
 * Priority:
 *  1. Cached token from onAuthStateChange (set on SIGNED_IN / TOKEN_REFRESHED)
 *  2. Session from supabase.auth.getSession()
 *  3. Explicit refresh via refreshSession()
 *  4. publicAnonKey (unauthenticated fallback)
 *
 * Every candidate is checked for expiry before use.
 */
async function getValidToken(): Promise<string> {
  // 1. Try the cached token (most reliable for fresh sign-in)
  const cached = getCachedAccessToken();
  if (cached && !isJwtExpired(cached)) {
    return cached;
  }

  // 2. Try getSession() — handles page reloads and auto-refreshed sessions
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.access_token && !isJwtExpired(session.access_token)) {
      return session.access_token;
    }

    // 3. Session exists but token is expired/stale → explicit refresh
    if (session) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.access_token && !isJwtExpired(refreshData.session.access_token)) {
        return refreshData.session.access_token;
      }
    }
  } catch (e) {
    console.warn('[getValidToken] Exception:', e);
  }

  // 4. No valid session at all
  return publicAnonKey;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Always use the anon key for the Authorization header so the
    // Supabase Edge Function gateway accepts the request. The user's
    // access token (if any) is sent in X-User-Token for the Hono handler.
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  // Only attach the user token header when we have a real user JWT
  // (i.e. not the anon key itself).
  if (token !== publicAnonKey) {
    headers['X-User-Token'] = token;
  }
  return headers;
}

async function getAuthToken(): Promise<string> {
  return getValidToken();
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();

  // Retry logic for network errors (e.g. Edge Function cold starts)
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1500, 3000, 5000]; // exponential-ish backoff

  let res: Response | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, ...options.headers },
      });
      lastError = undefined;
      break; // success — exit retry loop
    } catch (e: any) {
      lastError = e;
      // Only retry on network errors (Failed to fetch), not on other errors
      if (e instanceof TypeError && String(e).includes('Failed to fetch') && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 3000;
        console.log(`[apiRequest] Network error on ${path} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }

  if (!res) {
    throw lastError || new Error(`Network request to ${path} failed after ${MAX_RETRIES + 1} attempts`);
  }

  // If the server returns 401 (user token invalid/expired), try refreshing
  if (res.status === 401) {
    console.log(`Got 401 on ${path}, attempting token refresh...`);
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.access_token) {
        const retryHeaders: Record<string, string> = {
          ...headers,
          ...(options.headers as Record<string, string>),
          'X-User-Token': refreshData.session.access_token,
        };
        res = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        });
      }
    } catch (refreshError) {
      console.log('Token refresh failed:', refreshError);
    }

    // For GET requests that still fail, try without any user token (anonymous)
    if (res.status === 401) {
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'GET') {
        console.log(`Still 401 on GET ${path} after refresh, falling back to anonymous...`);
        const anonHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          // No X-User-Token → server treats as anonymous
        };
        res = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers: anonHeaders,
        });
      }
    }
  }

  const data = await res.json();
  if (!res.ok) {
    console.error(`API error [${path}]:`, data);
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }
  return data;
}

// Newsletter APIs

export async function fetchNewsletters(): Promise<Newsletter[]> {
  const data = await apiRequest('/newsletters');
  return data.newsletters || [];
}

export async function fetchNewsletter(id: string): Promise<Newsletter> {
  const data = await apiRequest(`/newsletters/${id}`);
  return data.newsletter;
}

export async function createNewsletter(payload: Partial<Newsletter>): Promise<Newsletter> {
  const data = await apiRequest('/newsletters', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.newsletter;
}

export async function updateNewsletter(id: string, payload: Partial<Newsletter>): Promise<Newsletter> {
  const data = await apiRequest(`/newsletters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.newsletter;
}

/** Auto-save: saves without incrementing version */
export async function autoSaveNewsletter(id: string, payload: Partial<Newsletter>): Promise<Newsletter> {
  const data = await apiRequest(`/newsletters/${id}?auto_save=true`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.newsletter;
}

export async function deleteNewsletter(id: string): Promise<void> {
  await apiRequest(`/newsletters/${id}`, { method: 'DELETE' });
}

export async function duplicateNewsletter(id: string): Promise<Newsletter> {
  const data = await apiRequest(`/newsletters/${id}/duplicate`, { method: 'POST' });
  return data.newsletter;
}

// Workspace APIs

export async function fetchWorkspace(): Promise<WorkspaceSettings> {
  const data = await apiRequest('/workspace');
  return data.workspace;
}

export async function updateWorkspace(payload: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const data = await apiRequest('/workspace', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.workspace;
}

export async function uploadLogo(file: File): Promise<string> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  if (token !== publicAnonKey) {
    headers['X-User-Token'] = token;
  }

  const res = await fetch(`${BASE_URL}/upload/logo`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Logo upload error:', data);
    throw new Error(data.error || 'Logo upload failed');
  }
  return data.logo_url;
}

/** Upload newsletter asset image */
export async function uploadAsset(file: File): Promise<string> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  if (token !== publicAnonKey) {
    headers['X-User-Token'] = token;
  }

  const res = await fetch(`${BASE_URL}/upload/asset`, {
    method: 'POST',
    headers,
    body: formData,
  });

  // Guard against non-JSON responses (e.g. gateway HTML error pages)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Asset upload returned non-JSON response:', res.status, text.slice(0, 200));
    throw new Error(`Asset upload failed (HTTP ${res.status}). The server returned an unexpected response. Please try again.`);
  }

  const data = await res.json();
  if (!res.ok) {
    console.error('Asset upload error:', data);
    throw new Error(data.error || 'Asset upload failed');
  }
  return data.url;
}

// Auth APIs

export async function signUp(email: string, password: string, name: string) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data;
}