// ─── Auth Context ─────────────────────────────────────────────────────
// Global auth state shared across all components.
// Hydrates from localStorage so state survives page refreshes.
// ──────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  phone: '',
  exists: false,
  name: '',
  isAuthenticated: false,
  userId: '',
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    // Hydrate from localStorage on first render
    const userId = localStorage.getItem('userId');
    const phone = localStorage.getItem('phone');
    const name = localStorage.getItem('userName');
    const profileComplete = localStorage.getItem('profileComplete') === 'true';

    if (userId && phone) {
      return {
        phone,
        exists: profileComplete,
        name: name || '',
        isAuthenticated: true,
        userId,
      };
    }
    return INITIAL_STATE;
  });

  const setAuth = useCallback((updates) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('userId');
    localStorage.removeItem('phone');
    localStorage.removeItem('userName');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('profileComplete');
    localStorage.removeItem('selectedCollege');
    setAuthState(INITIAL_STATE);
  }, []);

  return (
    <AuthContext.Provider value={{ authState, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
