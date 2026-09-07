import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  FileText,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Save,
  Store,
  Utensils,
  X,
} from 'lucide-react';
import { getProviderBusinessDetails, getRoomListings, updateProviderBusinessDetails } from '../../api/provider';
import { getTiffinBusinessDetails, getTiffinSettings, updateTiffinBusinessDetails } from '../../api/tiffinProvider';
import { SERVICE_TYPES, getProviderPersona } from '../../config/providerServices';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderBusinessDetails.css';

const EMPTY_FORM = {
  name: '',
  businessName: '',
  address: '',
  contactNumber: '',
  description: '',
  email: '',
};

function formFromData(data) {
  return {
    name: data?.name || '',
    businessName: data?.businessName || '',
    address: data?.address || '',
    contactNumber: data?.contactNumber || '',
    description: data?.description || '',
    email: data?.email || '',
  };
}

function parseTiffinSettings(response) {
  return response?.data?.data || response?.data || {};
}

function summarizeListings(listings) {
  return listings.reduce((summary, listing) => ({
    rooms: summary.rooms + Math.max(Number(listing.totalRooms ?? listing.roomCount ?? 0), 1),
    beds: summary.beds + Number(listing.totalBeds ?? 0),
    available: summary.available + Number(listing.availableBeds ?? 0),
    roomTypes: [...summary.roomTypes, listing.roomType].filter(Boolean),
  }), { rooms: 0, beds: 0, available: 0, roomTypes: [] });
}

export default function ProviderBusinessDetails() {
  const navigate = useNavigate();
  const { provider, updateProvider, providerLoading } = useProvider();
  const toast = useToast();
  const persona = getProviderPersona(provider);
  const isTiffin = persona.type === SERVICE_TYPES.TIFFIN;
  const settingsBase = isTiffin ? '/provider/tiffin/settings' : '/provider/settings';
  const PersonaIcon = persona.icon;

  const [form, setForm] = useState(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState(EMPTY_FORM);
  const [supportingData, setSupportingData] = useState({
    loading: true,
    deliveryRadiusKm: '',
    kitchenStatus: '',
    verificationStatus: '',
    listingSummary: { rooms: 0, beds: 0, available: 0 },
  });
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (providerLoading) return undefined;
    if (!provider.phone) return undefined;

    let cancelled = false;

    async function loadDetails() {
      setError('');
      setSupportingData((current) => ({ ...current, loading: true }));
      const primaryRequest = isTiffin
        ? getTiffinBusinessDetails(provider)
        : getProviderBusinessDetails(provider.phone);
      const supportingRequest = isTiffin
        ? getTiffinSettings(provider)
        : getRoomListings(provider.phone);

      const [primaryResult, supportingResult] = await Promise.allSettled([primaryRequest, supportingRequest]);
      if (cancelled) return;

      if (primaryResult.status === 'rejected') {
        setError(primaryResult.reason?.message || 'Unable to load business details.');
        setSupportingData((current) => ({ ...current, loading: false }));
        return;
      }

      const details = formFromData(primaryResult.value?.data);
      setForm(details);
      setSnapshot(details);

      if (isTiffin && supportingResult.status === 'fulfilled') {
        const kitchen = parseTiffinSettings(supportingResult.value);
        setSupportingData({
          loading: false,
          deliveryRadiusKm: kitchen.location?.deliveryRadiusKm ?? '',
          kitchenStatus: kitchen.status || '',
          verificationStatus: kitchen.verificationStatus || '',
          listingSummary: { rooms: 0, beds: 0, available: 0 },
        });
      } else if (!isTiffin && supportingResult.status === 'fulfilled') {
        const listings = Array.isArray(supportingResult.value?.data) ? supportingResult.value.data : [];
        setSupportingData((current) => ({ ...current, loading: false, listingSummary: summarizeListings(listings) }));
      } else {
        setSupportingData((current) => ({ ...current, loading: false }));
      }
    }

    loadDetails();
    return () => { cancelled = true; };
  }, [isTiffin, provider, providerLoading]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }

  function cancelEdit() {
    setForm(snapshot);
    setDirty(false);
    setEditing(false);
  }

  async function save(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.businessName.trim()) {
      toast.error('Your name and business name are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        contactNumber: form.contactNumber.trim(),
        description: form.description.trim(),
      };
      const response = isTiffin
        ? await updateTiffinBusinessDetails(provider, payload)
        : await updateProviderBusinessDetails(provider.phone, payload);
      const updated = formFromData(response?.data);
      setForm(updated);
      setSnapshot(updated);
      updateProvider({ name: updated.name, email: updated.email, activeServiceType: persona.type });
      setDirty(false);
      setEditing(false);
      toast.success('Business details saved');
    } catch (saveError) {
      toast.error(saveError.message || 'Unable to save business details');
    } finally {
      setSaving(false);
    }
  }

  if (!provider.phone && !providerLoading) {
    return <PageState error="Provider authentication is missing. Please sign in again." />;
  }

  if (providerLoading || supportingData.loading) {
    return <PageState label="Loading business details..." />;
  }

  if (error) {
    return <PageState error={error} />;
  }

  const sectionIcon = isTiffin ? Utensils : Home;
  const SectionIcon = sectionIcon;
  const verificationLabel = supportingData.verificationStatus
    ? String(supportingData.verificationStatus).replace(/_/g, ' ').toLowerCase()
    : 'Not submitted';

  return (
    <main className="pbd-page" id="provider-business-details">
      <div className="pbd-content">
        <button className="pbd-back" type="button" onClick={() => navigate(settingsBase)}>
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </button>

        <header className="pbd-heading">
          <div>
            <h1>Business Details</h1>
            <p>{persona.businessDetailsSubtitle}</p>
          </div>
          <span className="pbd-status"><span /> {provider.isVerified ? 'Verified Merchant Account' : 'Profile in progress'}</span>
        </header>

        <section className="pbd-hero">
          <div className="pbd-hero-icon"><Store size={22} /></div>
          <div className="pbd-hero-copy">
            <h2>Your Business Profile</h2>
            <p>{persona.businessProfileDescription}</p>
          </div>
          {!editing && (
            <button className="pbd-edit-button" type="button" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              <span>Edit Details</span>
            </button>
          )}
        </section>

        <form className="pbd-card" onSubmit={save}>
          <header className="pbd-card-header">
            <div className="pbd-card-title-icon"><PersonaIcon size={19} /></div>
            <div>
              <h2>Business Record &amp; Specifications</h2>
              <p>{isTiffin ? 'Primary contact details & kitchen delivery settings' : 'Primary contact details & property occupancy settings'}</p>
            </div>
            <span className="pbd-mode">{editing ? 'Edit Mode' : 'View Mode'}</span>
          </header>

          <div className="pbd-card-body">
            <section className="pbd-section">
              <SectionHeading icon={PersonaIcon} title="Basic Information" note="Fields marked required" />
              <div className="pbd-grid pbd-grid--two">
                <DetailField label="Your Name" value={form.name} editing={editing} required id="pbd-name" onChange={(value) => updateField('name', value)} />
                <DetailField label={persona.businessNameLabel} value={form.businessName} editing={editing} required id="pbd-business-name" placeholder={persona.businessNamePlaceholder} onChange={(value) => updateField('businessName', value)} />
                <DetailField label="Email Address" value={form.email} editing={editing} id="pbd-email" type="email" verified={Boolean(form.email)} onChange={(value) => updateField('email', value)} />
              </div>
            </section>

            <section className="pbd-section">
              <SectionHeading icon={MapPin} title="Location & Contact" note={persona.locationNote} />
              <div className="pbd-grid pbd-grid--two">
                <DetailField className="is-wide" label={persona.businessAddressLabel} value={form.address} editing={editing} id="pbd-address" multiline onChange={(value) => updateField('address', value)} />
                <DetailField label="Contact Number" value={form.contactNumber} editing={editing} id="pbd-contact" type="tel" icon={Phone} onChange={(value) => updateField('contactNumber', value)} />
                {isTiffin ? (
                  <>
                    <DetailField label="Delivery Radius" value={supportingData.deliveryRadiusKm ? `${supportingData.deliveryRadiusKm} km coverage` : 'Not provided'} icon={MapPin} />
                    <DetailField label="Kitchen Status" value={supportingData.kitchenStatus || 'Not provided'} icon={Utensils} />
                  </>
                ) : (
                  <>
                    <DetailField label="Warden / Contact" value={form.contactNumber || 'Primary contact on file'} icon={Phone} />
                    <DetailField label="Room layout" value={supportingData.listingSummary.roomTypes.length ? [...new Set(supportingData.listingSummary.roomTypes)].join(' / ') : 'Add room listings'} icon={BedDouble} />
                  </>
                )}
              </div>
            </section>

            <section className="pbd-section">
              <SectionHeading icon={FileText} title="About Your Business" note="Appears in customer search results" />
              <DetailField label={persona.descriptionLabel} value={form.description} editing={editing} id="pbd-description" multiline rows={4} placeholder={persona.descriptionPlaceholder} onChange={(value) => updateField('description', value)} />
            </section>

            <section className="pbd-section pbd-section--specific">
              <SectionHeading icon={SectionIcon} title={persona.specificSectionTitle} note={persona.specificSectionNote} />
              {isTiffin ? (
                <div className="pbd-summary-grid">
                  <SummaryField label="Kitchen status" value={supportingData.kitchenStatus || 'Not provided'} />
                  <SummaryField label="Verification" value={verificationLabel} />
                  <SummaryField label="Delivery coverage" value={supportingData.deliveryRadiusKm ? `${supportingData.deliveryRadiusKm} km` : 'Not provided'} />
                </div>
              ) : (
                <div className="pbd-summary-grid">
                  <SummaryField label="Listed rooms" value={supportingData.listingSummary.rooms || 'No listings'} icon={BedDouble} />
                  <SummaryField label="Total beds" value={supportingData.listingSummary.beds || 'No inventory'} />
                  <SummaryField label="Available beds" value={supportingData.listingSummary.available || 'None available'} />
                  <SummaryField label="Property verification" value={provider.isVerified ? 'Verified' : 'In progress'} />
                </div>
              )}
            </section>
          </div>

          {editing && (
            <footer className="pbd-footer">
              <button className="pbd-cancel-button" type="button" onClick={cancelEdit} disabled={saving}><X size={16} /> Cancel</button>
              <button className="pbd-save-button" type="submit" disabled={saving || !dirty}>
                {saving ? <Loader2 size={16} className="pbd-spinner" /> : <Save size={16} />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </footer>
          )}
        </form>
      </div>
    </main>
  );
}

function SectionHeading({ icon: Icon, title, note }) {
  return (
    <header className="pbd-section-heading">
      <div className="pbd-section-heading-title"><Icon size={17} /><h3>{title}</h3></div>
      <span>{note}</span>
    </header>
  );
}

function DetailField({ className = '', label, value, editing = false, required = false, id, type = 'text', multiline = false, rows = 3, placeholder, icon: Icon, verified = false, onChange }) {
  return (
    <div className={`pbd-field${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}{required && <b>*</b>}</label>
      {editing ? (
        multiline ? (
          <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <input id={id} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        )
      ) : (
        <div className="pbd-value">
          <span>{value || 'Not provided'}</span>
          {Icon && <Icon size={16} />}
          {verified && <small>Verified</small>}
        </div>
      )}
    </div>
  );
}

function SummaryField({ label, value, icon: Icon }) {
  return <div className="pbd-summary-field"><span>{label}</span><strong>{Icon && <Icon size={15} />}{value}</strong></div>;
}

function PageState({ label, error }) {
  return <div className={`pbd-page-state${error ? ' is-error' : ''}`}><Loader2 size={22} className={error ? '' : 'pbd-spinner'} /><p>{error || label}</p></div>;
}
