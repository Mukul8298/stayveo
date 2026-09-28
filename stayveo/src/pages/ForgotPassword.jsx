import { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import { forgotPassword, resetPassword, verifyPasswordReset } from '../api/client';
import { useToast } from '../context/ToastContext';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const role = searchParams.get('role') === 'PROVIDER' ? 'PROVIDER' : 'STUDENT';
  const loginPath = role === 'PROVIDER' ? '/provider/login' : '/auth';
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitEmail(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setStep('otp');
      toast.success('If an account exists, a reset code has been sent.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to send reset instructions.');
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await verifyPasswordReset(email.trim(), otp.trim());
      setResetToken(response.data?.resetToken || '');
      setStep('password');
    } catch (requestError) {
      setError(requestError.message || 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setError('');
    setLoading(true);
    try {
      await resetPassword(resetToken, password, confirmPassword);
      toast.success('Password updated. Please log in again.');
      navigate(loginPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-password-page">
      <button className="forgot-password-back" onClick={() => navigate(loginPath, { replace: true })} aria-label="Back to login">
        <ArrowLeft size={20} />
      </button>
      <section className="forgot-password-card">
        <div className="forgot-password-icon"><KeyRound size={28} /></div>
        <h1>{step === 'password' ? 'Create a new password' : 'Reset your password'}</h1>
        <p>{step === 'email' && 'Enter your email and we will send a verification code.'}</p>
        {step === 'otp' && <p>Enter the 4-digit code sent to {email}.</p>}
        {step === 'password' && <p>Choose a password with at least 6 characters.</p>}
        {error && <div className="forgot-password-error">{error}</div>}

        {step === 'email' && (
          <form onSubmit={submitEmail} className="forgot-password-form">
            <label htmlFor="forgot-email">Email address</label>
            <div className="forgot-password-field"><Mail size={18} /><input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus autoComplete="email" /></div>
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>{loading ? <><Loader2 size={18} className="spin" /> Sending...</> : 'Send verification code'}</Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={submitOtp} className="forgot-password-form">
            <label htmlFor="reset-otp">Verification code</label>
            <input id="reset-otp" className="forgot-password-otp" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} required autoFocus />
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading || otp.length !== 4}>{loading ? <><Loader2 size={18} className="spin" /> Verifying...</> : 'Verify code'}</Button>
            <button type="button" className="forgot-password-secondary" onClick={() => setStep('email')}>Use a different email</button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword} className="forgot-password-form">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus autoComplete="new-password" />
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" />
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>{loading ? <><Loader2 size={18} className="spin" /> Updating...</> : <><CheckCircle2 size={18} /> Update password</>}</Button>
          </form>
        )}
      </section>
    </main>
  );
}
