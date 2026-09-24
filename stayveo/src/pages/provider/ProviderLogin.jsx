import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, CheckCircle2, Mail, Lock, KeyRound } from 'lucide-react';
import Button from '../../components/Button';
import { providerSendOtp, providerVerifyOtp, providerResendOtp } from '../../api/provider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderLogin.css';

export default function ProviderLogin() {
  const navigate = useNavigate();
  const toast = useToast();
  const { updateProvider } = useProvider();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // ── STEP 1: Send OTP via Email + Password ────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await providerSendOtp(email.trim(), password);
      setStep('otp');
      toast.success(`Verification code sent to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
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
      const res = await providerVerifyOtp(email.trim(), otpString);
      const d = res.data;

      updateProvider({
        email: email.trim(),
        phone: d.phone || '',
        providerId: d.providerId,
        userId: d.userId,
        name: d.name || '',
        services: d.services || (d.nextStep?.startsWith('tiffin') ? ['TIFFIN'] : []),
        activeServiceType: d.nextStep?.startsWith('tiffin') ? 'TIFFIN' : '',
        otpVerified: true,
        isVerified: d.isVerified,
        isExistingUser: d.nextStep === 'dashboard',
      });

      if (d.nextStep === 'dashboard') {
        toast.success(`Welcome back, ${d.name || 'Provider'}!`);
        navigate('/provider/dashboard');
      } else if (d.nextStep === 'tiffin_dashboard') {
        toast.success(`Welcome back, ${d.name || 'Provider'}!`);
        navigate('/provider/tiffin/dashboard');
      } else if (d.nextStep === 'tiffin_onboarding') {
        toast.info('Continue your Tiffin service setup');
        navigate('/provider/tiffin/onboarding');
      } else if (d.nextStep === 'pg_onboarding') {
        toast.info('Continue your PG provider setup');
        navigate('/provider/pg/onboarding');
      } else {
        // select_type, basic_info, or any unknown → type selection
        toast.info("Let's set up your provider profile");
        navigate('/provider/select');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResending(true);
    try {
      await providerResendOtp(email.trim());
      setOtp(['', '', '', '']);
      toast.success('New verification code sent!');
    } catch (err) {
      setError(err.message || 'Failed to resend code');
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val.length > 1) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) document.getElementById(`pl-otp-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`pl-otp-${i - 1}`)?.focus();
    }
  };

  return (
    <div className="pl-page" id="provider-login">
      <button
        className="pl-back"
        onClick={() => (step === 'otp' ? setStep('credentials') : navigate(-1))}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="pl-content">
        <div className="pl-header">
          <div className="pl-icon-wrap">
            {step === 'credentials' ? <Building2 size={32} /> : <KeyRound size={32} />}
          </div>
          <h1>{step === 'credentials' ? 'Provider Portal' : 'Verify Email OTP'}</h1>
          <p>
            {step === 'credentials'
              ? 'Enter your email and password to access your StayVeo provider portal'
              : `Enter the code sent to ${email}`}
          </p>
        </div>

        {error && <div className="pl-error">{error}</div>}

        {step === 'credentials' ? (
          <form className="pl-form" onSubmit={handleSendOtp}>
            <div className="pl-input-group">
              <label htmlFor="provider-email-input">Email Address</label>
              <div className="pl-field-wrap">
                <Mail size={18} className="pl-icon" />
                <input
                  type="email"
                  className="pl-input-field"
                  placeholder="provider@stayveo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  id="provider-email-input"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="pl-input-group">
              <label htmlFor="provider-password-input">Password</label>
              <div className="pl-field-wrap">
                <Lock size={18} className="pl-icon" />
                <input
                  type="password"
                  className="pl-input-field"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="provider-password-input"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              variant="accent"
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
          <form className="pl-form pl-otp-section" onSubmit={handleVerifyOtp}>
            <div className="pl-otp-sent">
              <CheckCircle2 size={14} />
              <span>Verification code sent to your email</span>
            </div>
            <div className="pl-otp-inputs">
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`pl-otp-${i}`}
                  type="tel"
                  maxLength={1}
                  className={`pl-otp-field ${d ? 'filled' : ''}`}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <Button
              variant="accent"
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
              className="pl-resend"
              onClick={handleResendOtp}
              disabled={resending}
            >
              {resending ? 'Sending code...' : 'Resend code'}
            </button>
          </form>
        )}

        <div className="pl-features">
          <h3>Why StayVeo?</h3>
          <div className="pl-feature-grid">
            <div className="pl-feature"><span>📈</span> Reach students</div>
            <div className="pl-feature"><span>💳</span> Easy payments</div>
            <div className="pl-feature"><span>📊</span> Analytics</div>
            <div className="pl-feature"><span>✅</span> Verified badge</div>
          </div>
        </div>
      </div>
    </div>
  );
}
