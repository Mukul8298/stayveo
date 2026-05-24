// ─── Supabase Client (Enhanced) ─────────────────────────────────────────
// Connects frontend directly to Supabase for read-heavy queries
// (PG listings, services, search). Write operations still go through
// the Fastify backend for validation + business logic.
//
// MIGRATION NOTE:
// After switching to a new Supabase project, old auth tokens and cached
// sessions from the previous project will fail silently. This module
// detects stale sessions and clears them to prevent "Failed to fetch"
// and auth mismatch errors.
// ────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      // Persist sessions in localStorage (default behavior)
      persistSession: true,
      // Auto-refresh tokens before they expire
      autoRefreshToken: true,
      // Detect session changes in other tabs
      detectSessionInUrl: true,
    },
  }
);

// ── Stale Session Cleanup ───────────────────────────────────────────────
// After migrating to a new Supabase project, old tokens stored in
// localStorage under `sb-<old-project-ref>-auth-token` are invalid.
// This function finds and removes any stale Supabase auth keys that
// don't match the current project reference.
// ────────────────────────────────────────────────────────────────────────

/**
 * Extract the project reference from the Supabase URL.
 * URL format: https://<project-ref>.supabase.co
 */
function getCurrentProjectRef() {
  if (!SUPABASE_URL) return null;
  try {
    const url = new URL(SUPABASE_URL);
    // hostname = "<ref>.supabase.co"
    return url.hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Remove stale Supabase auth tokens from localStorage that belong
 * to a previous project. This prevents "Failed to fetch" errors
 * caused by the client sending expired/invalid JWTs to the new project.
 */
export function cleanStaleSupabaseSessions() {
  const currentRef = getCurrentProjectRef();
  if (!currentRef) return;

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Supabase stores auth tokens as: sb-<project-ref>-auth-token
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      // Extract the ref from the key
      const keyRef = key.replace('sb-', '').replace('-auth-token', '');
      if (keyRef !== currentRef) {
        keysToRemove.push(key);
        console.log(`🧹 Removing stale auth token for old project: ${keyRef}`);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  if (keysToRemove.length > 0) {
    console.log(`✅ Cleaned ${keysToRemove.length} stale Supabase session(s)`);
  }
}

// Run stale session cleanup on module load (once per page load)
cleanStaleSupabaseSessions();

export default supabase;
