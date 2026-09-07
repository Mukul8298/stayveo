import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Info,
  LockKeyhole,
  QrCode,
  WalletCards,
} from 'lucide-react';
import { SERVICE_TYPES, getProviderPersona } from '../../config/providerServices';
import { useProvider } from '../../context/ProviderContext';
import './ProviderBankDetails.css';

export default function ProviderBankDetails() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const settingsBase = getProviderPersona(provider).type === SERVICE_TYPES.TIFFIN ? '/provider/tiffin/settings' : '/provider/settings';
  const providerName = provider.name || 'Provider';

  return (
    <main className="payout-page" id="provider-bank-details">
      <div className="payout-content">
        <button className="payout-back" type="button" onClick={() => navigate(settingsBase)}>
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </button>

        <header className="payout-heading">
          <div>
            <h1>Bank Details</h1>
            <p>Manage your payout destinations and automated settlement channels.</p>
          </div>
          <span className="payout-status"><span /> Payout setup pending</span>
        </header>

        <section className="payout-security">
          <div className="payout-security-icon"><LockKeyhole size={22} /></div>
          <div>
            <h2>Direct Bank &amp; UPI Payouts Protected</h2>
            <p>Connect a verified payout destination to receive automated settlement transfers. Financial details are handled only by the payout service.</p>
          </div>
          <span className="payout-encrypted"><LockKeyhole size={14} /> Secure linking</span>
        </section>

        <PayoutSectionLabel label="Payment Destination (Instant)" note="Standard 0% fee" />
        <section className="payout-card payout-empty-card">
          <div className="payout-card-icon"><QrCode size={23} /></div>
          <div className="payout-card-copy">
            <h2>No UPI destination linked</h2>
            <p>Link a verified UPI ID to receive instant student refunds and micro-settlements.</p>
          </div>
          <button className="payout-secondary-button" type="button" onClick={() => navigate(`${settingsBase}/help`)}>
            <WalletCards size={16} />
            <span>Contact support</span>
          </button>
        </section>

        <PayoutSectionLabel label="Direct Settlement Account" note="Weekly settlement cycle" />
        <section className="payout-card payout-empty-card payout-bank-card">
          <div className="payout-card-icon"><Building2 size={23} /></div>
          <div className="payout-card-copy">
            <h2>No bank account linked</h2>
            <p>Connect your primary bank account to enable automated weekly earnings settlement.</p>
          </div>
          <button className="payout-primary-button" type="button" onClick={() => navigate(`${settingsBase}/help`)}>
            <CreditCard size={16} />
            <span>Connect account</span>
          </button>
        </section>

        <section className="payout-note">
          <Info size={18} />
          <p>Account linking is ready for the payout provider connection. No bank credentials are stored in the StayVeo browser session.</p>
        </section>

        <p className="payout-session-note"><CheckCircle2 size={15} /> Signed in as {providerName}</p>
      </div>
    </main>
  );
}

function PayoutSectionLabel({ label, note }) {
  return <div className="payout-section-label"><span>{label}</span><small>{note}</small></div>;
}
