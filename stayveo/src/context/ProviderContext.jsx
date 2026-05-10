// ─── Provider Onboarding Context ────────────────────────────────────────
// Persists provider onboarding state in localStorage so it survives
// page refreshes. Cleared on successful onboarding completion.
// ────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback } from 'react';

const ProviderContext = createContext(null);
const STORAGE_KEY = 'providerOnboarding';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const INITIAL_STATE = {
  phone: '',
  providerId: '',
  name: '',
  email: '',
  otpVerified: false,
  isExistingUser: false,
  isVerified: false,
  services: [],        // e.g. ['PG', 'TIFFIN']
  completedSteps: [],  // e.g. ['otp', 'basic-info', 'services']
};

export function ProviderProvider({ children }) {
  const [state, setState] = useState(() => loadState() || INITIAL_STATE);

  const updateProvider = useCallback((updates) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearProvider = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
  }, []);

  return (
    <ProviderContext.Provider value={{ provider: state, updateProvider, clearProvider }}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error('useProvider must be used within ProviderProvider');
  return ctx;
}
