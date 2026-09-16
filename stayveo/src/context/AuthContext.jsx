// ─── Auth Context (Enhanced with Backward Compatibility) ────────────────
// Global auth state shared across all components.
// Hydrates from localStorage so state survives page refreshes.
//
// MIGRATION FIX:
// Old users from the previous Supabase project may have:
// - Missing or undefined `userName` in localStorage
// - Corrupted or empty auth metadata
// - Stale session tokens
//
// This context now implements a robust fallback chain and auto-repair
// for old user data, ensuring the greeting NEVER shows "undefined".
// ────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  phone: '',
  email: '',
  exists: false,
  name: '',
  isAuthenticated: false,
  userId: '',
  college: '',
  // Tracks whether we've attempted to resolve the user's display name
  nameResolved: false,
};

// ── Safe localStorage helpers ───────────────────────────────────────────
// Defensive wrappers that handle null, undefined, empty strings, and
// corrupted values. Critical for old users whose localStorage may have
// been set to the literal string "undefined" or "null".
// ────────────────────────────────────────────────────────────────────────

function safeGetItem(key) {
  try {
    const value = localStorage.getItem(key);
    // Treat "undefined", "null", empty string as missing
    if (!value || value === 'undefined' || value === 'null' || value.trim() === '') {
      return null;
    }
    return value.trim();
  } catch (err) {
    console.warn(`⚠️ AuthContext: failed to read localStorage key "${key}":`, err);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
      localStorage.setItem(key, value.trim());
    }
  } catch (err) {
    console.warn(`⚠️ AuthContext: failed to write localStorage key "${key}":`, err);
  }
}

// ── Display Name Fallback Chain ─────────────────────────────────────────
// Tries multiple sources to find a valid display name for the user.
// This handles old users who may not have all metadata fields populated
// after the project migration.
//
// Priority:
// 1. Supabase user metadata → full_name
// 2. Supabase user metadata → username
// 3. Supabase user metadata → display_name
// 4. Supabase user metadata → name
// 5. Email username (before @)
// 6. localStorage userName
// 7. Fallback: "User"
// ────────────────────────────────────────────────────────────────────────

function resolveDisplayName(supabaseUser, localStorageName) {
  const sources = [];

  if (supabaseUser) {
    const meta = supabaseUser.user_metadata || {};
    const identities = supabaseUser.identities || [];

    // Check all possible metadata fields
    const candidates = [
      meta.full_name,
      meta.username,
      meta.display_name,
      meta.name,
      meta.preferred_username,
    ];

    // Also check identity data (e.g. from OAuth providers)
    for (const identity of identities) {
      const idData = identity.identity_data || {};
      candidates.push(idData.full_name, idData.name, idData.username);
    }

    // Check email username
    if (supabaseUser.email) {
      candidates.push(supabaseUser.email.split('@')[0]);
    }
    if (supabaseUser.phone) {
    }

    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c !== 'undefined' && c !== 'null') {
        sources.push({ value: c.trim(), source: 'supabase_metadata' });
        break; // Use first valid one
      }
    }
  }

  // localStorage fallback
  if (localStorageName) {
    sources.push({ value: localStorageName, source: 'localStorage' });
  }

  // Pick the best available name
  const resolved = sources[0];

  if (resolved) {
    return resolved.value;
  }

  console.warn('⚠️ AuthContext: could not resolve display name from any source, using fallback');
  return 'User';
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    // Hydrate from localStorage on first render
    const userId = safeGetItem('userId');
    const phone = safeGetItem('phone');
    const email = safeGetItem('email');
    const name = safeGetItem('userName');
    const college = safeGetItem('userCollege') || safeGetItem('selectedCollege');
    const profileComplete = safeGetItem('profileComplete') === 'true';

    if (userId) {
      return {
        phone: phone || '',
        email: email || '',
        exists: profileComplete,
        // If name is missing from localStorage (old user), use temporary placeholder
        // The useEffect below will resolve the proper name asynchronously
        name: name || '',
        isAuthenticated: true,
        userId,
        college: college || '',
        nameResolved: !!name, // If we already have a name, it's "resolved"
      };
    }
    return INITIAL_STATE;
  });

  // Ref to track if we've already attempted Supabase user resolution
  const resolutionAttempted = useRef(false);

  // ── Auto-repair: resolve display name for old users ─────────────────
  // If the user is authenticated but we don't have a valid name,
  // try to fetch it from Supabase auth metadata.
  // This runs once on mount and auto-repairs localStorage.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    if (authState.nameResolved && authState.name) return;
    if (resolutionAttempted.current) return;

    resolutionAttempted.current = true;

    (async () => {
      try {

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.warn('⚠️ AuthContext: supabase.auth.getUser() error:', error.message);
        }

        const localName = safeGetItem('userName');
        const resolvedName = resolveDisplayName(user, localName);

        // Auto-repair: save the resolved name back to localStorage
        // so future page loads don't need to re-resolve
        if (resolvedName && resolvedName !== 'User') {
          safeSetItem('userName', resolvedName);
        }

        setAuthState((prev) => ({
          ...prev,
          name: resolvedName,
          nameResolved: true,
        }));
      } catch (err) {
        console.error('❌ AuthContext: unexpected error during name resolution:', err);
        // Even on error, mark as resolved with a safe fallback
        const fallbackName = safeGetItem('userName') || 'User';
        setAuthState((prev) => ({
          ...prev,
          name: fallbackName,
          nameResolved: true,
        }));
      }
    })();
  }, [authState.isAuthenticated, authState.nameResolved, authState.name]);

  // ── Listen for Supabase auth state changes ────────────────────────────
  // If the user signs in/out via Supabase directly, sync our context.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const setAuth = useCallback((updates) => {
    setAuthState((prev) => {
      const next = { ...prev, ...updates };
      // Whenever name is set externally, mark as resolved and persist
      if (updates.name) {
        next.nameResolved = true;
        safeSetItem('userName', updates.name);
      }
      if (updates.email) {
        safeSetItem('email', updates.email);
      }
      if (updates.college) {
        safeSetItem('userCollege', updates.college);
        safeSetItem('userCollegeName', updates.college);
      }
      if (updates.collegeId) {
        safeSetItem('userCollegeId', updates.collegeId);
      }
      const changed = Object.keys(next).some((key) => next[key] !== prev[key]);
      if (!changed) return prev;
      return next;
    });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('userId');
    localStorage.removeItem('phone');
    localStorage.removeItem('email');
    localStorage.removeItem('userName');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userCollegeName');
    localStorage.removeItem('userCollegeId');
    localStorage.removeItem('profileComplete');
    localStorage.removeItem('selectedCollege');
    localStorage.removeItem('selectedCollegeName');
    localStorage.removeItem('selectedCollegeId');
    localStorage.removeItem('selectedCollegeLatitude');
    localStorage.removeItem('selectedCollegeLongitude');

    // Also sign out of Supabase to prevent stale sessions
    supabase.auth.signOut().catch(() => {});

    setAuthState(INITIAL_STATE);
    resolutionAttempted.current = false;
  }, []);

  // ── Computed safe display name ────────────────────────────────────────
  // This is THE single source of truth for the user's display name.
  // Every component should use this instead of reading localStorage directly.
  // ──────────────────────────────────────────────────────────────────────
  const displayName = authState.name && authState.name !== 'undefined' && authState.name !== 'null'
    ? authState.name
    : (authState.nameResolved ? 'User' : '');

  return (
    <AuthContext.Provider value={{ authState, setAuth, clearAuth, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
