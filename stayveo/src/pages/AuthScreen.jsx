import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import Button from '../components/Button';
import { startAuth, verifyOtp, resendOtp } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './AuthScreen.css';

export default function AuthScreen() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // ── STEP 1: Send Credentials ──────────────────────────────────────────
  const handleStartAuth = async (e) => {
    e?.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await startAuth(email.trim(), password, 'STUDENT');
      setStep('otp');
      toast.success('Verification code sent to your email!');
    } catch (err) {
      setError(err.message || 'Authentication failed');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const otpString = otp.join('');
      const res = await verifyOtp(email.trim(), otpString, 'STUDENT');
      const { isProfileComplete, userId, data } = res.data;
      const displayName = data?.fullName || data?.name || '';

      localStorage.setItem('userId', userId);
      localStorage.setItem('email', email.trim());

      setAuth({
        email: email.trim(),
        userId,
        isAuthenticated: true,
        exists: isProfileComplete,
        name: displayName,
      });

      if (isProfileComplete) {
        localStorage.setItem('userName', displayName);
        localStorage.setItem('userCollege', data?.college || '');
        localStorage.setItem('profileComplete', 'true');
        toast.success(`Welcome back, ${displayName || 'Student'}!`);
        const returnTo = localStorage.getItem('tiffinReservationReturn');
        if (returnTo) {
          localStorage.removeItem('tiffinReservationReturn');
          navigate(returnTo);
        } else {
          navigate('/home', { state: { welcomeBack: true, name: displayName } });
        }
      } else {
        toast.info('Please complete your profile');
        navigate('/college-select');
      }
    } catch (err) {
      const message = err?.message || 'Verification failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResending(true);
    try {
      await resendOtp(email.trim(), 'STUDENT');
      setOtp(['', '', '', '']);
      toast.success('New verification code sent to your email!');
    } catch (err) {
      setError(err.message || 'Failed to resend code');
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[i] = val;
    setOtp(newOtp);
    if (val && i < 3) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  return (
    <div className="auth-page" id="auth-screen">
      <button
        className="auth-back"
        onClick={() => (step === 'otp' ? setStep('credentials') : navigate(-1))}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="auth-content">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            {step === 'credentials' ? <Mail size={28} /> : <KeyRound size={28} />}
          </div>
          <h1>{step === 'credentials' ? 'Welcome to StayVeo' : 'Verify Email OTP'}</h1>
          <p>
            {step === 'credentials'
              ? 'Enter your email and password to log in or create an account'
              : `We sent a 4-digit verification code to ${email}`}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 'credentials' ? (
          <form className="auth-form" onSubmit={handleStartAuth}>
            <div className="input-group">
              <label htmlFor="email-input">Email Address</label>
              <div className="input-field-wrap">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-field"
                  id="email-input"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password-input">Password</label>
              <div className="input-field-wrap">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-field"
                  id="password-input"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              type="submit"
              disabled={!email || password.length < 6 || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Processing...</>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="otp-inputs">
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="tel"
                  maxLength={1}
                  className="otp-field"
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              type="submit"
              disabled={otp.some((d) => !d) || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Verifying...</>
              ) : (
                'Verify & Continue'
              )}
            </Button>
            <button
              type="button"
              className="auth-resend"
              onClick={handleResendOtp}
              disabled={resending}
            >
              {resending ? 'Sending code...' : 'Resend code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
