import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Eye,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { getProviderBankDetails, updateProviderBankDetails } from '../../api/provider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderBankDetails.css';

const EMPTY_FORM = {
  accountHolderName: '',
  accountNumber: '',
  ifscCode: '',
  bankName: '',
  aadhaarNumber: '',
  panNumber: '',
};

function formFromResponse(data) {
  return {
    accountHolderName: data?.bankDetails?.accountHolderName || '',
    // The server intentionally never returns the full account number. A blank
    // value means "keep the existing account" when editing.
    accountNumber: '',
    ifscCode: data?.bankDetails?.ifscCode || '',
    bankName: data?.bankDetails?.bankName || '',
    aadhaarNumber: data?.kyc?.aadhaarNumber || '',
    panNumber: data?.kyc?.panNumber || '',
  };
}

function validate(form, linked) {
  if (form.accountHolderName.trim().length < 2) return 'Enter the account holder name.';
  if (!linked && !/^\d{9,18}$/.test(form.accountNumber.replace(/\s/g, ''))) return 'Enter a valid 9 to 18 digit account number.';
  if (form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber.replace(/\s/g, ''))) return 'Enter a valid 9 to 18 digit account number.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) return 'Enter a valid Indian IFSC code.';
  if (form.bankName.trim().length < 2) return 'Enter the bank name.';
  return '';
}

export default function ProviderBankDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { providerLoading, providerAuthenticated } = useProvider();
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedDetails, setSavedDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKyc, setEditingKyc] = useState(false);
  const [error, setError] = useState('');

  const settingsBase = useMemo(
    () => location.pathname.startsWith('/provider/tiffin/') ? '/provider/tiffin/settings' : '/provider/settings',
    [location.pathname],
  );

  useEffect(() => {
    if (providerLoading || !providerAuthenticated) return undefined;
    let cancelled = false;
    getProviderBankDetails()
      .then((response) => {
        if (cancelled) return;
        const data = response?.data || {};
        setSavedDetails(data);
        setForm(formFromResponse(data));
        setError('');
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Unable to load bank details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [providerLoading, providerAuthenticated]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    const linked = Boolean(savedDetails?.linked);
    const validationError = validate(form, linked);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        accountHolderName: form.accountHolderName.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        bankName: form.bankName.trim(),
        ...(form.accountNumber.trim() ? { accountNumber: form.accountNumber.replace(/\s/g, '') } : {}),
        ...(editingKyc ? {
          aadhaarNumber: form.aadhaarNumber.replace(/\s/g, ''),
          panNumber: form.panNumber.trim().toUpperCase(),
        } : {}),
      };
      const response = await updateProviderBankDetails(payload);
      setSavedDetails(response?.data || null);
      setForm(formFromResponse(response?.data));
      setEditingKyc(false);
      toast.success('Bank details saved successfully');
      navigate(settingsBase, { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save bank details.');
      toast.error(saveError.message || 'Unable to save bank details.');
    } finally {
      setSaving(false);
    }
  }

  if (providerLoading || loading) return <PageState><Loader2 className="payout-spinner" size={20} /> Loading bank details…</PageState>;
  if (!providerAuthenticated) return <PageState>Provider authentication is required. Please sign in again.</PageState>;

  const linked = Boolean(savedDetails?.linked);
  const kyc = savedDetails?.kyc || {};

  return (
    <main className="payout-page" id="provider-bank-details">
      <div className="payout-content">
        <button className="payout-back" type="button" onClick={() => navigate(settingsBase)}>
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </button>

        <header className="payout-heading">
          <div>
            <span className="payout-eyebrow">Payout settings</span>
            <h1>Bank Details</h1>
            <p>Securely manage your payout and KYC information.</p>
          </div>
          <span className={`payout-status${linked ? ' is-linked' : ''}`}>
            <span /> {linked ? 'Bank account linked' : 'Payout setup pending'}
          </span>
        </header>

        {error && <div className="payout-error" role="alert">{error}</div>}

        <section className="payout-security">
          <div className="payout-security-icon"><ShieldCheck size={22} /></div>
          <div>
            <h2>Your payout information is protected</h2>
            <p>StayVeo encrypts your account number before storing it. Only the masked account ending is shown after saving.</p>
          </div>
          <span className="payout-encrypted"><LockKeyhole size={14} /> Secure handling</span>
        </section>

        <form onSubmit={save}>
          <section className="payout-form-card">
            <div className="payout-card-heading">
              <div className="payout-card-icon"><Landmark size={21} /></div>
              <div><h2>Bank Account Details</h2><p>Use the account that should receive provider settlements.</p></div>
            </div>
            <div className="payout-form-grid">
              <Field label="Account Holder Name" htmlFor="account-holder">
                <input id="account-holder" value={form.accountHolderName} onChange={(event) => updateField('accountHolderName', event.target.value)} autoComplete="name" placeholder="As shown on your bank account" />
              </Field>
              <Field label="Bank Account Number" htmlFor="account-number" hint={linked ? `Saved account: ${savedDetails.bankDetails.accountNumberMasked}. Leave blank to keep it.` : '9 to 18 digits'}>
                <div className="payout-input-wrap">
                  <Banknote size={17} />
                  <input id="account-number" type="password" inputMode="numeric" value={form.accountNumber} onChange={(event) => updateField('accountNumber', event.target.value.replace(/\D/g, ''))} autoComplete="off" placeholder={linked ? savedDetails.bankDetails.accountNumberMasked : 'Enter account number'} />
                  {linked && <span className="payout-input-badge"><Eye size={14} /> masked</span>}
                </div>
              </Field>
              <Field label="IFSC Code" htmlFor="ifsc-code" hint="Example: HDFC0001234">
                <input id="ifsc-code" value={form.ifscCode} onChange={(event) => updateField('ifscCode', event.target.value.toUpperCase())} maxLength={11} autoComplete="off" placeholder="Enter IFSC code" />
              </Field>
              <Field label="Bank Name" htmlFor="bank-name">
                <input id="bank-name" value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} autoComplete="organization" placeholder="Enter bank name" />
              </Field>
            </div>
          </section>

          <section className="payout-form-card payout-kyc-card">
            <div className="payout-card-heading">
              <div className="payout-card-icon"><ShieldCheck size={21} /></div>
              <div><h2>KYC Details</h2><p>These values are carried over from provider onboarding.</p></div>
              <button type="button" className="payout-edit-link" onClick={() => setEditingKyc((current) => !current)}>
                <Pencil size={15} /> {editingKyc ? 'Cancel edit' : 'Edit KYC Details'}
              </button>
            </div>
            <div className="payout-form-grid payout-kyc-grid">
              <Field label="Aadhaar Number" htmlFor="aadhaar-number" hint={!editingKyc && kyc.aadhaarMasked ? 'Masked for your security' : undefined}>
                <input id="aadhaar-number" value={editingKyc ? form.aadhaarNumber : (kyc.aadhaarMasked || 'Not added')} onChange={(event) => updateField('aadhaarNumber', event.target.value.replace(/\D/g, ''))} readOnly={!editingKyc} inputMode="numeric" maxLength={12} />
              </Field>
              <Field label="PAN Number" htmlFor="pan-number" hint={!editingKyc && kyc.panMasked ? 'Masked for your security' : undefined}>
                <input id="pan-number" value={editingKyc ? form.panNumber : (kyc.panMasked || 'Not added')} onChange={(event) => updateField('panNumber', event.target.value.toUpperCase())} readOnly={!editingKyc} maxLength={10} />
              </Field>
            </div>
            <div className="payout-kyc-note"><CheckCircle2 size={15} /> Aadhaar and PAN remain linked to your existing provider verification record.</div>
          </section>

          <div className="payout-actions">
            <button type="button" className="payout-secondary-button" onClick={() => navigate(settingsBase)}>Cancel</button>
            <button type="submit" className="payout-primary-button" disabled={saving}>
              {saving ? <><Loader2 size={16} className="payout-spinner" /> Saving…</> : <><LockKeyhole size={16} /> Save Bank Details</>}
            </button>
          </div>
        </form>

        <section className="payout-note"><Info size={17} /><p>Your financial details are securely handled and are not exposed unnecessarily in the StayVeo browser session. Cashfree payout activation, if required, remains a separate payment-provider step.</p></section>
      </div>
    </main>
  );
}

function Field({ label, htmlFor, hint, children }) {
  return <label className="payout-field" htmlFor={htmlFor}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function PageState({ children }) {
  return <main className="payout-page"><div className="payout-content payout-page-state">{children}</div></main>;
}
