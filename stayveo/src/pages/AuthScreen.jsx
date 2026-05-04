import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import { sendOtp, verifyOtp } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './AuthScreen.css';

export default function AuthScreen() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── STEP 1: Send OTP ──────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const otpString = otp.join('');
      const res = await verifyOtp(phone, otpString);
      const { isProfileComplete, userId, data } = res.data;

      // Save user data to localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('phone', phone);

      // Update global auth state
      setAuth({
        phone,
        userId,
        isAuthenticated: true,
        exists: isProfileComplete,
        name: data?.name || '',
      });

      if (isProfileComplete) {
        // ── Returning user → go straight to home ────────────────────
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userCollege', data.college);
        localStorage.setItem('profileComplete', 'true');
        toast.success(`Welcome back, ${data.name}!`);
        navigate('/home', { state: { welcomeBack: true, name: data.name } });
      } else {
        // ── New user → go to college selection → onboarding ─────────
        toast.info('Please complete your profile');
        navigate('/college-select');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
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
      <button className="auth-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>

      <div className="auth-content">
        <div className="auth-header">
          <div className="auth-icon-wrap"><Phone size={28} /></div>
          <h1>{step === 'phone' ? 'Enter your number' : 'Verify OTP'}</h1>
          <p>{step === 'phone' ? "We'll send you a verification code" : `Code sent to +91 ${phone}`}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 'phone' ? (
          <div className="auth-form">
            <div className="phone-input">
              <span className="phone-prefix">+91</span>
              <input type="tel" placeholder="Phone number" maxLength={10}
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="phone-field" id="phone-input" autoFocus />
            </div>
            <Button variant="primary" fullWidth size="lg" onClick={handleSendOtp}
              disabled={phone.length < 10 || loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Sending...</> : 'Send OTP'}
            </Button>
          </div>
        ) : (
          <div className="auth-form">
            <div className="otp-inputs">
              {otp.map((d, i) => (
                <input key={i} id={`otp-${i}`} type="tel" maxLength={1}
                  className="otp-field" value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0} />
              ))}
            </div>
            <Button variant="primary" fullWidth size="lg"
              onClick={handleVerifyOtp}
              disabled={otp.some(d => !d) || loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Verifying...</> : 'Verify & Continue'}
            </Button>
            <button className="auth-resend" onClick={() => { setOtp(['','','','']); handleSendOtp(); }}>
              Resend code
            </button>
          </div>
        )}

        <div className="auth-divider"><span>or</span></div>

        <button className="google-btn" onClick={() => navigate('/college-select')}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
