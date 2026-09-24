import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, MapPin, User, Building2, CreditCard, Shield, FileCheck2 } from 'lucide-react';
import Button from '../../components/Button';
import LocationPicker from '../../components/maps/LocationPicker';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { savePgOnboarding } from '../../api/provider';
import './PGProviderOnboarding.css';

// ── Step definitions ────────────────────────────────────────────────────
const STEPS = [
  { key: 'owner', title: 'Owner Information', subtitle: 'Tell us about yourself', icon: '👤', Icon: User },
  { key: 'business', title: 'Business Details', subtitle: 'Your PG business info', icon: '🏠', Icon: Building2 },
  { key: 'kyc', title: 'Identity Verification', subtitle: 'KYC for trust & safety', icon: '🔐', Icon: Shield },
  { key: 'location', title: 'Business Location', subtitle: 'Pin your PG on the map', icon: '📍', Icon: MapPin },
  { key: 'review', title: 'Review & Submit', subtitle: 'Confirm your details', icon: '✅', Icon: FileCheck2 },
];

export default function PGProviderOnboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider, updateProvider } = useProvider();

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Form state ──────────────────────────────────────────────────────
  const [name, setName] = useState(provider.name || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [email, setEmail] = useState(provider.email || '');

  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');

  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const currentStep = STEPS[stepIndex];
  const totalSteps = STEPS.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // ── Validation ──────────────────────────────────────────────────────
  function validateStep() {
    switch (currentStep.key) {
      case 'owner':
        if (!name.trim()) return 'Name is required';
        if (!phone.trim() || phone.trim().length < 10) return 'Valid phone number is required';
        return null;
      case 'business':
        if (!businessName.trim()) return 'Business name is required';
        return null;
      case 'kyc':
        if (!aadharNumber.trim() || aadharNumber.trim().length < 12) return 'Valid Aadhaar number is required';
        if (!panNumber.trim() || panNumber.trim().length < 10) return 'Valid PAN number is required';
        return null;
      case 'location':
        return null; // optional
      case 'review':
        return null;
      default:
        return null;
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────
  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
    }
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      navigate('/provider/select');
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await savePgOnboarding({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        businessName: businessName.trim() || null,
        address: address.trim() || null,
        contactNumber: contactNumber.trim() || null,
        description: description.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
      });

      updateProvider({
        name: name.trim(),
        phone: phone.trim(),
        services: ['PG'],
        activeServiceType: 'PG',
        isExistingUser: true,
      });

      toast.success('PG onboarding complete! Welcome to StayVeo.');
      navigate('/provider/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save onboarding details');
      toast.error(err.message || 'Onboarding submission failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Step renderers ──────────────────────────────────────────────────
  function renderOwnerStep() {
    return (
      <div className="pgo-fields">
        <div className="pgo-field">
          <label htmlFor="pgo-name">Full Name *</label>
          <input
            id="pgo-name"
            type="text"
            className="input-field"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="pgo-field">
          <label htmlFor="pgo-phone">Phone Number *</label>
          <div className="pgo-phone-row">
            <span className="pgo-phone-prefix">+91</span>
            <input
              id="pgo-phone"
              type="tel"
              className="input-field"
              placeholder="9876543210"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="pgo-field">
          <label htmlFor="pgo-email">
            Email <span className="pgo-optional">(optional)</span>
          </label>
          <input
            id="pgo-email"
            type="email"
            className="input-field"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
    );
  }

  function renderBusinessStep() {
    return (
      <div className="pgo-fields">
        <div className="pgo-field">
          <label htmlFor="pgo-business-name">PG / Hostel Name *</label>
          <input
            id="pgo-business-name"
            type="text"
            className="input-field"
            placeholder="e.g. Sunshine PG for Boys"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        <div className="pgo-field">
          <label htmlFor="pgo-address">
            Full Address <span className="pgo-optional">(optional)</span>
          </label>
          <input
            id="pgo-address"
            type="text"
            className="input-field"
            placeholder="Street, Landmark, City"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="pgo-field">
          <label htmlFor="pgo-contact">
            Contact Number <span className="pgo-optional">(optional)</span>
          </label>
          <input
            id="pgo-contact"
            type="tel"
            className="input-field"
            placeholder="Alternate phone"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>

        <div className="pgo-field">
          <label htmlFor="pgo-desc">
            Description <span className="pgo-optional">(optional)</span>
          </label>
          <textarea
            id="pgo-desc"
            className="pgo-textarea"
            placeholder="Brief description of your PG — facilities, nearby colleges, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    );
  }

  function renderKycStep() {
    return (
      <div className="pgo-verify-cards">
        <div className="pgo-verify-card">
          <h3>🆔 Aadhaar Card <span className="pgo-required">Required</span></h3>
          <p>12-digit Aadhaar number for identity verification</p>
          <input
            id="pgo-aadhar"
            type="text"
            className="input-field"
            placeholder="XXXX XXXX XXXX"
            maxLength={14}
            value={aadharNumber}
            onChange={(e) =>
              setAadharNumber(
                e.target.value
                  .replace(/\D/g, '')
                  .replace(/(.{4})/g, '$1 ')
                  .trim()
              )
            }
          />
        </div>

        <div className="pgo-verify-card">
          <h3>💳 PAN Card <span className="pgo-required">Required</span></h3>
          <p>10-character PAN for tax compliance</p>
          <input
            id="pgo-pan"
            type="text"
            className="input-field"
            placeholder="ABCDE1234F"
            maxLength={10}
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
          />
        </div>
      </div>
    );
  }

  function renderLocationStep() {
    return (
      <div className="pgo-location-section">
        <h3><MapPin size={18} /> Pin Your PG Location</h3>
        <p>Tap the map or use your current location to set the pin</p>
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          address={address}
          onChange={(loc) => {
            setLatitude(loc.latitude);
            setLongitude(loc.longitude);
          }}
        />
        {latitude && longitude && (
          <div className="pgo-map-coords">
            <span>Lat {Number(latitude).toFixed(6)} · Lng {Number(longitude).toFixed(6)}</span>
          </div>
        )}
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="pgo-review-section">
        <div className="pgo-review-card">
          <h3>👤 Owner</h3>
          <div className="pgo-review-row"><span className="pgo-review-label">Name</span><span className="pgo-review-value">{name}</span></div>
          <div className="pgo-review-row"><span className="pgo-review-label">Phone</span><span className="pgo-review-value">+91 {phone}</span></div>
          {email && <div className="pgo-review-row"><span className="pgo-review-label">Email</span><span className="pgo-review-value">{email}</span></div>}
        </div>

        <div className="pgo-review-card">
          <h3>🏠 Business</h3>
          <div className="pgo-review-row"><span className="pgo-review-label">PG Name</span><span className="pgo-review-value">{businessName || '—'}</span></div>
          {address && <div className="pgo-review-row"><span className="pgo-review-label">Address</span><span className="pgo-review-value">{address}</span></div>}
          {description && <div className="pgo-review-row"><span className="pgo-review-label">Description</span><span className="pgo-review-value">{description}</span></div>}
        </div>

        <div className="pgo-review-card">
          <h3>🔐 KYC</h3>
          <div className="pgo-review-row"><span className="pgo-review-label">Aadhaar</span><span className="pgo-review-value">{aadharNumber}</span></div>
          <div className="pgo-review-row"><span className="pgo-review-label">PAN</span><span className="pgo-review-value">{panNumber}</span></div>
        </div>

        {latitude && longitude && (
          <div className="pgo-review-card">
            <h3>📍 Location</h3>
            <div className="pgo-review-row"><span className="pgo-review-label">Coordinates</span><span className="pgo-review-value">{Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}</span></div>
          </div>
        )}
      </div>
    );
  }

  function renderCurrentStep() {
    switch (currentStep.key) {
      case 'owner': return renderOwnerStep();
      case 'business': return renderBusinessStep();
      case 'kyc': return renderKycStep();
      case 'location': return renderLocationStep();
      case 'review': return renderReviewStep();
      default: return null;
    }
  }

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="pgo-page" id="pg-provider-onboarding">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="pgo-top-bar">
        <button className="po-back" onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div className="pgo-step-info">
          <span className="pgo-step-num">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="pgo-step-icon">{currentStep.icon}</span>
        </div>
      </div>

      {/* ── Stepper Dots ─────────────────────────────────────── */}
      <div className="pgo-stepper">
        {STEPS.map((step, i) => (
          <div key={step.key} style={{ display: 'contents' }}>
            <div
              className={`pgo-stepper-dot ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'active' : ''}`}
            >
              {i < stepIndex ? <Check size={14} strokeWidth={3} /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`pgo-stepper-line ${i < stepIndex ? 'done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Progress Bar ─────────────────────────────────────── */}
      <div className="pgo-progress">
        <div className="pgo-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="pgo-content">
        <h1 className="pgo-title">{currentStep.title}</h1>
        <p className="pgo-subtitle">{currentStep.subtitle}</p>

        {error && <div className="pgo-error">{error}</div>}

        {renderCurrentStep()}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="pgo-footer">
        {stepIndex > 0 && (
          <Button variant="outline" size="lg" onClick={goBack} disabled={loading}>
            Back
          </Button>
        )}
        <Button
          variant="accent"
          size="lg"
          fullWidth
          onClick={isLastStep ? handleSubmit : goNext}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" /> Submitting...
            </>
          ) : isLastStep ? (
            'Submit & Go to Dashboard'
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
