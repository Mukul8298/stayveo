import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import DynamicServiceForm from '../../components/provider/DynamicServiceForm';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { getProviderServiceItem, updateProviderServiceItem } from '../../api/provider';
import { normalizeServiceType, providerServiceConfig } from '../../config/providerServices';
import './ProviderServiceFormPage.css';

export default function ProviderServiceEdit() {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const serviceType = normalizeServiceType(type);
  const config = providerServiceConfig[serviceType];
  const { provider } = useProvider();
  const toast = useToast();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!provider.phone || !id) return;

    let cancelled = false;
    getProviderServiceItem(provider.phone, serviceType, id)
      .then((res) => {
        if (!cancelled) setRecord(res.data);
      })
      .catch(() => {
        toast.error('Could not load service');
        navigate('/provider/services', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [provider.phone, serviceType, id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(data) {
    try {
      setSaving(true);
      await updateProviderServiceItem(provider.phone, serviceType, id, data);
      toast.success(`${config.label} updated`);
      navigate('/provider/services', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not update service');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="psf-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>{config.editTitle}</h1>
        </div>
        <div className="psf-loading">
          <Loader2 size={24} className="spinning" />
          <p>Loading service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="psf-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>{config.editTitle}</h1>
      </div>

      <div className="psf-content">
        <DynamicServiceForm
          serviceType={serviceType}
          providerId={provider.phone}
          initialValues={record}
          onSubmit={handleSubmit}
          submitLabel={config.submitEdit}
          loading={saving}
        />
      </div>
    </div>
  );
}
