// ─── Provider Onboarding Context ────────────────────────────────────────
// Persists provider onboarding state in localStorage so it survives
// page refreshes. Cleared on successful onboarding completion.
// ────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getProviderBusinessDetails } from '../api/provider';

const ProviderContext = createContext(null);
const STORAGE_KEY = 'providerOnboarding';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : null;
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
  activeServiceType: '',
  completedSteps: [],  // e.g. ['otp', 'basic-info', 'services']
};

export function ProviderProvider({ children }) {
  const [state, setState] = useState(() => loadState() || INITIAL_STATE);
  const [providerLoading, setProviderLoading] = useState(() => {
    const saved = loadState();
    return Boolean(saved?.phone && !saved?.activeServiceType && !saved?.services?.length);
  });
  const hydrationAttempted = useRef(false);

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
    hydrationAttempted.current = false;
    setProviderLoading(false);
  }, []);

  // Older sessions may only contain the provider's name and phone. Resolve
  // the saved service records from the existing profile endpoint before a
  // provider-aware page renders its persona.
  useEffect(() => {
    if (!state.phone || state.activeServiceType || state.services?.length || hydrationAttempted.current) {
      setProviderLoading(false);
      return undefined;
    }

    hydrationAttempted.current = true;
    setProviderLoading(true);
    let cancelled = false;

    getProviderBusinessDetails(state.phone)
      .then((response) => {
        if (cancelled) return;
        const details = response?.data || {};
        const services = Array.isArray(details.services)
          ? details.services
            .map((service) => service?.type || service?.serviceType || service)
            .filter(Boolean)
          : [];
        updateProvider({
          name: details.name || state.name,
          email: details.email || state.email,
          services,
        });
      })
      .catch(() => {
        // The page still renders with neutral copy when profile hydration is
        // unavailable; provider data is never replaced with a guessed type.
      })
      .finally(() => {
        if (!cancelled) setProviderLoading(false);
      });

    return () => { cancelled = true; };
  }, [state.phone, state.activeServiceType, state.services, state.name, state.email, updateProvider]);

  return (
    <ProviderContext.Provider value={{ provider: state, updateProvider, clearProvider, providerLoading }}>
      {children}
    </ProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProvider() {
  const ctx = useContext(ProviderContext);
  if (!ctx) throw new Error('useProvider must be used within ProviderProvider');
  return ctx;
}
