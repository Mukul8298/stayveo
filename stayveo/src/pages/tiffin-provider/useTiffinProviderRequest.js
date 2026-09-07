import { useEffect, useState } from 'react';
import { useProvider } from '../../context/ProviderContext';

export function useTiffinProviderRequest(loader, dependencies = []) {
  const { provider } = useProvider();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let cancelled = false;
    loader(provider)
      .then((response) => {
        if (!cancelled) setState({ loading: false, error: '', data: response.data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error: error.message || 'Unable to load Tiffin data', data: null });
      });
    return () => { cancelled = true; };
    // The caller controls the loader identity through dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { ...state, provider };
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}
