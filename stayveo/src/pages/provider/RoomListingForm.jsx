import { useState, useRef, useCallback } from 'react';
// ─── Room Listing Form ──────────────────────────────────────────────────────
// Main form for adding/editing property room details.
// Features layout upgrades: sticky premium bottom action bar on both desktop
// and mobile with glassmorphic backgrounds.
// ────────────────────────────────────────────────────────────────────────────
import {
  Loader2,
  X,
  ImagePlus,
  Home,
  IndianRupee,
  ListChecks,
  Images,
  Eye,
  BedDouble,
  Send,
  MapPin,
  Building2,
  CreditCard,
  Wifi,
  Utensils,
  Wind,
  Shield,
  Car,
  BookOpen,
  Zap,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { uploadImage, removeImageFromStorage, parseStoragePath } from '../../lib/storage';
import LocationPicker from '../../components/maps/LocationPicker';
import './RoomListingForm.css';

const ROOM_TYPES = ['Single', 'Double Sharing', 'Triple Sharing', '4-Bed Dorm', 'AC Room', 'Non-AC Room'];
const PROPERTY_TYPES = ['Hostel', 'PG', 'Co-living', 'Apartment'];
const PROPERTY_CATEGORIES = ['PG / Hostel', 'Student Housing', 'Managed Rooms', 'Private Room'];
const AMENITY_OPTIONS = ['WiFi', 'AC', 'Food', 'Geyser', 'Parking', 'CCTV', 'Study Table', 'Power Backup'];
const GENDER_OPTIONS = [
  { value: 'boys', label: 'Boys Only' },
  { value: 'girls', label: 'Girls Only' },
  { value: 'unisex', label: 'Unisex' },
];
const MAX_IMAGES = 6;

const EMPTY_FORM = {
  title: '',
  roomType: '',
  genderPreference: 'unisex',
  price: '',
  securityDeposit: '',
  reservationFee: '',
  minimumStayMonths: '1',
  numberOfBeds: '1',
  platformFee: '0',
  foodCharges: '0',
  electricityCharges: '0',
  waterCharges: '0',
  maintenanceCharges: '0',
  parkingCharges: '0',
  otherCharges: '0',
  totalBeds: '1',
  availableBeds: '1',
  floor: '',
  amenities: [],
  images: [],
  description: '',
  isActive: true,
};

const EMPTY_EXTRA = {
  propertyType: 'Hostel',
  propertyCategory: 'PG / Hostel',
  address: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  maintenance: '',
  electricityIncluded: 'Included',
  mapPinned: false,
  latitude: null,
  longitude: null,
};

function toFormValues(record) {
  if (!record) return EMPTY_FORM;
  return {
    title: record.title ?? '',
    roomType: record.roomType ?? '',
    genderPreference: record.genderPreference ?? 'unisex',
    price: record.price != null ? String(record.price) : '',
    securityDeposit: record.securityDeposit != null ? String(record.securityDeposit) : '',
    reservationFee: record.reservationFee != null ? String(record.reservationFee) : '',
    minimumStayMonths: record.minimumStayMonths != null ? String(record.minimumStayMonths) : '1',
    numberOfBeds: record.numberOfBeds != null ? String(record.numberOfBeds) : '1',
    platformFee: record.platformFee != null ? String(record.platformFee) : '0',
    foodCharges: record.foodCharges != null ? String(record.foodCharges) : '0',
    electricityCharges: record.electricityCharges != null ? String(record.electricityCharges) : '0',
    waterCharges: record.waterCharges != null ? String(record.waterCharges) : '0',
    maintenanceCharges: record.maintenanceCharges != null ? String(record.maintenanceCharges) : '0',
    parkingCharges: record.parkingCharges != null ? String(record.parkingCharges) : '0',
    otherCharges: record.otherCharges != null ? String(record.otherCharges) : '0',
    totalBeds: record.totalBeds != null ? String(record.totalBeds) : '1',
    availableBeds: record.availableBeds != null ? String(record.availableBeds) : '1',
    floor: record.floor != null ? String(record.floor) : '',
    amenities: record.amenities ?? [],
    images: record.images ?? [],
    description: record.description ?? '',
    isActive: record.isActive ?? true,
  };
}

export default function RoomListingForm({ initialValues = null, onSubmit, loading = false, submitLabel = 'Save' }) {
  const { provider } = useProvider();
  const [form, setForm] = useState(() => toFormValues(initialValues));
  const [extra, setExtra] = useState(() => {
    if (initialValues) {
      return {
        ...EMPTY_EXTRA,
        propertyType: initialValues.propertyType ?? 'Hostel',
        propertyCategory: initialValues.propertyCategory ?? 'PG / Hostel',
        address: initialValues.address ?? '',
        city: initialValues.city ?? '',
        state: initialValues.state ?? '',
        pincode: initialValues.pincode ?? '',
        landmark: initialValues.landmark ?? '',
        maintenance: initialValues.maintenance ?? '',
        electricityIncluded: initialValues.electricityIncluded ?? 'Included',
        latitude: initialValues.latitude ?? null,
        longitude: initialValues.longitude ?? null,
        mapPinned: !!(initialValues.latitude && initialValues.longitude),
      };
    }
    return EMPTY_EXTRA;
  });
  const [imgUploading, setImgUploading] = useState(false);
  const fileInputRef = useRef(null);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setExtraField(field, value) {
    setExtra(prev => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(amenity) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }

  const handleImageFiles = useCallback(async (files) => {
    if (!files?.length) return;
    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) return;

    setImgUploading(true);
    const uploads = Array.from(files).slice(0, remaining);
    const results = [];

    for (const file of uploads) {
      try {
        const { publicUrl } = await uploadImage({
          file,
          providerId: provider.phone,
          listingId: 'draft',
          serviceType: 'pg',
          imageId: `${Date.now()}-${file.name}`,
        });
        results.push(publicUrl);
      } catch {
        // Partial image uploads should not block the rest of the form.
      }
    }

    if (results.length > 0) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...results] }));
    }
    setImgUploading(false);
  }, [form.images.length, provider.phone]);

  function handleDrop(event) {
    event.preventDefault();
    if (!imgUploading) handleImageFiles(event.dataTransfer.files);
  }

  function removeImage(url) {
    setForm(prev => ({ ...prev, images: prev.images.filter(u => u !== url) }));
    const { path } = parseStoragePath(url);
    if (path) removeImageFromStorage(url).catch(() => {});
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      address: [extra.address, extra.city, extra.state, extra.pincode].filter(Boolean).join(', ') || null,
      roomType: form.roomType,
      genderPreference: form.genderPreference,
      price: parseFloat(form.price) || 0,
      securityDeposit: parseFloat(form.securityDeposit) || 0,
      reservationFee: parseFloat(form.reservationFee) || 0,
      minimumStayMonths: parseInt(form.minimumStayMonths, 10) || 1,
      numberOfBeds: parseInt(form.numberOfBeds, 10) || 1,
      platformFee: parseFloat(form.platformFee) || 0,
      foodCharges: parseFloat(form.foodCharges) || 0,
      electricityCharges: parseFloat(form.electricityCharges) || 0,
      waterCharges: parseFloat(form.waterCharges) || 0,
      maintenanceCharges: parseFloat(form.maintenanceCharges) || 0,
      parkingCharges: parseFloat(form.parkingCharges) || 0,
      otherCharges: parseFloat(form.otherCharges) || 0,
      totalBeds: parseInt(form.totalBeds, 10) || 1,
      availableBeds: parseInt(form.availableBeds, 10) || 0,
      floor: form.floor ? parseInt(form.floor, 10) : null,
      amenities: form.amenities,
      images: form.images,
      isActive: form.isActive,
    });
  }

  function toggleVisibility() {
    set('isActive', !form.isActive);
  }

  function handleVisibilityKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleVisibility();
    }
  }

  const isValid = form.title.trim() && form.roomType && form.price !== '' && form.securityDeposit !== '' && form.reservationFee !== '' && form.minimumStayMonths && form.numberOfBeds;
  return (
    <form className="rlf-form" onSubmit={handleSubmit} id="room-listing-form">
      <section className="rlf-section" aria-labelledby="rlf-basics-title">
        <SectionHeader
          id="rlf-basics-title"
          icon={<Building2 size={20} />}
          tone="green"
          title="Property Basics"
          subtitle="Core identification details"
        />

        <div className="rlf-grid rlf-grid--2">
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-title">Property Name</label>
            <input
              id="rlf-title"
              className="rlf-input"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Green Meadows Premium PG"
              maxLength={200}
              required
            />
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-property-type">Property Type</label>
            <select
              id="rlf-property-type"
              className="rlf-input rlf-select"
              value={extra.propertyType}
              onChange={e => setExtraField('propertyType', e.target.value)}
            >
              {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-room-type">Room Type</label>
            <select
              id="rlf-room-type"
              className="rlf-input rlf-select"
              value={form.roomType}
              onChange={e => set('roomType', e.target.value)}
              required
            >
              <option value="">Select room type</option>
              {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-property-category">Property Category</label>
            <select
              id="rlf-property-category"
              className="rlf-input rlf-select"
              value={extra.propertyCategory}
              onChange={e => setExtraField('propertyCategory', e.target.value)}
            >
              {PROPERTY_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        <div className="rlf-field">
          <label className="rlf-label" htmlFor="rlf-desc">
            Description
            <span className="rlf-optional">Optional</span>
          </label>
          <textarea
            id="rlf-desc"
            className="rlf-input rlf-textarea"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the room, rules, nearby landmarks, and resident expectations."
            rows={4}
            maxLength={2000}
          />
          <span className="rlf-char-count">{form.description.length}/2000</span>
        </div>

        <VisibilityToggle
          active={form.isActive}
          onToggle={toggleVisibility}
          onKeyDown={handleVisibilityKeyDown}
        />
      </section>

      <section className="rlf-section" aria-labelledby="rlf-location-title">
        <SectionHeader
          id="rlf-location-title"
          icon={<MapPin size={20} />}
          tone="green"
          title="Location"
          subtitle="Pin the property so residents can understand the area"
        />

        <div className="rlf-grid rlf-grid--2">
          <div className="rlf-field rlf-field--wide">
            <label className="rlf-label" htmlFor="rlf-address">Address</label>
            <input
              id="rlf-address"
              className="rlf-input"
              type="text"
              value={extra.address}
              onChange={e => setExtraField('address', e.target.value)}
              placeholder="Enter complete address with landmark"
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-city">City</label>
            <input
              id="rlf-city"
              className="rlf-input"
              type="text"
              value={extra.city}
              onChange={e => setExtraField('city', e.target.value)}
              placeholder="Mumbai"
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-state">State</label>
            <input
              id="rlf-state"
              className="rlf-input"
              type="text"
              value={extra.state}
              onChange={e => setExtraField('state', e.target.value)}
              placeholder="Maharashtra"
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-pincode">Pincode</label>
            <input
              id="rlf-pincode"
              className="rlf-input"
              type="text"
              inputMode="numeric"
              value={extra.pincode}
              onChange={e => setExtraField('pincode', e.target.value)}
              placeholder="400001"
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-landmark">Landmark</label>
            <input
              id="rlf-landmark"
              className="rlf-input"
              type="text"
              value={extra.landmark}
              onChange={e => setExtraField('landmark', e.target.value)}
              placeholder="Near metro gate"
            />
          </div>
        </div>

        <div className="rlf-map-container" style={{ marginTop: '16px' }}>
          <LocationPicker
            key={`${extra.latitude || 'no-lat'}-${extra.longitude || 'no-lng'}`}
            latitude={Number.isFinite(Number(extra.latitude)) ? Number(extra.latitude) : undefined}
            longitude={Number.isFinite(Number(extra.longitude)) ? Number(extra.longitude) : undefined}
            address={extra.address}
            onChange={(location) => {
              setExtraField('latitude', location.latitude);
              setExtraField('longitude', location.longitude);
              setExtraField('mapPinned', true);
            }}
          />
        </div>
      </section>

      <section className="rlf-section" aria-labelledby="rlf-pricing-title">
        <SectionHeader
          id="rlf-pricing-title"
          icon={<CreditCard size={20} />}
          tone="pink"
          title="Pricing"
          subtitle="Define monthly rent, occupancy, and availability"
        />

        <div className="rlf-grid rlf-grid--3">
          <MoneyField
            id="rlf-price"
            label="Monthly Rent"
            value={form.price}
            onChange={value => set('price', value)}
            required
          />
          <MoneyField
            id="rlf-deposit"
            label="Security Deposit"
            value={form.securityDeposit}
            onChange={value => set('securityDeposit', value)}
            required
          />
          <MoneyField id="rlf-reservation-fee" label="Reservation Fee" value={form.reservationFee} onChange={value => set('reservationFee', value)} required />
          <MoneyField id="rlf-platform-fee" label="Platform Fee" value={form.platformFee} onChange={value => set('platformFee', value)} optional />
          <MoneyField
            id="rlf-maintenance"
            label="Maintenance"
            value={extra.maintenance}
            onChange={value => setExtraField('maintenance', value)}
            optional
          />

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-electricity">Electricity Included</label>
            <select
              id="rlf-electricity"
              className="rlf-input rlf-select"
              value={extra.electricityIncluded}
              onChange={e => setExtraField('electricityIncluded', e.target.value)}
            >
              <option>Included</option>
              <option>Separate Meter</option>
              <option>Fixed Charge</option>
            </select>
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-min-stay">Minimum Stay (months)</label>
            <input id="rlf-min-stay" className="rlf-input" type="number" value={form.minimumStayMonths} onChange={e => set('minimumStayMonths', e.target.value)} min="1" max="60" required />
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-number-beds">Number of Beds</label>
            <input id="rlf-number-beds" className="rlf-input" type="number" value={form.numberOfBeds} onChange={e => set('numberOfBeds', e.target.value)} min="1" max="100" required />
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-gender">Occupancy</label>
            <select
              id="rlf-gender"
              className="rlf-input rlf-select"
              value={form.genderPreference}
              onChange={e => set('genderPreference', e.target.value)}
            >
              {GENDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-avail">Available Rooms</label>
            <input
              id="rlf-avail"
              className="rlf-input"
              type="number"
              value={form.availableBeds}
              onChange={e => set('availableBeds', e.target.value)}
              min="0"
              max="20"
            />
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-total">Total Beds</label>
            <input
              id="rlf-total"
              className="rlf-input"
              type="number"
              value={form.totalBeds}
              onChange={e => set('totalBeds', e.target.value)}
              min="1"
              max="20"
            />
          </div>

          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-floor">
              Floor
              <span className="rlf-optional">Optional</span>
            </label>
            <input
              id="rlf-floor"
              className="rlf-input"
              type="number"
              value={form.floor}
              onChange={e => set('floor', e.target.value)}
              placeholder="e.g. 2"
              min="0"
            />
          </div>
        </div>

        <div className="rlf-grid rlf-grid--3" style={{ marginTop: '16px' }}>
          <MoneyField id="rlf-food" label="Food Charges" value={form.foodCharges} onChange={value => set('foodCharges', value)} optional />
          <MoneyField id="rlf-electricity-charge" label="Electricity Charges" value={form.electricityCharges} onChange={value => set('electricityCharges', value)} optional />
          <MoneyField id="rlf-water" label="Water Charges" value={form.waterCharges} onChange={value => set('waterCharges', value)} optional />
          <MoneyField id="rlf-maintenance-charge" label="Maintenance Charges" value={form.maintenanceCharges} onChange={value => set('maintenanceCharges', value)} optional />
          <MoneyField id="rlf-parking" label="Parking Charges" value={form.parkingCharges} onChange={value => set('parkingCharges', value)} optional />
          <MoneyField id="rlf-other" label="Other Charges" value={form.otherCharges} onChange={value => set('otherCharges', value)} optional />
        </div>

        {form.availableBeds === '0' || form.availableBeds === 0 ? (
          <div className="rlf-warn">
            <strong>Warning:</strong> 0 available rooms will mark this listing full and hide it from students.
          </div>
        ) : null}
      </section>

      <section className="rlf-section" aria-labelledby="rlf-amenities-title">
        <SectionHeader
          id="rlf-amenities-title"
          icon={<ListChecks size={20} />}
          tone="blue"
          title="Amenities"
          subtitle="Available facilities for residents"
        />

        <div className="rlf-amenity-grid">
          {AMENITY_OPTIONS.map(amenity => {
            const selected = form.amenities.includes(amenity);
            return (
              <label key={amenity} className={`rlf-amenity ${selected ? 'rlf-amenity--active' : ''}`}>
                <input
                  className="rlf-amenity-input"
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleAmenity(amenity)}
                />
                <span className="rlf-amenity-icon"><AmenityIcon amenity={amenity} /></span>
                <span className="rlf-amenity-title">{amenity}</span>
                <span className="rlf-amenity-check" aria-hidden="true" />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rlf-section" aria-labelledby="rlf-photos-title">
        <SectionHeader
          id="rlf-photos-title"
          icon={<Images size={20} />}
          tone="gray"
          title="Property Photos"
          subtitle="Visual showcase of the living space"
        />

        {form.images.length < MAX_IMAGES && (
          <button
            type="button"
            className="rlf-upload-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={event => event.preventDefault()}
            disabled={imgUploading}
          >
            <span className="rlf-upload-icon">
              {imgUploading
                ? <Loader2 size={26} className="rlf-spinner" />
                : <ImagePlus size={28} />
              }
            </span>
            <strong>{imgUploading ? 'Uploading photos...' : 'Drop your photos here'}</strong>
            <span>JPEG, PNG, WEBP up to storage limits. Maximum {MAX_IMAGES} images.</span>
            <span className="rlf-browse-text">Browse files</span>
          </button>
        )}

        <div className="rlf-images-grid">
          {form.images.map((url, i) => (
            <div key={url} className="rlf-img-thumb">
              <img src={url} alt={`Room ${i + 1}`} />
              <button
                type="button"
                className="rlf-img-remove"
                onClick={() => removeImage(url)}
                aria-label={`Remove room photo ${i + 1}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}

          {Array.from({ length: Math.max(0, Math.min(2, MAX_IMAGES - form.images.length)) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              className="rlf-img-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={imgUploading}
              aria-label="Add room photo"
            >
              <ImagePlus size={22} />
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="rlf-file-hidden"
          onChange={e => {
            handleImageFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </section>

      <div className="rlf-submit-bar">
        <button
          type="submit"
          className="rlf-submit"
          disabled={loading || !isValid || imgUploading}
        >
          {loading
            ? <><Loader2 size={18} className="rlf-spinner" /> Saving...</>
            : <>{submitLabel} <Send size={16} /></>
          }
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ id, icon, tone, title, subtitle }) {
  return (
    <div className="rlf-section-head">
      <span className={`rlf-section-icon rlf-icon-${tone}`}>{icon}</span>
      <div>
        <h3 className="rlf-section-title" id={id}>{title}</h3>
        <p className="rlf-section-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function MoneyField({ id, label, value, onChange, required = false, optional = false }) {
  return (
    <div className="rlf-field">
      <label className="rlf-label" htmlFor={id}>
        {label}
        {optional ? <span className="rlf-optional">Optional</span> : null}
      </label>
      <div className="rlf-money-field">
        <IndianRupee size={14} />
        <input
          id={id}
          className="rlf-input"
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.00"
          min="0"
          required={required}
        />
      </div>
    </div>
  );
}

function VisibilityToggle({ active, onToggle, onKeyDown }) {
  return (
    <label className="rlf-toggle-row" htmlFor="rlf-active">
      <div>
        <p className="rlf-toggle-label">{active ? 'Active listing' : 'Hidden from students'}</p>
        <p className="rlf-toggle-hint">Students can discover this room when the listing is active.</p>
      </div>
      <div
        className={`rlf-toggle-pill ${active ? 'rlf-toggle-pill--on' : ''}`}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        role="switch"
        aria-checked={active}
        tabIndex={0}
        id="rlf-active"
      >
        <div className="rlf-toggle-knob" />
      </div>
    </label>
  );
}

function AmenityIcon({ amenity }) {
  const normalized = amenity.toLowerCase();
  if (normalized.includes('wifi')) return <Wifi size={21} />;
  if (normalized.includes('food')) return <Utensils size={21} />;
  if (normalized.includes('ac')) return <Wind size={21} />;
  if (normalized.includes('cctv')) return <Shield size={21} />;
  if (normalized.includes('parking')) return <Car size={21} />;
  if (normalized.includes('study')) return <BookOpen size={21} />;
  if (normalized.includes('power')) return <Zap size={21} />;
  if (normalized.includes('bed')) return <BedDouble size={21} />;
  if (normalized.includes('geyser')) return <IndianRupee size={21} />;
  if (normalized.includes('view') || normalized.includes('security')) return <Eye size={21} />;
  return <Home size={21} />;
}
