import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Heart, Bell, HelpCircle, LogOut, Edit3, Loader2 } from 'lucide-react';
import { currentUser } from '../data/mockData';
import Button from '../components/Button';
import { getCurrentUserProfile, updateUserProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './ProfilePage.css';

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const FOOD_OPTIONS = ['Vegetarian', 'Non-Veg', 'Jain', 'Vegan'];
const SLEEP_OPTIONS = ['Early Bird', 'Night Owl', 'Flexible'];
const STUDY_OPTIONS = ['Quiet', 'Normal', 'Flexible'];
const DEFAULT_BUDGET_RANGE = [5000, 10000];

const YEAR_LABEL_FROM_NUMBER = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year',
};

const DISPLAY_GENDER = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Other',
};

const DISPLAY_FOOD = {
  VEG: 'Vegetarian',
  NONVEG: 'Non-Veg',
  JAIN: 'Jain',
  VEGAN: 'Vegan',
  NO_PREFERENCE: '',
};

const DISPLAY_SLEEP = {
  EARLY_BIRD: 'Early Bird',
  NIGHT_OWL: 'Night Owl',
  FLEXIBLE: 'Flexible',
};

const DISPLAY_STUDY = {
  QUIET: 'Quiet',
  NORMAL: 'Normal',
  FLEXIBLE: 'Flexible',
};

const SOCIAL_LEVEL_TO_SLIDER = {
  INTROVERT: 2,
  AMBIVERT: 3,
  EXTROVERT: 4,
};

const EMPTY_PROFILE = {
  fullName: '',
  college: '',
  year: '',
  gender: '',
  budget: DEFAULT_BUDGET_RANGE,
  foodPreference: '',
  sleepSchedule: '',
  cleanlinessLevel: 0,
  studyHabits: '',
  personalityType: 3,
  locationPreference: '',
  profileImageUrl: '',
};

function parseBudgetRange(budgetValue) {
  if (!budgetValue) return DEFAULT_BUDGET_RANGE;

  const matches = String(budgetValue).match(/\d+/g);
  if (!matches?.length) return DEFAULT_BUDGET_RANGE;

  const numbers = matches.map(Number).filter((value) => !Number.isNaN(value));
  if (numbers.length >= 2) return [numbers[0], numbers[1]];
  if (numbers.length === 1) return [Math.max(2000, numbers[0] - 2000), numbers[0] + 2000];
  return DEFAULT_BUDGET_RANGE;
}

function formatBudgetRange([min, max]) {
  return `₹${min.toLocaleString()} — ₹${max.toLocaleString()}`;
}

function serializeBudgetRange([min, max]) {
  return `${min}-${max}`;
}

function getSocialLabel(value) {
  if (value <= 2) return 'Introvert';
  if (value === 3) return 'Ambivert';
  return 'Extrovert';
}

function mapProfileToForm(profile) {
  return {
    fullName: profile?.fullName || '',
    college: profile?.college || '',
    year: YEAR_LABEL_FROM_NUMBER[profile?.year] || '',
    gender: DISPLAY_GENDER[profile?.gender] || '',
    budget: parseBudgetRange(profile?.budget),
    foodPreference: DISPLAY_FOOD[profile?.foodPreference] || '',
    sleepSchedule: DISPLAY_SLEEP[profile?.sleepSchedule] || '',
    cleanlinessLevel: profile?.cleanlinessLevel || 0,
    studyHabits: DISPLAY_STUDY[profile?.studyHabits] || '',
    personalityType: SOCIAL_LEVEL_TO_SLIDER[profile?.personalityType] || 3,
    locationPreference: profile?.locationPreference || '',
    profileImageUrl: profile?.profileImageUrl || '',
  };
}

function validateProfile(info, phone) {
  if (!phone) return 'Phone number is required to update your profile';
  if (!info.fullName.trim()) return 'Full name is required';
  if (!info.college.trim()) return 'College is required';
  if (!info.year) return 'Year is required';
  if (!info.gender) return 'Gender is required';
  if (!info.foodPreference) return 'Food preference is required';
  if (!info.sleepSchedule) return 'Sleep schedule is required';
  if (!info.cleanlinessLevel) return 'Cleanliness level is required';
  if (!info.studyHabits) return 'Study habits are required';
  if (!info.personalityType) return 'Personality type is required';
  if (!info.budget?.[0] || !info.budget?.[1]) return 'Budget range is required';
  if (info.budget[0] >= info.budget[1]) return 'Budget range is invalid';
  return '';
}

async function fileToDataUrl(file) {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  if (typeof rawDataUrl !== 'string') {
    throw new Error('Failed to process image');
  }

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = rawDataUrl;
  });

  const canvas = document.createElement('canvas');
  const maxSize = 512;
  const scale = Math.min(1, maxSize / image.width, maxSize / image.height);

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to process image');
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { authState, clearAuth, setAuth } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [profileImg, setProfileImg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [info, setInfo] = useState(() => ({
    ...EMPTY_PROFILE,
    fullName: localStorage.getItem('userName') || '',
    college: localStorage.getItem('userCollege') || localStorage.getItem('selectedCollege') || '',
  }));

  const loadProfile = async () => {
    if (!authState?.userId) {
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setLoadError(false);

    try {
      const response = await getCurrentUserProfile(authState.userId);
      const profile = response?.data?.studentProfile;

      if (!profile) {
        // Profile might not exist yet for new users — that's okay
        console.warn('No student profile found for user:', authState.userId);
        setIsLoadingProfile(false);
        return;
      }

      const nextInfo = mapProfileToForm(profile);
      setInfo(nextInfo);
      setProfileImg(nextInfo.profileImageUrl || '');
      if (nextInfo.fullName) localStorage.setItem('userName', nextInfo.fullName);
      if (nextInfo.college) localStorage.setItem('userCollege', nextInfo.college);
      setAuth({ name: nextInfo.fullName || authState?.name, exists: true });
    } catch (error) {
      console.error('Profile load error:', error);
      setLoadError(true);
      toast.error(error?.message || 'Failed to load profile. Tap retry.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [authState?.userId]);

  const handlePhotoUpload = async (e) => {
    if (!isEditing) return;

    const file = e.target.files?.[0];
    e.target.value = '';

    if (file) {
      try {
        const dataUrl = await fileToDataUrl(file);
        setProfileImg(dataUrl);
        setInfo((prev) => ({ ...prev, profileImageUrl: dataUrl }));
      } catch (error) {
        toast.error(error.message || 'Failed to process image');
      }
    }
  };

  const handleUpdateProfile = async () => {
    const validationError = validateProfile(info, authState.phone);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSavingProfile(true);

    try {
      const payload = {
        phone: authState.phone,
        fullName: info.fullName.trim(),
        college: info.college.trim(),
        year: info.year,
        gender: info.gender,
        foodPreference: info.foodPreference,
        budget: serializeBudgetRange(info.budget),
        cleanlinessLevel: info.cleanlinessLevel,
        studyHabits: info.studyHabits,
        personalityType: getSocialLabel(info.personalityType),
        locationPreference: info.locationPreference,
        sleepSchedule: info.sleepSchedule,
        profileImageUrl: info.profileImageUrl || undefined,
      };

      const response = await updateUserProfile(payload);
      const profile = response.data?.studentProfile;

      if (profile) {
        const nextInfo = mapProfileToForm(profile);
        setInfo(nextInfo);
        setProfileImg(nextInfo.profileImageUrl);
        localStorage.setItem('userName', nextInfo.fullName);
        localStorage.setItem('userCollege', nextInfo.college);
        setAuth({ name: nextInfo.fullName, exists: true });
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const menuItems = [
    { icon: <Heart size={18} />, label: 'Saved Listings', path: '/saved' },
    { icon: <Bell size={18} />, label: 'Notifications', path: '/notifications' },
    { icon: <HelpCircle size={18} />, label: 'Help & Support', path: '/profile' },
  ];

  return (
    <div className="page page-padded" id="profile-page">
      {/* ---- Profile Header with Photo Upload ---- */}
      <div className="profile-header">
        <div className={`profile-photo-wrapper ${isEditing ? '' : 'is-readonly'}`} onClick={() => isEditing && fileRef.current?.click()}>
          {profileImg ? (
            <img src={profileImg} alt="Profile" className="profile-photo-img" />
          ) : (
            <div className="profile-photo-placeholder">
              <Camera size={28} />
            </div>
          )}
          <div className="profile-photo-badge">
            {profileImg ? <Edit3 size={12} /> : <Camera size={12} />}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="profile-file-input"
            onChange={handlePhotoUpload}
          />
        </div>
        <h1>{info.fullName || authState?.name || 'Your Profile'}</h1>
        <p>{info.year || 'Student'}{isLoadingProfile ? ' • Loading...' : ' • Student'}</p>
        {loadError && (
          <button className="retry-btn" onClick={loadProfile}>
            ⚠️ Failed to load — Tap to Retry
          </button>
        )}
        <div className="college-badge">🎓 {info.college || 'College not set'}</div>
      </div>

      {/* ---- Stats ---- */}
      <div className="profile-stats">
        <div className="profile-stat"><span className="ps-num">{currentUser?.savedListings?.length ?? 0}</span><span>Saved</span></div>
        <div className="profile-stat-divider" />
        <div className="profile-stat"><span className="ps-num">0</span><span>Bookings</span></div>
        <div className="profile-stat-divider" />
        <div className="profile-stat"><span className="ps-num">{currentUser?.activeServices?.length ?? 0}</span><span>Services</span></div>
      </div>

      {/* ---- Personal Information Section ---- */}
      <div className="pi-section">
        <div className="pi-header">
          <h2>Personal Information</h2>
          <button className="pi-edit-btn" onClick={() => setIsEditing(!isEditing)}>
            <Edit3 size={14} /> {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        <div className="pi-cards">
          {/* Name */}
          <div className="pi-card">
            <label>Full Name</label>
            {isEditing ? (
              <input className="pi-input" value={info.fullName} onChange={e => setInfo({ ...info, fullName: e.target.value })} />
            ) : (
              <span className="pi-value">{info.fullName || 'Not set'}</span>
            )}
          </div>

          <div className="pi-card">
            <label>College</label>
            {isEditing ? (
              <input className="pi-input" value={info.college} onChange={e => setInfo({ ...info, college: e.target.value })} />
            ) : (
              <span className="pi-value">🎓 {info.college || 'Not set'}</span>
            )}
          </div>

          {/* Year */}
          <div className="pi-card">
            <label>Year</label>
            <div className="pi-chips">
              {YEAR_OPTIONS.map(y => (
                <button key={y} className={`pi-chip ${info.year === y ? 'active' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, year: y })}>{y.replace(' Year', '')}</button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="pi-card">
            <label>Gender</label>
            <div className="pi-chips">
              {GENDER_OPTIONS.map(g => (
                <button key={g} className={`pi-chip ${info.gender === g ? 'active' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, gender: g })}>{g}</button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div className="pi-card">
            <label>Budget Range</label>
            <div className="pi-slider-display">{formatBudgetRange(info.budget)}</div>
            {isEditing && (
              <div className="pi-dual-slider">
                <input type="range" min="2000" max="25000" step="500" value={info.budget[0]}
                  onChange={e => setInfo({ ...info, budget: [+e.target.value, Math.max(+e.target.value + 1000, info.budget[1])] })}
                  className="pi-range" />
                <input type="range" min="3000" max="30000" step="500" value={info.budget[1]}
                  onChange={e => setInfo({ ...info, budget: [Math.min(info.budget[0], +e.target.value - 1000), +e.target.value] })}
                  className="pi-range" />
              </div>
            )}
          </div>

          {/* Food Preference */}
          <div className="pi-card">
            <label>🍽️ Food Preference</label>
            <div className="pi-chips">
              {FOOD_OPTIONS.map(f => (
                <button key={f} className={`pi-chip ${info.foodPreference === f ? 'active' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, foodPreference: f })}>{f}</button>
              ))}
            </div>
          </div>

          {/* Sleep Schedule */}
          <div className="pi-card">
            <label>🌙 Sleep Schedule</label>
            <div className="pi-chips">
              {SLEEP_OPTIONS.map(s => (
                <button key={s} className={`pi-chip ${info.sleepSchedule === s ? 'active' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, sleepSchedule: s })}>{s}</button>
              ))}
            </div>
          </div>

          {/* Cleanliness Level */}
          <div className="pi-card">
            <label>🧹 Cleanliness Level</label>
            <div className="pi-level-bar">
              {[1, 2, 3, 4, 5].map(l => (
                <button key={l} className={`pi-level-dot ${l <= info.cleanlinessLevel ? 'filled' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, cleanlinessLevel: l })}>
                  {l}
                </button>
              ))}
            </div>
            <div className="pi-level-labels"><span>Messy</span><span>Spotless</span></div>
          </div>

          {/* Study Habits */}
          <div className="pi-card">
            <label>📚 Study Habits</label>
            <div className="pi-chips">
              {STUDY_OPTIONS.map(s => (
                <button key={s} className={`pi-chip ${info.studyHabits === s ? 'active' : ''}`}
                  onClick={() => isEditing && setInfo({ ...info, studyHabits: s })}>{s}</button>
              ))}
            </div>
          </div>

          {/* Social Level / Personality Type */}
          <div className="pi-card">
            <label>💬 Personality Type</label>
            <div className="pi-social-slider">
              <span className="pi-social-label">Introvert</span>
              <input type="range" min="1" max="5" value={info.personalityType}
                onChange={e => isEditing && setInfo({ ...info, personalityType: +e.target.value })}
                className="pi-range" disabled={!isEditing} />
              <span className="pi-social-label">Extrovert</span>
            </div>
            <div className="pi-social-value">
              {getSocialLabel(info.personalityType)}
            </div>
          </div>

          {/* Location Preference */}
          <div className="pi-card">
            <label>📍 Location Preference</label>
            <input
              type="text"
              className={`pi-input ${!isEditing ? 'disabled' : ''}`}
              placeholder="e.g., Near Campus, City Center, Anywhere"
              value={info.locationPreference}
              onChange={e => isEditing && setInfo({ ...info, locationPreference: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      <div className="profile-update-cta">
        <Button
          className="profile-update-btn"
          onClick={handleUpdateProfile}
          disabled={!isEditing || isLoadingProfile || isSavingProfile}
        >
          {isSavingProfile ? <><Loader2 size={16} className="spin" /> Updating...</> : 'Update Profile'}
        </Button>
      </div>

      {/* ---- Menu ---- */}
      <div className="profile-menu">
        {menuItems.map((item, i) => (
          <button key={i} className="profile-menu-item" onClick={() => navigate(item.path)}>
            <span className="pmi-icon">{item.icon}</span>
            <span className="pmi-label">{item.label}</span>
            <ChevronRight size={16} className="pmi-chevron" />
          </button>
        ))}
      </div>

      <button className="profile-logout" onClick={() => { clearAuth(); toast.info('Logged out'); navigate('/'); }}>
        <LogOut size={18} /> Log Out
      </button>
    </div>
  );
}
