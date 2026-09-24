import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  HeadphonesIcon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { SERVICE_TYPES, getProviderPersona } from '../../config/providerServices';
import { getProviderBankDetails, providerLogout } from '../../api/provider';
import './ProviderSettings.css';

export default function ProviderSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { provider, clearProvider, providerLoading, providerAuthenticated } = useProvider();
  const [bankSummary, setBankSummary] = useState({ loading: true, linked: false, masked: '', ifscCode: '' });
  const routeIsTiffin = location.pathname.startsWith('/provider/tiffin/');
  const persona = getProviderPersona(routeIsTiffin ? { ...provider, activeServiceType: SERVICE_TYPES.TIFFIN } : provider);
  const settingsBase = routeIsTiffin || persona.type === SERVICE_TYPES.TIFFIN ? '/provider/tiffin/settings' : '/provider/settings';
  const PersonaIcon = persona.icon;
  const providerName = provider.name || 'Provider';
  const initial = providerName.trim().charAt(0).toUpperCase() || 'P';
  const contactItems = [provider.email, provider.phone].filter(Boolean);

  useEffect(() => {
    if (providerLoading || !providerAuthenticated) return undefined;
    let cancelled = false;
    getProviderBankDetails()
      .then((response) => {
        if (cancelled) return;
        const details = response?.data || {};
        setBankSummary({
          loading: false,
          linked: Boolean(details.linked && details.bankDetails),
          masked: details.bankDetails?.accountNumberMasked || '',
          ifscCode: details.bankDetails?.ifscCode || '',
        });
      })
      .catch(() => {
        if (!cancelled) setBankSummary((current) => ({ ...current, loading: false }));
      });
    return () => { cancelled = true; };
  }, [providerLoading, providerAuthenticated]);

  const accountItems = [
    {
      icon: PersonaIcon,
      label: 'Business Details',
      description: persona.businessDetailsSubtitle,
      path: `${settingsBase}/business-details`,
    },
    {
      icon: CreditCard,
      label: 'Bank Details',
      description: bankSummary.loading
        ? 'Loading payout account status...'
        : bankSummary.linked
          ? `✓ Bank account linked · ${bankSummary.masked}${bankSummary.ifscCode ? ` · IFSC: ${bankSummary.ifscCode}` : ''}`
          : 'No bank account linked · Connect your payout account.',
      path: `${settingsBase}/bank-details`,
    },
  ];

  const supportItems = [
    {
      icon: HeadphonesIcon,
      label: 'Help & Support',
      description: 'Contact founders, browse FAQ, or report a bug.',
      path: `${settingsBase}/help`,
    },
    {
      icon: ShieldCheck,
      label: 'Legal & Privacy',
      description: 'Terms of service and data protection policies.',
      path: `${settingsBase}/legal`,
      tone: 'danger',
    },
  ];

  async function handleLogout() {
    try { await providerLogout(); } finally {
      clearProvider();
      navigate('/provider/login', { replace: true });
    }
  }

  return (
    <main className="pset-page" id="provider-settings">
      <header className="pset-heading">
        <div>
          <h1>Settings</h1>
          <p>{providerLoading && persona.isUnknown ? 'Loading your provider preferences...' : persona.settingsSubtitle}</p>
        </div>
        <button className="pset-heading-action" type="button" onClick={() => navigate(`${settingsBase}/business-details`)}>
          <PersonaIcon size={16} />
          <span>Business Details</span>
        </button>
      </header>

      <section className="pset-profile" aria-label="Provider profile">
        <div className="pset-avatar-wrap">
          <div className="pset-avatar" aria-hidden="true">{initial}</div>
          <span className="pset-avatar-camera" aria-hidden="true">
            <Camera size={14} />
          </span>
        </div>
        <div className="pset-profile-info">
          <div className="pset-name-row">
            <h2>{providerName}</h2>
            {provider.isVerified && <CheckCircle2 className="pset-verified" size={17} aria-label="Verified provider" />}
          </div>
          <p className="pset-profile-contact">{contactItems.length ? contactItems.join('  •  ') : 'Contact details not added yet'}</p>
          <span className={`pset-service-badge${persona.isUnknown ? ' is-pending' : ''}`}>
            <PersonaIcon size={15} />
            <span>{persona.isUnknown ? 'Provider account' : persona.label}</span>
          </span>
        </div>
      </section>

      <SettingsGroup title="Account Management" items={accountItems} onNavigate={navigate} />
      <SettingsGroup title="Support & Identity" items={supportItems} onNavigate={navigate} />

      <button className="pset-logout" type="button" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Log Out</span>
      </button>
    </main>
  );
}

function SettingsGroup({ title, items, onNavigate }) {
  return (
    <section className="pset-group" aria-labelledby={`settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
      <h2 id={`settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{title}</h2>
      <div className="pset-menu">
        {items.map(({ icon: Icon, label, description, path, tone }) => (
          <button className="pset-menu-item" type="button" key={label} onClick={() => onNavigate(path)}>
            <span className={`pset-menu-icon${tone ? ` is-${tone}` : ''}`}><Icon size={21} /></span>
            <span className="pset-menu-copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <ChevronRight className="pset-menu-chevron" size={21} />
          </button>
        ))}
      </div>
    </section>
  );
}
