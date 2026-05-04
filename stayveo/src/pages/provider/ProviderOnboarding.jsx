import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Upload, Plus } from 'lucide-react';
import Button from '../../components/Button';
import './ProviderOnboarding.css';

// Dynamic form configs per provider type
const dynamicSteps = {
  pg: {
    title: 'PG / Room Details', icon: '🏠',
    fields: [
      { key: 'pgName', label: 'PG Name', type: 'text', placeholder: 'e.g. Sunshine PG for Boys' },
      { key: 'address', label: 'Address', type: 'text', placeholder: 'Full address with landmark' },
      { key: 'roomTypes', label: 'Room Types', type: 'chips', options: ['Single', 'Shared (2)', 'Shared (3)', 'Shared (4)'] },
      { key: 'priceMin', label: 'Min Price (₹/month)', type: 'number', placeholder: '4000' },
      { key: 'priceMax', label: 'Max Price (₹/month)', type: 'number', placeholder: '15000' },
      { key: 'amenities', label: 'Amenities', type: 'chips', options: ['WiFi', 'AC', 'Food', 'Laundry', 'Geyser', 'Parking', 'CCTV', 'Study Hall'] },
      { key: 'totalRooms', label: 'Total Rooms', type: 'number', placeholder: '10' },
      { key: 'available', label: 'Available Rooms', type: 'number', placeholder: '4' },
    ],
  },
  tiffin: {
    title: 'Tiffin Service Details', icon: '🍱',
    fields: [
      { key: 'kitchenName', label: 'Kitchen Name', type: 'text', placeholder: 'e.g. MaaBhojan Kitchen' },
      { key: 'foodType', label: 'Food Type', type: 'chips', options: ['Veg', 'Non-Veg', 'Jain', 'Vegan'] },
      { key: 'meals', label: 'Meal Options', type: 'chips', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] },
      { key: 'monthlyPrice', label: 'Monthly Price (₹)', type: 'number', placeholder: '2800' },
      { key: 'deliveryRange', label: 'Delivery Range (km)', type: 'number', placeholder: '3' },
      { key: 'deliveryTiming', label: 'Delivery Timing', type: 'chips', options: ['8-10 AM', '12-2 PM', '7-9 PM'] },
    ],
  },
  laundry: {
    title: 'Laundry Service Details', icon: '🧺',
    fields: [
      { key: 'bizName', label: 'Business Name', type: 'text', placeholder: 'e.g. QuickWash Laundry' },
      { key: 'pricingModel', label: 'Pricing Model', type: 'chips', options: ['Per Kg', 'Per Item', 'Monthly Plan'] },
      { key: 'pricePerKg', label: 'Price per Kg (₹)', type: 'number', placeholder: '149' },
      { key: 'pickup', label: 'Pickup Frequency', type: 'chips', options: ['Daily', 'Alternate Days', 'Weekly'] },
      { key: 'deliveryTime', label: 'Delivery Time', type: 'chips', options: ['Same Day', 'Next Day', '2 Days'] },
      { key: 'serviceRadius', label: 'Service Radius (km)', type: 'number', placeholder: '2' },
    ],
  },
  cleaning: {
    title: 'Cleaning Service Details', icon: '🧹',
    fields: [
      { key: 'serviceTypes', label: 'Service Types', type: 'chips', options: ['Daily Cleaning', 'Weekly Cleaning', 'Deep Cleaning', 'Move-in/Move-out'] },
      { key: 'basicPrice', label: 'Basic Price (₹/visit)', type: 'number', placeholder: '299' },
      { key: 'deepPrice', label: 'Deep Clean Price (₹)', type: 'number', placeholder: '599' },
      { key: 'staffCount', label: 'Staff Available', type: 'number', placeholder: '3' },
      { key: 'timeSlots', label: 'Available Slots', type: 'chips', options: ['8-10 AM', '10-12 PM', '2-4 PM', '4-6 PM'] },
      { key: 'serviceRadius', label: 'Service Radius (km)', type: 'number', placeholder: '3' },
    ],
  },
};

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTypes = location.state?.types || ['pg'];
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [chipSelections, setChipSelections] = useState({});

  // Build all steps: basic + dynamic per type
  const allSteps = [
    { key: 'basic', title: 'Basic Information', icon: '📋' },
    ...selectedTypes.map(t => ({
      key: t,
      title: dynamicSteps[t].title,
      icon: dynamicSteps[t].icon,
    })),
    { key: 'photos', title: 'Upload Photos', icon: '📸' },
  ];

  const currentStep = allSteps[stepIndex];
  const totalSteps = allSteps.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const toggleChip = (fieldKey, option) => {
    setChipSelections(prev => {
      const current = prev[fieldKey] || [];
      return {
        ...prev,
        [fieldKey]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  };

  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(s => s + 1);
    } else {
      navigate('/provider/verify', { state: { types: selectedTypes } });
    }
  };

  const renderField = (field) => {
    if (field.type === 'chips') {
      const selected = chipSelections[field.key] || [];
      return (
        <div key={field.key} className="po-field">
          <label>{field.label}</label>
          <div className="po-chips">
            {field.options.map(opt => (
              <button
                key={opt}
                className={`po-chip ${selected.includes(opt) ? 'active' : ''}`}
                onClick={() => toggleChip(field.key, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={field.key} className="po-field">
        <label>{field.label}</label>
        <input
          className="input-field"
          type={field.type}
          placeholder={field.placeholder}
          value={formData[field.key] || ''}
          onChange={e => updateField(field.key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <div className="po-page" id="provider-onboarding">
      <div className="po-top-bar">
        <button className="back-btn" onClick={() => stepIndex > 0 ? setStepIndex(s => s - 1) : navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="po-step-info">
          <span className="po-step-num">Step {stepIndex + 1} of {totalSteps}</span>
          <span className="po-step-icon">{currentStep.icon}</span>
        </div>
      </div>

      <div className="po-progress">
        <div className="po-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="po-content">
        <h1 className="po-title">{currentStep.title}</h1>

        {/* BASIC INFO STEP */}
        {currentStep.key === 'basic' && (
          <div className="po-fields" key="basic">
            <div className="po-field">
              <label>Your Name</label>
              <input className="input-field" placeholder="Full name" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} />
            </div>
            <div className="po-field">
              <label>Phone Number</label>
              <div className="po-phone-row">
                <span className="po-phone-prefix">+91</span>
                <input className="input-field" type="tel" placeholder="98765 43210" maxLength={10} value={formData.phone || ''} onChange={e => updateField('phone', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div className="po-field">
              <label>Business Name</label>
              <input className="input-field" placeholder="Your business / PG name" value={formData.bizName || ''} onChange={e => updateField('bizName', e.target.value)} />
            </div>
            <div className="po-field">
              <label>Location</label>
              <div className="po-map-picker">
                <MapPin size={20} />
                <span>Tap to select on map</span>
              </div>
            </div>
            <div className="po-field">
              <label>Service Area Radius</label>
              <div className="po-radius-display">{formData.radius || 2} km</div>
              <input
                type="range" className="po-slider" min="0.5" max="10" step="0.5"
                value={formData.radius || 2}
                onChange={e => updateField('radius', e.target.value)}
              />
              <div className="po-range-labels"><span>0.5 km</span><span>10 km</span></div>
            </div>
          </div>
        )}

        {/* DYNAMIC TYPE STEPS */}
        {dynamicSteps[currentStep.key] && (
          <div className="po-fields" key={currentStep.key}>
            {dynamicSteps[currentStep.key].fields.map(renderField)}
          </div>
        )}

        {/* PHOTOS STEP */}
        {currentStep.key === 'photos' && (
          <div className="po-fields" key="photos">
            <p className="po-photo-hint">Add clear photos of your space / service</p>
            <div className="po-photo-grid">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <button key={i} className="po-photo-btn">
                  {i === 0 ? (
                    <><Upload size={22} /><span>Upload</span></>
                  ) : (
                    <Plus size={20} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="po-footer">
        <Button variant="primary" fullWidth size="lg" onClick={handleNext}>
          {stepIndex < totalSteps - 1 ? 'Next' : 'Submit & Verify →'}
        </Button>
      </div>
    </div>
  );
}
