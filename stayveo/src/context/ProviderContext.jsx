// ─── Provider Context ──────────────────────────────────────────────────
// Local storage keeps non-sensitive onboarding/UI state convenient between
// steps. Provider identity and authentication always come from the current
// HttpOnly provider session and /api/v1/provider/me.

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getProviderCurrentProfile } from '../api/client';

const ProviderContext = createContext(null);
const STORAGE_KEY = 'providerOnboarding';

const INITIAL_STATE = {
  phone: '',
  providerId: '',
  userId: '',
  name: '',
  email: '',
  otpVerified: false,
  isExistingUser: false,
  isVerified: false,
  services: [],
  activeServiceType: '',
  completedSteps: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

function normalizeServiceType(service) {
  const raw = service?.type || service?.serviceType || service?.service_type || service;
  if (!raw) return '';
  const normalized = String(raw).toUpperCase();
  return normalized === 'PG' || normalized === 'TIFFIN' ? normalized : '';
}

function providerStateFromServer(raw, previous) {
  const profile = raw || {};
  const user = profile.user || {};
  const services = (Array.isArray(profile.services) ? profile.services : [])
    .map(normalizeServiceType)
    .filter((type, index, values) => type && values.indexOf(type) === index);
  if (profile.tiffinService && !services.includes('TIFFIN')) services.push('TIFFIN');
  const activeServiceType = services.length === 1 ? services[0] : previous.activeServiceType;

  return {
    ...previous,
    providerId: profile.providerId || profile.id || previous.providerId,
    userId: profile.userId || user.id || previous.userId,
    phone: profile.phone || profile.phone_number || user.phone_number || previous.phone,
    email: profile.email || user.email || previous.email,
    name: profile.name || previous.name,
    isVerified: Boolean(profile.isVerified ?? previous.isVerified),
    otpVerified: Boolean(profile.otpVerified ?? true),
    services: services.length ? services : previous.services,
    activeServiceType,
    isExistingUser: true,
  };
}

export function ProviderProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerAuthenticated, setProviderAuthenticated] = useState(false);
  const [providerSessionState, setProviderSessionState] = useState('loading');
  const hydrationVersion = useRef(0);

  const updateProvider = useCallback((updates) => {
    hydrationVersion.current += 1;
    setState((previous) => {
      const next = { ...previous, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* convenience cache only */ }
      return next;
    });
    if (updates.userId || updates.providerId || updates.isAuthenticated) {
      setProviderAuthenticated(true);
      setProviderSessionState('authenticated');
    }
  }, []);

  const clearProvider = useCallback(() => {
    hydrationVersion.current += 1;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore storage failures */ }
    setState(INITIAL_STATE);
    setProviderAuthenticated(false);
    setProviderSessionState('unauthenticated');
    setProviderLoading(false);
  }, []);

  const refreshProvider = useCallback(async () => {
    const requestVersion = hydrationVersion.current;
    setProviderLoading(true);
    try {
      const response = await getProviderCurrentProfile();
      if (requestVersion !== hydrationVersion.current) return null;
      const current = response?.data;
      setState((previous) => {
        const next = providerStateFromServer(current, previous);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* convenience cache only */ }
        return next;
      });
      setProviderAuthenticated(true);
      setProviderSessionState('authenticated');
      return current;
    } catch (error) {
      if (requestVersion !== hydrationVersion.current) return null;
      // A valid provider session can briefly have no profile during the first
      // onboarding step. Only a rejected/expired session makes the user
      // unauthenticated; the server response remains the authority.
      setProviderAuthenticated(false);
      setProviderSessionState(error?.details?.status === 401 ? 'unauthenticated' : 'unavailable');
      return null;
    } finally {
      setProviderLoading(false);
    }
  }, []);

  useEffect(() => {
    // The async refresh synchronizes this context with the server-side
    // session; keep the effect itself free of synchronous state writes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshProvider();
  }, [refreshProvider]);

  return (
    <ProviderContext.Provider value={{
      provider: state,
      updateProvider,
      clearProvider,
      refreshProvider,
      providerLoading,
      providerAuthenticated,
      providerSessionState,
    }}>
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
