import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import { providerSendOtp, providerVerifyOtp } from '../../api/provider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderLogin.css';

export default function ProviderLogin() {
  const navigate = useNavigate();
  const toast = useToast();
  const { updateProvider } = useProvider();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── STEP 1: Send OTP ──────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setError('');
    setLoading(true);
    try {
      await providerSendOtp(phone);
      setStep('otp');
      toast.success('OTP sent to +91 ' + phone);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
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
      const res = await providerVerifyOtp(phone, otpString);
      const d = res.data;

      updateProvider({
        phone,
        providerId: d.providerId,
        name: d.name || '',
        otpVerified: true,
        isVerified: d.isVerified,
        isExistingUser: d.nextStep === 'dashboard',
      });

      if (d.nextStep === 'dashboard') {
        toast.success(`Welcome back, ${d.name}!`);
        navigate('/provider/dashboard');
      } else {
        toast.info('Let\'s set up your provider profile');
        navigate('/provider/onboarding');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
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
      <button className="pl-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </button>

      <div className="pl-content">
        <div className="pl-header">
          <div className="pl-icon-wrap">
            <Building2 size={32} />
          </div>
          <h1>{step === 'phone' ? 'Provider Login' : 'Verify OTP'}</h1>
          <p>
            {step === 'phone'
              ? 'Enter your phone number to get started as a provider'
              : `Enter the code sent to +91 ${phone}`}
          </p>
        </div>

        {error && <div className="pl-error">{error}</div>}

        {step === 'phone' ? (
          <div className="pl-form">
            <div className="pl-phone-input">
              <span className="pl-prefix">+91</span>
              <input
                type="tel"
                className="pl-phone-field"
                placeholder="98765 43210"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                id="provider-phone-input"
                autoFocus
              />
            </div>
            <Button
              variant="accent"
              fullWidth
              size="lg"
              onClick={handleSendOtp}
              disabled={phone.length < 10 || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Sending...</>
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>
        ) : (
          <div className="pl-form pl-otp-section">
            <div className="pl-otp-sent">
              <CheckCircle2 size={14} />
              <span>OTP sent successfully</span>
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
              onClick={handleVerifyOtp}
              disabled={otp.some((d) => !d) || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="spin" /> Verifying...</>
              ) : (
                'Verify & Continue'
              )}
            </Button>
            <button
              className="pl-resend"
              onClick={() => {
                setOtp(['', '', '', '']);
                handleSendOtp();
              }}
            >
              Resend code
            </button>
          </div>
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
