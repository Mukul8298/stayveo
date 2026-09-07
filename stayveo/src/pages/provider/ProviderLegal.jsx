import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SERVICE_TYPES, getProviderPersona } from '../../config/providerServices';
import { useProvider } from '../../context/ProviderContext';
import './ProviderLegal.css';

export default function ProviderLegal() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const settingsBase = getProviderPersona(provider).type === SERVICE_TYPES.TIFFIN ? '/provider/tiffin/settings' : '/provider/settings';

  return (
    <main className="plegal-page" id="provider-legal">
      <div className="plegal-content">
        <button className="plegal-back" type="button" onClick={() => navigate(settingsBase)}>
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </button>
        <header className="plegal-heading">
          <div>
            <h1>Legal &amp; Privacy</h1>
            <p>Review the policies that protect your provider account and customer data.</p>
          </div>
          <ShieldCheck size={28} />
        </header>
        <section className="plegal-card">
          <article>
            <FileText size={19} />
            <div><h2>Terms of Service</h2><p>Your use of the StayVeo provider workspace is governed by the current platform terms.</p></div>
          </article>
          <article>
            <ShieldCheck size={19} />
            <div><h2>Data Protection</h2><p>Provider profile and customer information is used to operate your StayVeo services.</p></div>
          </article>
        </section>
      </div>
    </main>
  );
}
