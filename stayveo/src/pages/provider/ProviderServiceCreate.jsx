import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DynamicServiceForm from '../../components/provider/DynamicServiceForm';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { createProviderServiceItem } from '../../api/provider';
import { normalizeServiceType, providerServiceConfig } from '../../config/providerServices';
import './ProviderServiceFormPage.css';

export default function ProviderServiceCreate() {
  const navigate = useNavigate();
  const { type } = useParams();
  const serviceType = normalizeServiceType(type);
  const config = providerServiceConfig[serviceType];
  const { provider } = useProvider();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(data) {
    try {
      setSaving(true);
      await createProviderServiceItem(provider.phone, serviceType, data);
      toast.success(`${config.label} created`);
      navigate('/provider/services', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Backend endpoint is not ready for this service yet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="psf-page">

      <div className="psf-content">
        <div className="psf-hero">
          <div className="psf-hero-icon" style={{ background: config.bg, color: config.accent }}>
            {config.emoji}
          </div>
          <div>
            <h2>{config.createTitle}</h2>
            <p>{config.emptyDescription}</p>
          </div>
        </div>

        <DynamicServiceForm
          serviceType={serviceType}
          providerId={provider.phone}
          onSubmit={handleSubmit}
          submitLabel={config.submitCreate}
          loading={saving}
        />
      </div>
    </div>
  );
}
