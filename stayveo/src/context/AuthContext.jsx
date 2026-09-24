// ─── Auth Context ───────────────────────────────────────────────────────
// The HttpOnly stayveo_session cookie is the authentication source of truth.
// This context only mirrors the current user returned by /auth/me for UI
// rendering; it never persists or reads a session token in browser storage.

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getAuthMe, logout } from '../api/client';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  phone: '',
  email: '',
  exists: false,
  name: '',
  isAuthenticated: false,
  isLoading: true,
  userId: '',
  college: '',
  role: '',
  nameResolved: false,
};

function safeSetItem(key, value) {
  try {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    if (normalized && normalized !== 'undefined' && normalized !== 'null') {
      localStorage.setItem(key, normalized);
    }
  } catch {
    // Browser storage is only a convenience cache and must never affect auth.
  }
}

function clearCachedProfile() {
  [
    'userId',
    'phone',
    'email',
    'userName',
    'userCollege',
    'userCollegeName',
    'userCollegeId',
    'profileComplete',
    'selectedCollege',
    'selectedCollegeName',
    'selectedCollegeId',
    'selectedCollegeLatitude',
    'selectedCollegeLongitude',
  ].forEach((key) => localStorage.removeItem(key));
}

function stateFromServerUser(user) {
  const profile = user?.profile || null;
  const name = profile?.fullName || profile?.name || '';
  const college = profile?.college || user?.collegeName || '';

  if (user?.id) safeSetItem('userId', user.id);
  if (user?.email) safeSetItem('email', user.email);
  if (name) safeSetItem('userName', name);
  if (college) safeSetItem('userCollege', college);
  safeSetItem('profileComplete', profile ? 'true' : 'false');

  return {
    phone: user?.phone || '',
    email: user?.email || '',
    exists: Boolean(profile),
    name,
    isAuthenticated: true,
    isLoading: false,
    userId: user?.id || '',
    college,
    role: user?.role || '',
    nameResolved: Boolean(name),
  };
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(INITIAL_STATE);
  const authVersion = useRef(0);

  // Ask the backend whether the HttpOnly cookie is still valid on every app
  // start. No localStorage value can authenticate a browser session.
  useEffect(() => {
    let cancelled = false;
    const requestVersion = authVersion.current;

    getAuthMe()
      .then((response) => {
        if (cancelled || requestVersion !== authVersion.current) return;
        const data = response?.data;
        setAuthState(data?.authenticated && data.user
          ? stateFromServerUser(data.user)
          : { ...INITIAL_STATE, isLoading: false });
      })
      .catch(() => {
        if (!cancelled && requestVersion === authVersion.current) {
          setAuthState({ ...INITIAL_STATE, isLoading: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const setAuth = useCallback((updates) => {
    authVersion.current += 1;
    setAuthState((previous) => ({
      ...previous,
      ...updates,
      isLoading: false,
      nameResolved: updates.name ? true : previous.nameResolved,
    }));

    if (updates.userId) safeSetItem('userId', updates.userId);
    if (updates.email) safeSetItem('email', updates.email);
    if (updates.name) safeSetItem('userName', updates.name);
    if (updates.college) {
      safeSetItem('userCollege', updates.college);
      safeSetItem('userCollegeName', updates.college);
    }
    if (updates.collegeId) safeSetItem('userCollegeId', updates.collegeId);
    if (updates.isAuthenticated !== undefined) {
      safeSetItem('profileComplete', updates.exists ? 'true' : 'false');
    }
  }, []);

  const clearAuth = useCallback(() => {
    authVersion.current += 1;
    void logout().catch(() => {});
    clearCachedProfile();
    setAuthState({ ...INITIAL_STATE, isLoading: false });
  }, []);

  const displayName = authState.name || (authState.nameResolved ? 'User' : '');

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
