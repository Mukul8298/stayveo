import { Navigate } from 'react-router-dom';
import { useProvider } from '../../context/ProviderContext';

export default function ProviderAuthGate({ children }) {
  const { providerLoading, providerAuthenticated, providerSessionState } = useProvider();

  if (providerLoading) {
    return <div className="provider-route-loading" role="status">Loading your provider workspace…</div>;
  }

  if (!providerAuthenticated) {
    if (providerSessionState === 'unavailable') {
      return <div className="provider-route-loading" role="alert">Unable to verify your provider session. Check the backend connection and refresh.</div>;
    }
    return <Navigate to="/provider/login" replace />;
  }

  return children;
}
