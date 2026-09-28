import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProvider } from '../context/ProviderContext';
import { getLastActivePortal, setLastActivePortal, LAST_ACTIVE_PORTALS } from '../lib/lastActivePortal';
import './SplashScreen.css';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [progress, setProgress] = useState(0);

  const { providerAuthenticated, providerLoading, provider } = useProvider();


  useEffect(() => {
    const interval = setInterval(
      () => setProgress((p) => Math.min(p + 2, 100)),
      40
    );

    // Wait for both auth systems to finish hydration.
    if (authState.isLoading || providerLoading) {
      return () => clearInterval(interval);
    }

    const timer = setTimeout(() => {
      if (authState.isAuthenticated) {
        setLastActivePortal(LAST_ACTIVE_PORTALS.STUDENT);
        navigate('/home', { replace: true });
        return;
      }

      if (providerAuthenticated) {
        const lastActivePortal = getLastActivePortal();
        const services = Array.isArray(provider?.services) ? provider.services : [];
        const providerType = provider?.providerType || provider?.activeServiceType;
        const supportsPg = services.includes('PG') || providerType === 'PG';
        const supportsTiffin = services.includes('TIFFIN') || providerType === 'TIFFIN';

        if (lastActivePortal === LAST_ACTIVE_PORTALS.PROVIDER_TIFFIN && supportsTiffin) {
          setLastActivePortal(LAST_ACTIVE_PORTALS.PROVIDER_TIFFIN);
          navigate('/provider/tiffin/dashboard', { replace: true });
          return;
        }

        if (lastActivePortal === LAST_ACTIVE_PORTALS.PROVIDER_PG && supportsPg) {
          setLastActivePortal(LAST_ACTIVE_PORTALS.PROVIDER_PG);
          navigate('/provider/dashboard', { replace: true });
          return;
        }
      }

      navigate('/role-select', { replace: true });
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [
    authState.isLoading,
    authState.isAuthenticated,
    providerLoading,
    providerAuthenticated,
    provider,
    navigate,
  ]);

  return (
    <div className="splash" id="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="splash-icon">🏠</div>
          <div className="splash-rings">
            <div className="splash-ring splash-ring-1" />
            <div className="splash-ring splash-ring-2" />
            <div className="splash-ring splash-ring-3" />
          </div>
        </div>
        <h1 className="splash-title">StayVeo</h1>
        <p className="splash-tagline">Find your perfect stay, near campus.</p>
        <div className="splash-progress">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <p className="splash-footer">Made for students, by students</p>
    </div>
  );
}
