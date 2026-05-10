import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Plus, X, CheckCircle2 } from 'lucide-react';
import Button from '../../components/Button';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import {
  saveBasicInfo,
  saveServices,
  saveServiceDetails,
  verifyIdentity,
} from '../../api/provider';
import './ProviderOnboarding.css';

// ── Service configs ─────────────────────────────────────────────────────
const SERVICE_CONFIG = {
  PG:       { emoji: '🏠', label: 'PG / Hostel', desc: 'Rooms & accommodation' },
  TIFFIN:   { emoji: '🍱', label: 'Tiffin',     desc: 'Meal delivery service' },
  LAUNDRY:  { emoji: '🧺', label: 'Laundry',    desc: 'Wash & fold service' },
  CLEANING: { emoji: '🧹', label: 'Cleaning',   desc: 'Room cleaning service' },
};

const AMENITY_OPTIONS = ['WiFi', 'AC', 'Food', 'Laundry', 'Geyser', 'Parking', 'CCTV', 'Study Hall', 'Power Backup'];

// ── Dynamic form definitions ────────────────────────────────────────────
function getServiceFields(type) {
  switch (type) {
    case 'PG': return [
      { key: 'pgName', label: 'PG Name', type: 'text', placeholder: 'e.g. Sunshine PG for Boys', required: true },
      { key: 'address', label: 'Full Address', type: 'text', placeholder: 'Address with landmark', required: true },
      { key: 'roomType', label: 'Room Type', type: 'text', placeholder: 'e.g. Single / Shared (2) / Triple', required: true },
      { key: 'minPrice', label: 'Min Price (₹/month)', type: 'number', placeholder: '4000', required: true },
      { key: 'amenities', label: 'Amenities', type: 'chips', options: AMENITY_OPTIONS },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'TIFFIN': return [
      { key: 'name', label: 'Kitchen Name', type: 'text', placeholder: 'e.g. Maa Bhojan Kitchen', required: true },
      { key: 'price', label: 'Monthly Price (₹)', type: 'number', placeholder: '2800', required: true },
      { key: 'mealsPerDay', label: 'Meals Per Day', type: 'number', placeholder: '2', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'LAUNDRY': return [
      { key: 'pricing', label: 'Pricing Details', type: 'text', placeholder: 'e.g. ₹149/kg or ₹999/month', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    case 'CLEANING': return [
      { key: 'pricing', label: 'Pricing Details', type: 'text', placeholder: 'e.g. ₹299/visit basic, ₹599 deep clean', required: true },
      { key: 'photos', label: 'Photos', type: 'photos' },
    ];
    default: return [];
  }
}

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider, updateProvider } = useProvider();

  // Redirect if not OTP-verified
  if (!provider.otpVerified) {
    return <Navigate to="/provider/login" replace />;
  }

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic info form
  const [name, setName] = useState(provider.name || '');
  const [email, setEmail] = useState(provider.email || '');

  // Service selection
  const [selectedServices, setSelectedServices] = useState(provider.services || []);

  // Service details: { PG: { pgName, address, ... }, TIFFIN: { name, price, ... } }
  const [serviceData, setServiceData] = useState({});
  const [chipSelections, setChipSelections] = useState({});
  const [photoUrl, setPhotoUrl] = useState('');

  // Verification
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // ── Build steps dynamically ───────────────────────────────────────────
  const allSteps = useMemo(() => {
    const steps = [
      { key: 'basic-info', title: 'Basic Information', icon: '📋', subtitle: 'Tell us about yourself' },
      { key: 'services', title: 'Select Services', icon: '🧩', subtitle: 'What do you provide?' },
    ];
    selectedServices.forEach((svc) => {
      const cfg = SERVICE_CONFIG[svc];
      steps.push({
        key: `details-${svc}`,
        serviceType: svc,
        title: `${cfg.label} Details`,
        icon: cfg.emoji,
        subtitle: `Set up your ${cfg.label.toLowerCase()} service`,
      });
    });
    steps.push({ key: 'verify', title: 'Identity Verification', icon: '🔐', subtitle: 'Verify your identity' });
    return steps;
  }, [selectedServices]);

  const currentStep = allSteps[stepIndex];
  const totalSteps = allSteps.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // ── Helpers ───────────────────────────────────────────────────────────
  const updateServiceField = (type, field, value) => {
    setServiceData((prev) => ({
      ...prev,
      [type]: { ...(prev[type] || {}), [field]: value },
    }));
  };

  const toggleChip = (fieldKey, option) => {
    setChipSelections((prev) => {
      const curr = prev[fieldKey] || [];
      return {
        ...prev,
        [fieldKey]: curr.includes(option) ? curr.filter((o) => o !== option) : [...curr, option],
      };
    });
  };

  const addPhoto = (type) => {
    if (!photoUrl.trim()) return;
    try {
      new URL(photoUrl); // validate URL
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    const current = serviceData[type]?.photos || [];
    updateServiceField(type, 'photos', [...current, photoUrl.trim()]);
    setPhotoUrl('');
  };

  const removePhoto = (type, idx) => {
    const current = serviceData[type]?.photos || [];
    updateServiceField(type, 'photos', current.filter((_, i) => i !== idx));
  };

  const toggleService = (svc) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  // ── Step Handlers ─────────────────────────────────────────────────────
  const handleNext = async () => {
    setError('');
    setLoading(true);

    try {
      switch (currentStep.key) {
        case 'basic-info': {
          if (!name.trim()) throw new Error('Name is required');
          await saveBasicInfo({ name: name.trim(), phone: provider.phone, email: email.trim() || undefined });
          updateProvider({ name: name.trim(), email: email.trim() });
          toast.success('Basic info saved ✓');
          break;
        }
        case 'services': {
          if (selectedServices.length === 0) throw new Error('Select at least one service');
          await saveServices(provider.phone, selectedServices);
          updateProvider({ services: selectedServices });
          toast.success(`${selectedServices.length} service(s) saved ✓`);
          break;
        }
        case 'verify': {
          if (!aadharNumber.trim()) throw new Error('Aadhar number is required');
          await verifyIdentity(provider.phone, 'AADHAR', aadharNumber.trim());
          if (panNumber.trim()) {
            await verifyIdentity(provider.phone, 'PAN', panNumber.trim());
          }
          updateProvider({ isVerified: true });
          toast.success('Identity verified ✓');
          break;
        }
        default: {
          // Dynamic service detail steps
          if (currentStep.serviceType) {
            const type = currentStep.serviceType;
            const fields = getServiceFields(type);
            const data = { ...(serviceData[type] || {}) };

            // Merge chip selections (amenities)
            if (chipSelections[`${type}-amenities`]) {
              data.amenities = chipSelections[`${type}-amenities`];
            }

            // Validate required fields
            for (const f of fields) {
              if (f.required && !data[f.key]) {
                throw new Error(`${f.label} is required`);
              }
            }

            // Coerce numbers
            if (data.minPrice) data.minPrice = Number(data.minPrice);
            if (data.price) data.price = Number(data.price);
            if (data.mealsPerDay) data.mealsPerDay = Number(data.mealsPerDay);

            // Ensure photos array
            if (!data.photos) data.photos = [];

            await saveServiceDetails(provider.phone, type, data);
            toast.success(`${SERVICE_CONFIG[type].label} details saved ✓`);
          }
        }
      }

      // Advance to next step or finish
      if (stepIndex < totalSteps - 1) {
        setStepIndex((s) => s + 1);
      } else {
        // Onboarding complete!
        setStepIndex(totalSteps); // triggers success view
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((s) => s - 1);
    else navigate(-1);
    setError('');
  };

  // ── Success State ─────────────────────────────────────────────────────
  if (stepIndex >= totalSteps) {
    return (
      <div className="po-page">
        <div className="po-content">
          <div className="po-success">
            <div className="po-success-icon">
              <CheckCircle2 size={44} />
            </div>
            <h1>Welcome, {provider.name}! 🎉</h1>
            <p>Your provider account is set up. You can now manage your services from the dashboard.</p>
            <Button variant="accent" fullWidth size="lg" onClick={() => navigate('/provider/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="po-page" id="provider-onboarding">
      {/* Top Bar */}
      <div className="po-top-bar">
        <button className="back-btn" onClick={handleBack}><ArrowLeft size={20} /></button>
        <div className="po-step-info">
          <span className="po-step-num">Step {stepIndex + 1} of {totalSteps}</span>
          <span className="po-step-icon">{currentStep.icon}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="po-progress">
        <div className="po-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="po-content" key={currentStep.key}>
        <h1 className="po-title">{currentStep.title}</h1>
        <p className="po-subtitle">{currentStep.subtitle}</p>

        {error && <div className="po-error">{error}</div>}

        {/* ── BASIC INFO ─────────────────────────────────────── */}
        {currentStep.key === 'basic-info' && (
          <div className="po-fields">
            <div className="po-field">
              <label>Your Name</label>
              <input className="input-field" placeholder="Full name" value={name}
                onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="po-field">
              <label>Phone Number</label>
              <div className="po-phone-row">
                <span className="po-phone-prefix">+91</span>
                <input className="input-field po-input-readonly" value={provider.phone} readOnly />
              </div>
            </div>
            <div className="po-field">
              <label>Email <span className="po-optional">(optional)</span></label>
              <input className="input-field" type="email" placeholder="email@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        )}

        {/* ── SERVICE SELECTION ───────────────────────────────── */}
        {currentStep.key === 'services' && (
          <div className="po-service-grid">
            {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
              const isSelected = selectedServices.includes(key);
              return (
                <button key={key} className={`po-service-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleService(key)} id={`svc-${key}`}>
                  {isSelected && (
                    <div className="po-service-check"><Check size={12} strokeWidth={3} /></div>
                  )}
                  <span className="po-service-emoji">{cfg.emoji}</span>
                  <h3>{cfg.label}</h3>
                  <p>{cfg.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── DYNAMIC SERVICE DETAILS ─────────────────────────── */}
        {currentStep.serviceType && (
          <div className="po-fields">
            {getServiceFields(currentStep.serviceType).map((field) => {
              const type = currentStep.serviceType;

              if (field.type === 'chips') {
                const chipKey = `${type}-${field.key}`;
                const selected = chipSelections[chipKey] || [];
                return (
                  <div key={field.key} className="po-field">
                    <label>{field.label}</label>
                    <div className="po-chips">
                      {field.options.map((opt) => (
                        <button key={opt} className={`po-chip ${selected.includes(opt) ? 'active' : ''}`}
                          onClick={() => toggleChip(chipKey, opt)}>{opt}</button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (field.type === 'photos') {
                const photos = serviceData[type]?.photos || [];
                return (
                  <div key={field.key} className="po-field po-photo-section">
                    <label>Photo URLs <span className="po-optional">(paste image links)</span></label>
                    <div className="po-photo-add">
                      <input className="input-field" type="url" placeholder="https://example.com/photo.jpg"
                        value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPhoto(type)} />
                      <button className="po-photo-add-btn" onClick={() => addPhoto(type)}>
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    {photos.length > 0 && (
                      <div className="po-photo-list">
                        {photos.map((url, idx) => (
                          <div key={idx} className="po-photo-item">
                            <img src={url} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                            <span>{url}</span>
                            <button className="po-photo-remove" onClick={() => removePhoto(type, idx)}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.key} className="po-field">
                  <label>{field.label}{field.required && ' *'}</label>
                  <input className="input-field" type={field.type} placeholder={field.placeholder}
                    value={serviceData[type]?.[field.key] || ''}
                    onChange={(e) => updateServiceField(type, field.key, e.target.value)} />
                </div>
              );
            })}
          </div>
        )}

        {/* ── IDENTITY VERIFICATION ──────────────────────────── */}
        {currentStep.key === 'verify' && (
          <div className="po-verify-cards">
            <div className="po-verify-card">
              <h3>🪪 Aadhar Card <span className="po-required">Required</span></h3>
              <p>12-digit Aadhar number</p>
              <input className="input-field" placeholder="1234 5678 9012" maxLength={14}
                value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value.replace(/[^0-9 ]/g, ''))} />
            </div>
            <div className="po-verify-card">
              <h3>📄 PAN Card <span className="po-optional" style={{ fontWeight: 400, color: 'var(--neutral-400)', fontSize: '10px' }}>Optional</span></h3>
              <p>10-character PAN number</p>
              <input className="input-field" placeholder="ABCDE1234F" maxLength={10}
                value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="po-footer">
        <Button variant="accent" fullWidth size="lg" onClick={handleNext} disabled={loading}>
          {loading ? (
            <><Loader2 size={18} className="spin" /> Saving...</>
          ) : stepIndex < totalSteps - 1 ? (
            'Next →'
          ) : (
            'Complete Setup ✓'
          )}
        </Button>
      </div>
    </div>
  );
}
