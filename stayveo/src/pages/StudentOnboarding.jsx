import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Button from '../components/Button';
import { createStudentProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './StudentOnboarding.css';

// ── Map display labels → backend enum values ────────────────────────────
const YEAR_MAP = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
const GENDER_MAP = { 'Male': 'MALE', 'Female': 'FEMALE', 'Other': 'OTHER' };
const FOOD_MAP = { '🥬 Vegetarian': 'VEG', '🍗 Non-Veg': 'NONVEG', '🌱 Vegan': 'VEGAN', '🍽️ No Preference': 'NO_PREFERENCE' };
const LIFESTYLE_MAP = { '🌅 Early Bird': 'EARLY_BIRD', '🌙 Night Owl': 'NIGHT_OWL', '⚡ Flexible': 'FLEXIBLE' };

// ── Validation helpers ──────────────────────────────────────────────────
function getStepErrors(step, data) {
  const errors = {};
  if (step === 0) {
    if (!data.name.trim()) errors.name = 'Name is required';
    if (!data.year) errors.year = 'Please select your year';
    if (!data.gender) errors.gender = 'Please select your gender';
  }
  if (step === 1) {
    if (!data.food) errors.food = 'Please select food preference';
    if (!data.lifestyle) errors.lifestyle = 'Please select your lifestyle';
  }
  if (step === 2) {
    if (!data.budget) errors.budget = 'Please set your budget';
    if (!data.location) errors.location = 'Please select a location preference';
  }
  return errors;
}

function isStepValid(step, data) {
  return Object.keys(getStepErrors(step, data)).length === 0;
}

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [data, setData] = useState({
    name: '',
    year: '',
    gender: '',
    food: '',
    lifestyle: '',
    budget: 8000,
    location: '',
  });

  // ── Advance to next step (with validation) ─────────────────────────────
  const handleNext = () => {
    const errors = getStepErrors(step, data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});
    setError('');
    setStep((s) => s + 1);
  };

  // ── Submit to backend ─────────────────────────────────────────────────
  const handleFinish = async () => {
    // Final step validation
    const errors = getStepErrors(step, data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    const userId = localStorage.getItem('userId');
    const college = localStorage.getItem('selectedCollege') || 'Unknown';

    if (!userId) {
      setError('Session expired. Please login again.');
      toast.error('Session expired. Please login again.');
      setTimeout(() => navigate('/auth'), 1500);
      return;
    }

    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const profilePayload = {
        fullName: data.name.trim(),
        college,
        year: YEAR_MAP[data.year] || undefined,
        gender: GENDER_MAP[data.gender] || undefined,
        foodPreference: FOOD_MAP[data.food] || undefined,
        sleepSchedule: LIFESTYLE_MAP[data.lifestyle] || undefined,
        locationPreference: data.location,
        budget: String(data.budget),
      };

      // Remove undefined fields
      Object.keys(profilePayload).forEach(k => {
        if (profilePayload[k] === undefined) delete profilePayload[k];
      });

      await createStudentProfile(userId, profilePayload);

      // Save to localStorage for quick access
      localStorage.setItem('userName', data.name.trim());
      localStorage.setItem('userCollege', college);
      localStorage.setItem('profileComplete', 'true');

      // Update global auth state
      setAuth({
        name: data.name.trim(),
        exists: true,
        isAuthenticated: true,
      });

      toast.success('Profile saved! Welcome to StayVeo 🎉');
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'About you', content: (
        <div className="onb-fields">
          <div className="onb-field">
            <label>Name <span className="onb-required">*</span></label>
            <input
              className={`input-field ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="Your name"
              value={data.name}
              onChange={e => { setData({...data, name: e.target.value}); setFieldErrors(p => ({...p, name: undefined})); }}
            />
            {fieldErrors.name && <span className="onb-field-error">{fieldErrors.name}</span>}
          </div>
          <div className="onb-field">
            <label>Year <span className="onb-required">*</span></label>
            <div className="onb-chips">{['1st Year','2nd Year','3rd Year','4th Year'].map(y => (
              <button key={y} className={`onb-chip ${data.year === y ? 'active' : ''}`}
                onClick={() => { setData({...data, year: y}); setFieldErrors(p => ({...p, year: undefined})); }}>{y}</button>
            ))}</div>
            {fieldErrors.year && <span className="onb-field-error">{fieldErrors.year}</span>}
          </div>
          <div className="onb-field">
            <label>Gender <span className="onb-required">*</span></label>
            <div className="onb-chips">{['Male','Female','Other'].map(g => (
              <button key={g} className={`onb-chip ${data.gender === g ? 'active' : ''}`}
                onClick={() => { setData({...data, gender: g}); setFieldErrors(p => ({...p, gender: undefined})); }}>{g}</button>
            ))}</div>
            {fieldErrors.gender && <span className="onb-field-error">{fieldErrors.gender}</span>}
          </div>
        </div>
      )
    },
    {
      title: 'Preferences', content: (
        <div className="onb-fields">
          <div className="onb-field">
            <label>Food Preference <span className="onb-required">*</span></label>
            <div className="onb-chips">{['🥬 Vegetarian','🍗 Non-Veg','🌱 Vegan','🍽️ No Preference'].map(f => (
              <button key={f} className={`onb-chip ${data.food === f ? 'active' : ''}`}
                onClick={() => { setData({...data, food: f}); setFieldErrors(p => ({...p, food: undefined})); }}>{f}</button>
            ))}</div>
            {fieldErrors.food && <span className="onb-field-error">{fieldErrors.food}</span>}
          </div>
          <div className="onb-field">
            <label>Lifestyle <span className="onb-required">*</span></label>
            <div className="onb-chips">{['🌅 Early Bird','🌙 Night Owl','⚡ Flexible'].map(l => (
              <button key={l} className={`onb-chip ${data.lifestyle === l ? 'active' : ''}`}
                onClick={() => { setData({...data, lifestyle: l}); setFieldErrors(p => ({...p, lifestyle: undefined})); }}>{l}</button>
            ))}</div>
            {fieldErrors.lifestyle && <span className="onb-field-error">{fieldErrors.lifestyle}</span>}
          </div>
        </div>
      )
    },
    {
      title: 'Budget & Location', content: (
        <div className="onb-fields">
          <div className="onb-field">
            <label>Monthly Budget <span className="onb-required">*</span></label>
            <div className="onb-budget-display">₹{data.budget.toLocaleString()}<span>/month</span></div>
            <input
              type="range" min="3000" max="25000" step="500"
              value={data.budget}
              className="onb-slider"
              onChange={e => { setData({...data, budget: +e.target.value}); setFieldErrors(p => ({...p, budget: undefined})); }}
            />
            <div className="onb-range-labels"><span>₹3,000</span><span>₹25,000</span></div>
            {fieldErrors.budget && <span className="onb-field-error">{fieldErrors.budget}</span>}
          </div>
          <div className="onb-field">
            <label>Location Preference <span className="onb-required">*</span></label>
            <div className="onb-chips">{['Near Campus', 'City Center', 'Metro Accessible', 'Anywhere'].map(loc => (
              <button key={loc} className={`onb-chip ${data.location === loc ? 'active' : ''}`}
                onClick={() => { setData({...data, location: loc}); setFieldErrors(p => ({...p, location: undefined})); }}>{loc}</button>
            ))}</div>
            {fieldErrors.location && <span className="onb-field-error">{fieldErrors.location}</span>}
          </div>
        </div>
      )
    }
  ];

  const allFieldsFilled = isStepValid(step, data);

  return (
    <div className="onboarding-page" id="student-onboarding">
      <div className="onb-progress"><div className="onb-progress-bar" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <div className="onb-step-indicator">{step + 1} of {steps.length}</div>
      <h1 className="onb-title">{steps[step].title}</h1>
      <div className="onb-content">{steps[step].content}</div>

      {error && <div className="auth-error" style={{ margin: '0 0 var(--space-4)' }}>{error}</div>}

      <div className="onb-footer">
        {step > 0 && <Button variant="ghost" onClick={() => { setStep(s => s - 1); setError(''); setFieldErrors({}); }}>Back</Button>}
        <Button variant="primary" fullWidth disabled={loading}
          onClick={() => step < steps.length - 1 ? handleNext() : handleFinish()}>
          {step < steps.length - 1
            ? 'Continue'
            : loading
              ? <><Loader2 size={18} className="spin" /> Saving...</>
              : 'Get Started 🚀'}
        </Button>
      </div>
    </div>
  );
}
