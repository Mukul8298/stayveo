import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  ImagePlus,
  MapPin,
  ShieldCheck,
  Trash2,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import LocationPicker from '../../components/maps/LocationPicker';
import { saveTiffinOnboarding, getTiffinOnboarding, submitTiffinOnboarding } from '../../api/tiffinProvider';
import { parseStoragePath, removeImageFromStorage, uploadImage, STORAGE_SERVICE_TYPES } from '../../lib/storage';
import './TiffinOnboarding.css';

const STEPS = [
  { key: 'business', label: 'Business', icon: Building2 },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'pricing', label: 'Pricing', icon: CreditCard },
  { key: 'food', label: 'Food', icon: Utensils },
  { key: 'timing', label: 'Timing', icon: Clock3 },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'displayImage', label: 'Display Image', icon: ImagePlus },
  { key: 'kyc', label: 'KYC', icon: ShieldCheck },
  { key: 'review', label: 'Review', icon: FileCheck2 },
];

const DEFAULT_FORM = {
  business: { name: '', ownerName: '', phone: '', email: '', address: '', description: '', profilePhoto: '' },
  location: { address: '', latitude: null, longitude: null, pincode: '', city: '', state: '', deliveryRadiusKm: 5 },
  pricing: {
    perMeal: '',
    plans: [
      { type: 'daily', price: '', discountPrice: '' },
      { type: 'weekly', price: '', discountPrice: '' },
      { type: 'monthly', price: '', discountPrice: '' },
    ],
  },
  food: { categories: [], mealItems: { lunch: [], dinner: [] } },
  timing: {
    lunch: { enabled: true, start: '12:00', end: '15:00' },
    dinner: { enabled: true, start: '19:00', end: '22:00' },
  },
  delivery: { type: 'self_delivery' },
  displayImage: { imageUrl: '' },
  kyc: { aadhaarNumber: '', panNumber: '' },
};

const ICONS = { veg: '●', nonveg: '◆', jain: '✦' };
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const DISPLAY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DISPLAY_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

function isOwnedTiffinProfileImage(pathOrUrl, providerId) {
  if (!pathOrUrl || !providerId) return false;
  const { bucket, path } = parseStoragePath(pathOrUrl);
  const normalizedProviderId = String(providerId).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return bucket === 'pg-images' && path.startsWith(`provider-${normalizedProviderId}/tiffin/`);
}

function mergeSavedData(saved, provider) {
  if (!saved) return { ...DEFAULT_FORM, business: { ...DEFAULT_FORM.business, phone: provider.phone || '' } };
  return {
    ...DEFAULT_FORM,
    business: { ...DEFAULT_FORM.business, ...saved.business, phone: provider.phone || saved.business?.phone || '' },
    location: { ...DEFAULT_FORM.location, ...saved.location },
    pricing: { ...DEFAULT_FORM.pricing, plans: saved.plans?.length ? saved.plans.map((plan) => ({ type: plan.type, price: plan.price, discountPrice: plan.discountPrice || '' })) : DEFAULT_FORM.pricing.plans, perMeal: saved.pricing?.perMeal || '' },
    food: { ...DEFAULT_FORM.food, ...saved.food },
    timing: { ...DEFAULT_FORM.timing, ...saved.timing },
    delivery: { ...DEFAULT_FORM.delivery, ...saved.delivery },
    displayImage: { imageUrl: saved.displayImage?.imageUrl || saved.coverImage || '' },
    kyc: { ...DEFAULT_FORM.kyc, aadhaarNumber: saved.kyc?.aadhaarNumber || saved.kyc?.aadhaar || '', panNumber: saved.kyc?.panNumber || saved.kyc?.pan || '' },
  };
}

function inputValue(value) { return value === null || value === undefined ? '' : value; }

export default function TiffinOnboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider } = useProvider();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => mergeSavedData(null, provider));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const step = STEPS[stepIndex];
  const current = form[step.key] || {};
  const canContinue = validateStep(step.key, current);

  useEffect(() => {
    if (!provider.phone) {
      navigate('/provider/login', { replace: true });
      return;
    }
    let cancelled = false;
    getTiffinOnboarding(provider)
      .then((response) => {
        if (!cancelled) setForm(mergeSavedData(response.data?.data, provider));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load your Tiffin progress');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate, provider]);

  function updateSection(key, updates) {
    setForm((previous) => ({ ...previous, [key]: { ...previous[key], ...updates } }));
  }

  function updatePlan(index, updates) {
    updateSection('pricing', { plans: form.pricing.plans.map((plan, planIndex) => planIndex === index ? { ...plan, ...updates } : plan) });
  }

  async function handleProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      toast.error('Upload a JPG, JPEG, or PNG profile picture');
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_SIZE) {
      toast.error('Profile pictures must be smaller than 5 MB');
      return;
    }
    if (!provider.providerId) {
      toast.error('Provider identity is required before uploading a profile picture');
      return;
    }
    const previousPhoto = form.business.profilePhoto;
    setSaving(true);
    try {
      const uploaded = await uploadImage({ file, providerId: provider.providerId, listingId: 'tiffin-profile', serviceType: STORAGE_SERVICE_TYPES.TIFFIN, imageId: crypto.randomUUID?.() || `${Date.now()}` });
      updateSection('business', { profilePhoto: uploaded.publicUrl });
      if (isOwnedTiffinProfileImage(previousPhoto, provider.providerId)) {
        await removeImageFromStorage(previousPhoto).catch(() => {});
      }
      toast.success('Profile photo uploaded');
    } catch (err) {
      toast.error(err.message || 'Profile photo upload failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeProfilePhoto() {
    const previousPhoto = form.business.profilePhoto;
    if (!previousPhoto) return;
    updateSection('business', { profilePhoto: '' });
    if (!isOwnedTiffinProfileImage(previousPhoto, provider.providerId)) return;
    setSaving(true);
    try {
      await removeImageFromStorage(previousPhoto);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err.message || 'Profile photo could not be removed from storage');
    } finally {
      setSaving(false);
    }
  }

  // Display image: hold a local File ref until saveAndContinue uploads it
  const pendingDisplayFileRef = useRef(null);

  function handleDisplayImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!DISPLAY_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WEBP image.');
      return;
    }
    if (file.size > DISPLAY_IMAGE_MAX_SIZE) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }
    pendingDisplayFileRef.current = file;
    updateSection('displayImage', { imageUrl: URL.createObjectURL(file) });
  }

  function removeDisplayImage() {
    pendingDisplayFileRef.current = null;
    updateSection('displayImage', { imageUrl: '' });
  }

  async function saveAndContinue() {
    if (!canContinue) {
      setError(validationMessage(step.key));
      return;
    }
    setSaving(true);
    setError('');
    try {
      let dataToSave = current;

      // Upload display image to Supabase before saving the step
      if (step.key === 'displayImage' && pendingDisplayFileRef.current) {
        const file = pendingDisplayFileRef.current;
        const previousUrl = form.displayImage.imageUrl;
        const uploaded = await uploadImage({
          file,
          providerId: provider.providerId,
          listingId: 'display-image',
          serviceType: STORAGE_SERVICE_TYPES.TIFFIN,
          imageId: crypto.randomUUID?.() || `${Date.now()}`,
        });
        pendingDisplayFileRef.current = null;
        dataToSave = { imageUrl: uploaded.publicUrl };
        // Remove old image if it was an uploaded one (not a blob URL)
        if (previousUrl && !previousUrl.startsWith('blob:') && isOwnedTiffinProfileImage(previousUrl, provider.providerId)) {
          await removeImageFromStorage(previousUrl).catch(() => {});
        }
      }

      const response = await saveTiffinOnboarding(provider, step.key, dataToSave);
      const saved = response.data?.data;
      if (saved) setForm(mergeSavedData(saved, provider));
      setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
    } catch (err) {
      setError(err.message || 'Could not save this section');
      toast.error(err.message || 'Could not save this section');
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await submitTiffinOnboarding(provider);
      toast.success('Tiffin service submitted for verification');
      navigate('/provider/tiffin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Complete all required sections before submitting');
      toast.error(err.message || 'Complete all required sections before submitting');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex((index) => index - 1);
    else navigate(-1);
  }

  if (loading) return <div className="tpo-loading">Loading your Tiffin onboarding…</div>;

  return (
    <div className="tpo-page">
      <header className="tpo-mobile-header">
        <button type="button" className="tpo-mobile-back" onClick={handleBack} aria-label="Go back"><ArrowLeft size={20} /></button>
        <span>Step {stepIndex + 1} of {STEPS.length}</span>
      </header>

      <aside className="tpo-sidebar">
        <div>
          <div className="tpo-brand">StayVeo</div>
          <div className="tpo-side-title"><strong>Onboarding</strong><span>Step {stepIndex + 1} of {STEPS.length}</span></div>
          <nav className="tpo-step-nav" aria-label="Tiffin onboarding steps">
            {STEPS.map(({ key, label, icon: Icon }, index) => {
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return (
                <button key={key} type="button" className={`tpo-step${active ? ' is-active' : ''}${completed ? ' is-complete' : ''}`} onClick={() => index <= stepIndex && setStepIndex(index)} disabled={index > stepIndex}>
                  {completed ? <Check size={17} /> : <Icon size={18} />}
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="tpo-footer-copy">© 2026 StayVeo pvt. ltd all rights reserved</div>
      </aside>

      <main className="tpo-main">
        <div className="tpo-content">
          {step.key !== 'review' && (
            <div className="tpo-heading">
              <h1>{headingFor(step.key)}</h1>
              <p>{subtitleFor(step.key)}</p>
            </div>
          )}
          {error && <div className="tpo-error" role="alert">{error}</div>}
          {step.key === 'business' && <BusinessStep data={current} provider={provider} onChange={(updates) => updateSection('business', updates)} onPhoto={handleProfilePhoto} onRemovePhoto={removeProfilePhoto} />}
          {step.key === 'location' && <LocationStep data={current} onChange={(updates) => updateSection('location', updates)} />}
          {step.key === 'pricing' && <PricingStep data={current} onChange={(updates) => updateSection('pricing', updates)} onPlan={updatePlan} />}
          {step.key === 'food' && <FoodStep data={current} onChange={(updates) => updateSection('food', updates)} />}
          {step.key === 'timing' && <TimingStep data={current} onChange={(updates) => updateSection('timing', updates)} />}
          {step.key === 'delivery' && <DeliveryStep data={current} onChange={(updates) => updateSection('delivery', updates)} />}
          {step.key === 'displayImage' && <DisplayImageStep data={current} onSelect={handleDisplayImageSelect} onRemove={removeDisplayImage} />}
          {step.key === 'kyc' && <KycStep data={current} onChange={(updates) => updateSection('kyc', updates)} />}
          {step.key === 'review' && <ReviewStep form={form} onEdit={setStepIndex} />}
        </div>
        <footer className="tpo-actions">
          <button type="button" className="tpo-button tpo-button-back" onClick={handleBack}>Back</button>
          {step.key === 'review' ? (
            <button type="button" className="tpo-button tpo-button-primary" onClick={submit} disabled={saving}>Submit for Verification <ArrowRight size={17} /></button>
          ) : (
            <button type="button" className="tpo-button tpo-button-primary" onClick={saveAndContinue} disabled={saving}>{saving ? 'Saving…' : 'Continue'} <ArrowRight size={17} /></button>
          )}
        </footer>
      </main>
    </div>
  );
}

function headingFor(key) {
  return { business: 'Tell us about your tiffin service', location: 'Where do you serve from?', pricing: 'Set your meal pricing', food: 'What will you serve?', timing: 'Set your serving timings', delivery: 'How will customers receive their order?', displayImage: 'Tiffin Service Display Image', kyc: 'Verify your identity' }[key];
}

function subtitleFor(key) {
  return { business: 'Start with the basic details customers will use to identify and contact your service.', location: 'Pinpoint your main kitchen or operational hub.', pricing: 'Define clear, competitive pricing for your tiffin services.', food: 'Choose the dietary categories and meals your kitchen offers.', timing: 'Tell students when today’s meals are available.', delivery: 'Choose the fulfillment options your business supports.', displayImage: 'Add a photo that represents your tiffin service. This image will be shown to students when they discover your service.', kyc: 'Your identity details help us keep StayVeo’s provider network trusted and secure.' }[key];
}

function validateStep(key, data) {
  if (key === 'business') return Boolean(data.name?.trim() && data.ownerName?.trim());
  if (key === 'location') return Boolean(data.address?.trim() && Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)));
  if (key === 'pricing') return data.plans?.some((plan) => Number(plan.price) > 0);
  if (key === 'food') return data.categories?.length > 0;
  if (key === 'timing') return ['lunch', 'dinner'].some((meal) => !data[meal]?.enabled || data[meal]?.start < data[meal]?.end);
  if (key === 'delivery') return Boolean(data.type);
  if (key === 'displayImage') return Boolean(data.imageUrl);
  if (key === 'kyc') {
    const aadhaarValid = /^\d{12}$/.test((data.aadhaarNumber || '').trim());
    const panValid = /^[A-Z]{5}\d{4}[A-Z]$/.test((data.panNumber || '').trim());
    return aadhaarValid && panValid;
  }
  return true;
}

function validationMessage(key) { return { business: 'Add the service name and owner name.', location: 'Confirm the address and pin the kitchen location on the map.', pricing: 'Add at least one valid meal price.', food: 'Select at least one food category.', timing: 'Check that each enabled meal starts before it ends.', delivery: 'Choose a delivery option.', displayImage: 'Please upload a display image for your tiffin service.', kyc: 'Enter a valid 12-digit Aadhaar number and a valid PAN (e.g. ABCDE1234F).' }[key] || 'Complete the required fields.'; }

function Field({ label, children, hint }) { return <label className="tpo-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }

function BusinessStep({ data, provider, onChange, onPhoto, onRemovePhoto }) {
  return <section className="tpo-card tpo-business-card">
    <div className="tpo-photo-upload-wrap">
      <div className="tpo-photo-upload-heading">
        <h2>Tiffin Service Photo</h2>
        <p>Upload a photo that represents your tiffin service. This image will be visible to customers.</p>
      </div>
      <label className="tpo-photo-upload">
        <span className="tpo-photo-circle">{data.profilePhoto ? <img src={data.profilePhoto} alt="Tiffin service" /> : <Camera size={31} />}</span>
        <strong>{data.profilePhoto ? 'Change service photo' : 'Click to upload service photo'}</strong>
        <input type="file" accept="image/jpeg,image/png" onChange={onPhoto} />
      </label>
      {data.profilePhoto && <button type="button" className="tpo-photo-remove" onClick={onRemovePhoto}>Remove photo</button>}
    </div>
    <div className="tpo-form-grid">
      <Field label="Tiffin Service Name"><input value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Ghar Ka Swad" /></Field>
      <Field label="Owner / Contact Person"><input value={data.ownerName} onChange={(e) => onChange({ ownerName: e.target.value })} placeholder="Full name" /></Field>
      <Field label="Phone Number"><input value={provider.phone || data.phone} readOnly /></Field>
      <Field label="Email Address"><input type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="contact@example.com" /></Field>
      <Field label="Business Address"><textarea value={data.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Street address, City, State, Zip" rows={3} /></Field>
    </div>
    <div className="tpo-about-service">
      <div className="tpo-about-service-heading">
        <h2>About Your Tiffin Service</h2>
        <p>Tell customers a little about your food, cooking style, and what makes your service special.</p>
      </div>
      <Field label="Service Description" hint={`${(data.description || '').length}/1000 characters`}>
        <textarea
          value={data.description || ''}
          maxLength={1000}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Example: We provide fresh home-cooked meals prepared daily with quality ingredients. Our meals are hygienic, balanced, and suitable for students and working professionals."
          rows={5}
        />
      </Field>
    </div>
  </section>;
}

function LocationStep({ data, onChange }) {
  return <section className="tpo-card">
    <Field label="Service Address"><input value={data.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="123 Corporate Blvd, Metro City" /></Field>
    <LocationPicker latitude={Number(data.latitude) || undefined} longitude={Number(data.longitude) || undefined} address={data.address} onChange={(location) => onChange(location)} className="tpo-location-picker" />
    <div className="tpo-location-fields"><Field label="City"><input value={data.city} onChange={(e) => onChange({ city: e.target.value })} /></Field><Field label="State"><input value={data.state} onChange={(e) => onChange({ state: e.target.value })} /></Field><Field label="Pincode"><input value={data.pincode} onChange={(e) => onChange({ pincode: e.target.value })} /></Field></div>
  </section>;
}

function PricingStep({ data, onPlan }) {
  return <div className="tpo-plan-grid">{data.plans.map((plan, index) => <section className={`tpo-card tpo-plan-card${plan.type === 'monthly' ? ' is-popular' : ''}`} key={plan.type}>
    {plan.type === 'monthly' && <span className="tpo-popular">Popular</span>}
    <div className="tpo-plan-title"><h2>{plan.type === 'daily' ? 'Per Meal' : `${plan.type[0].toUpperCase()}${plan.type.slice(1)} Plan`}</h2><span>{plan.type === 'daily' ? '▤' : '▣'}</span></div>
    <p>{plan.type === 'daily' ? 'Base price for a single tiffin meal.' : plan.type === 'monthly' ? 'Discounted rate for 30-day subscription.' : 'Short-term commitment pricing.'}</p>
    <div className="tpo-money-input"><span>₹</span><input type="number" min="0" value={inputValue(plan.price)} onChange={(e) => onPlan(index, { price: e.target.value })} placeholder={plan.type === 'weekly' ? 'e.g. 500' : ''} /></div>
    {plan.type !== 'daily' && <Field label="Discounted price (optional)"><input type="number" min="0" value={inputValue(plan.discountPrice)} onChange={(e) => onPlan(index, { discountPrice: e.target.value })} /></Field>}
  </section>)}</div>;
}

function FoodStep({ data, onChange }) {
  return <section className="tpo-card"><h2 className="tpo-section-title">Dietary categories</h2><div className="tpo-choice-grid">{['veg', 'nonveg', 'jain'].map((category) => { const selected = data.categories.includes(category); return <button type="button" key={category} className={`tpo-choice${selected ? ' is-selected' : ''}`} onClick={() => onChange({ categories: selected ? data.categories.filter((value) => value !== category) : [...data.categories, category] })}><span>{ICONS[category]}</span><strong>{category === 'nonveg' ? 'Non-Veg' : category[0].toUpperCase() + category.slice(1)}</strong>{selected && <CheckCircle2 size={18} />}</button>; })}</div><div className="tpo-note">Select every category this kitchen can consistently serve. Students will see these preferences before subscribing.</div></section>;
}

function TimingStep({ data, onChange }) {
  return <div className="tpo-timing-grid">{['lunch', 'dinner'].map((meal) => <section className="tpo-card tpo-timing-card" key={meal}><div className="tpo-timing-heading"><h2>{meal[0].toUpperCase() + meal.slice(1)}</h2><button type="button" className={`tpo-switch${data[meal].enabled ? ' is-on' : ''}`} onClick={() => onChange({ [meal]: { ...data[meal], enabled: !data[meal].enabled } })} aria-label={`Toggle ${meal}` }><span /></button></div><div className="tpo-time-fields"><Field label="Start time"><input type="time" disabled={!data[meal].enabled} value={data[meal].start} onChange={(e) => onChange({ [meal]: { ...data[meal], start: e.target.value } })} /></Field><Field label="End time"><input type="time" disabled={!data[meal].enabled} value={data[meal].end} onChange={(e) => onChange({ [meal]: { ...data[meal], end: e.target.value } })} /></Field></div></section>)}</div>;
}

function DeliveryStep({ data, onChange }) {
  return <section className="tpo-card"><h2 className="tpo-section-title">How do customers receive their order?</h2><div className="tpo-delivery-options">{[['self_delivery', 'Home Delivery'], ['pickup_only', 'Customer Pickup'], ['both', 'Both']].map(([value, label]) => <button key={value} type="button" className={`tpo-delivery-option${data.type === value ? ' is-selected' : ''}`} onClick={() => onChange({ type: value })}>{label}{data.type === value && <Check size={17} />}</button>)}</div></section>;
}

function DisplayImageStep({ data, onSelect, onRemove }) {
  const fileInputRef = useRef(null);
  const hasImage = Boolean(data.imageUrl);
  return (
    <section className="tpo-card tpo-display-image-section">
      {hasImage ? (
        <div className="tpo-display-image-preview-wrap">
          <img src={data.imageUrl} alt="Tiffin service display" className="tpo-display-image-preview" />
          <div className="tpo-display-image-actions">
            <button type="button" className="tpo-display-image-btn tpo-display-image-btn-replace" onClick={() => fileInputRef.current?.click()}><Camera size={16} /> Replace Image</button>
            <button type="button" className="tpo-display-image-btn tpo-display-image-btn-remove" onClick={onRemove}><Trash2 size={16} /> Remove</button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} style={{ display: 'none' }} />
        </div>
      ) : (
        <label className="tpo-display-image-upload">
          <div className="tpo-display-image-upload-icon"><ImagePlus size={36} /></div>
          <strong>Upload Tiffin Display Image</strong>
          <small>JPEG, PNG or WEBP (max 5MB)</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} />
        </label>
      )}
    </section>
  );
}

function KycStep({ data, onChange }) {
  const aadhaarRaw = data.aadhaarNumber || '';
  const panRaw = data.panNumber || '';
  const aadhaarValid = aadhaarRaw.length === 0 || /^\d{12}$/.test(aadhaarRaw.trim());
  const panValid = panRaw.length === 0 || /^[A-Z]{5}\d{4}[A-Z]$/.test(panRaw.trim());

  return (
    <div className="tpo-kyc">
      <div className="tpo-security">
        <ShieldCheck size={22} />
        <div>
          <strong>Your information is secure</strong>
          <p>We use bank-level encryption to protect your personal data.</p>
        </div>
      </div>

      <section className="tpo-card">
        <div className="tpo-kyc-title"><h2>Aadhaar Verification</h2><span>Required</span></div>
        <Field label="Aadhaar Number" hint={aadhaarRaw.length > 0 && !aadhaarValid ? 'Must be exactly 12 digits' : ''}>
          <input
            inputMode="numeric"
            maxLength={12}
            value={aadhaarRaw}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
              onChange({ aadhaarNumber: digits });
            }}
            placeholder="123456789012"
            className={aadhaarRaw.length > 0 && !aadhaarValid ? 'tpo-input-error' : ''}
          />
        </Field>
      </section>

      <section className="tpo-card">
        <div className="tpo-kyc-title"><h2>PAN Verification</h2><span>Required</span></div>
        <Field label="PAN Number" hint={panRaw.length > 0 && !panValid ? 'Format: ABCDE1234F (5 letters, 4 digits, 1 letter)' : ''}>
          <input
            maxLength={10}
            value={panRaw}
            onChange={(e) => {
              const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
              onChange({ panNumber: cleaned });
            }}
            placeholder="ABCDE1234F"
            className={panRaw.length > 0 && !panValid ? 'tpo-input-error' : ''}
          />
        </Field>
      </section>
    </div>
  );
}

function ReviewStep({ form, onEdit }) {
  const businessSummary = `${form.business.name || '\u2014'} \u00b7 ${form.business.ownerName || '\u2014'}${form.business.description ? ' \u00b7 Description added' : ''}${form.business.profilePhoto ? ' \u00b7 Photo added' : ''}`;
  const displayImageSummary = form.displayImage?.imageUrl ? 'Display image uploaded' : 'No display image';
  const kycSummary = `Aadhaar: ${form.kyc.aadhaarNumber ? '\u2022\u2022\u2022\u2022 ' + form.kyc.aadhaarNumber.slice(-4) : '\u2014'} \u00b7 PAN: ${form.kyc.panNumber || '\u2014'}`;

  // [title, stepKey, summary, stepIndex to navigate to]
  const cards = [
    ['Business Details', 'business', businessSummary, 0],
    ['Location Details', 'location', form.location.address || 'Location not confirmed', 1],
    ['Pricing & Food', 'pricing', `${form.pricing.plans.filter((plan) => Number(plan.price) > 0).length} plans \u00b7 ${(form.food.categories || []).join(', ') || 'No categories selected'}`, 2],
    ['Timings & Delivery', 'timing', `${form.timing.lunch.enabled ? 'Lunch' : ''}${form.timing.lunch.enabled && form.timing.dinner.enabled ? ' \u00b7 ' : ''}${form.timing.dinner.enabled ? 'Dinner' : ''} \u00b7 ${form.delivery.type || '\u2014'}`, 4],
    ['Display Image', 'displayImage', displayImageSummary, 6],
    ['KYC Verification', 'kyc', kycSummary, 7],
  ];

  return (
    <div className="tpo-review">
      <div className="tpo-heading">
        <h1>Review your details</h1>
        <p>Make sure everything looks correct before submitting your tiffin service.</p>
      </div>
      {cards.map(([title, key, summary, editIndex]) => (
        <section className="tpo-card tpo-review-card" key={key}>
          <div>
            <span className="tpo-review-icon"><CheckCircle2 size={18} /></span>
            <div><h2>{title}</h2><p>{summary}</p></div>
          </div>
          <button type="button" onClick={() => onEdit(editIndex)}>Edit</button>
        </section>
      ))}
    </div>
  );
}
