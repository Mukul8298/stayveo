import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 40);
    const timer = setTimeout(() => navigate('/role-select'), 2200);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [navigate]);

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
