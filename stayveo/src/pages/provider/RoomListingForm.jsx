// ─── RoomListingForm — Reusable Form Component ───────────────────────────
// Used by BOTH Create and Edit pages.
//
// WHY a shared component?
//   Create and Edit have identical fields — only two things differ:
//   1. Create starts with empty values; Edit prefills from DB.
//   2. Create calls POST; Edit calls PUT.
//   DRY principle: one form, two usages.
//
// CONTROLLED INPUTS:
//   Every input's value comes from `form` state. onChange updates state.
//   This gives: validation on every keystroke, easy reset, predictable renders.
//
// PROPS:
//   initialValues  — empty obj for Create, DB record for Edit
//   onSubmit(data) — parent calls POST or PUT depending on context
//   loading        — disables submit button during API call
//   submitLabel    — "Create Listing" or "Save Changes"
// ─────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { Loader2, X, ImagePlus, Trash2 } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { uploadImage, removeImageFromStorage, parseStoragePath } from '../../lib/storage';
import './RoomListingForm.css';

const ROOM_TYPES = ['Single', 'Double Sharing', 'Triple Sharing', '4-Bed Dorm', 'AC Room', 'Non-AC Room'];
const AMENITY_OPTIONS = ['WiFi', 'AC', 'Food', 'Laundry', 'Geyser', 'Parking', 'CCTV', 'Study Table', 'Power Backup'];
const GENDER_OPTIONS = [
  { value: 'boys',   label: '👦 Boys Only' },
  { value: 'girls',  label: '👧 Girls Only' },
  { value: 'unisex', label: '🤝 Unisex' },
];
const MAX_IMAGES = 6;

const EMPTY_FORM = {
  title: '',
  roomType: '',
  genderPreference: 'unisex',
  price: '',
  securityDeposit: '',
  totalBeds: '1',
  availableBeds: '1',
  floor: '',
  amenities: [],
  images: [],
  description: '',
  isActive: true,
};

function toFormValues(record) {
  if (!record) return EMPTY_FORM;
  return {
    title:            record.title            ?? '',
    roomType:         record.roomType         ?? '',
    genderPreference: record.genderPreference ?? 'unisex',
    price:            record.price            != null ? String(record.price) : '',
    securityDeposit:  record.securityDeposit  != null ? String(record.securityDeposit) : '',
    totalBeds:        record.totalBeds        != null ? String(record.totalBeds) : '1',
    availableBeds:    record.availableBeds    != null ? String(record.availableBeds) : '1',
    floor:            record.floor            != null ? String(record.floor) : '',
    amenities:        record.amenities        ?? [],
    images:           record.images           ?? [],
    description:      record.description      ?? '',
    isActive:         record.isActive         ?? true,
  };
}

export default function RoomListingForm({ initialValues = null, onSubmit, loading = false, submitLabel = 'Save' }) {
  const { provider } = useProvider();
  const [form, setForm]           = useState(() => toFormValues(initialValues));
  const [imgUploading, setImgUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ── Field handlers ────────────────────────────────────────────────────
  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(amenity) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }

  // ── Image upload ──────────────────────────────────────────────────────
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
          providerId:  provider.phone,   // use phone as folder key (stable ID)
          listingId:   'draft',
          serviceType: 'pg',
          imageId:     String(Date.now()),
        });
        results.push(publicUrl);
      } catch {
        // Skip failed images silently — partial uploads are OK
      }
    }

    if (results.length > 0) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...results] }));
    }
    setImgUploading(false);
  }, [form.images.length, provider.phone]);

  function removeImage(url) {
    setForm(prev => ({ ...prev, images: prev.images.filter(u => u !== url) }));
    // Best-effort: try to remove from Supabase storage (non-blocking)
    const { path } = parseStoragePath(url);
    if (path) removeImageFromStorage(url).catch(() => {});
  }

  // ── Submit ────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      title:            form.title.trim(),
      description:      form.description.trim() || null,
      roomType:         form.roomType,
      genderPreference: form.genderPreference,
      price:            parseFloat(form.price) || 0,
      securityDeposit:  form.securityDeposit ? parseFloat(form.securityDeposit) : null,
      totalBeds:        parseInt(form.totalBeds, 10) || 1,
      availableBeds:    parseInt(form.availableBeds, 10) || 0,
      floor:            form.floor ? parseInt(form.floor, 10) : null,
      amenities:        form.amenities,
      images:           form.images,
      isActive:         form.isActive,
    });
  }

  const isValid = form.title.trim() && form.roomType && form.price;

  return (
    <form className="rlf-form" onSubmit={handleSubmit} id="room-listing-form">

      {/* ── Title ──────────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Room Details</h3>

        <div className="rlf-field">
          <label className="rlf-label" htmlFor="rlf-title">Room Title</label>
          <input
            id="rlf-title"
            className="rlf-input"
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Single AC Room with Study Table"
            maxLength={200}
            required
          />
        </div>

        {/* Room type chips */}
        <div className="rlf-field">
          <label className="rlf-label">Room Type</label>
          <div className="rlf-chips">
            {ROOM_TYPES.map(rt => (
              <button
                key={rt}
                type="button"
                className={`rlf-chip ${form.roomType === rt ? 'rlf-chip--active' : ''}`}
                onClick={() => set('roomType', rt)}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Pricing</h3>
        <div className="rlf-row-2">
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-price">Rent / Month (₹)</label>
            <input
              id="rlf-price"
              className="rlf-input"
              type="number"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="e.g. 8500"
              min="0"
              required
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-deposit">
              Security Deposit (₹)
              <span className="rlf-optional">Optional</span>
            </label>
            <input
              id="rlf-deposit"
              className="rlf-input"
              type="number"
              value={form.securityDeposit}
              onChange={e => set('securityDeposit', e.target.value)}
              placeholder="e.g. 10000"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* ── Occupancy ──────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Occupancy & Availability</h3>
        <div className="rlf-row-3">
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-total">Total Beds</label>
            <input
              id="rlf-total"
              className="rlf-input"
              type="number"
              value={form.totalBeds}
              onChange={e => set('totalBeds', e.target.value)}
              min="1" max="20"
            />
          </div>
          <div className="rlf-field">
            <label className="rlf-label" htmlFor="rlf-avail">Available Beds</label>
            <input
              id="rlf-avail"
              className="rlf-input"
              type="number"
              value={form.availableBeds}
              onChange={e => set('availableBeds', e.target.value)}
              min="0" max="20"
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

        {/* Available beds warning */}
        {form.availableBeds === '0' || form.availableBeds === 0 ? (
          <div className="rlf-warn">
            ⚠️ 0 available beds — this listing will be marked <strong>FULL</strong> and hidden from students.
          </div>
        ) : null}
      </div>

      {/* ── Gender Preference ──────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Gender Preference</h3>
        <div className="rlf-gender-row">
          {GENDER_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`rlf-gender-btn ${form.genderPreference === opt.value ? 'rlf-gender-btn--active' : ''}`}
            >
              <input
                type="radio"
                name="gender"
                value={opt.value}
                checked={form.genderPreference === opt.value}
                onChange={() => set('genderPreference', opt.value)}
                className="rlf-radio-hidden"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Amenities ──────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Amenities</h3>
        <div className="rlf-chips">
          {AMENITY_OPTIONS.map(a => (
            <button
              key={a}
              type="button"
              className={`rlf-chip ${form.amenities.includes(a) ? 'rlf-chip--active' : ''}`}
              onClick={() => toggleAmenity(a)}
            >
              {form.amenities.includes(a) ? '✓ ' : ''}{a}
            </button>
          ))}
        </div>
      </div>

      {/* ── Description ────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Description</h3>
        <div className="rlf-field">
          <label className="rlf-label" htmlFor="rlf-desc">
            About this room
            <span className="rlf-optional">Optional</span>
          </label>
          <textarea
            id="rlf-desc"
            className="rlf-input rlf-textarea"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the room, rules, nearby landmarks, etc."
            rows={4}
            maxLength={2000}
          />
          <span className="rlf-char-count">{form.description.length}/2000</span>
        </div>
      </div>

      {/* ── Images ─────────────────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Photos ({form.images.length}/{MAX_IMAGES})</h3>

        <div className="rlf-images-grid">
          {form.images.map((url, i) => (
            <div key={i} className="rlf-img-thumb">
              <img src={url} alt={`Room ${i + 1}`} />
              <button
                type="button"
                className="rlf-img-remove"
                onClick={() => removeImage(url)}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {form.images.length < MAX_IMAGES && (
            <button
              type="button"
              className="rlf-img-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={imgUploading}
            >
              {imgUploading
                ? <Loader2 size={20} className="rlf-spinner" />
                : <ImagePlus size={20} />
              }
              <span>{imgUploading ? 'Uploading…' : 'Add Photo'}</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="rlf-file-hidden"
          onChange={e => handleImageFiles(e.target.files)}
        />
      </div>

      {/* ── Visibility toggle ──────────────────────────────────── */}
      <div className="rlf-section">
        <h3 className="rlf-section-title">Listing Visibility</h3>
        <label className="rlf-toggle-row" htmlFor="rlf-active">
          <div>
            <p className="rlf-toggle-label">{form.isActive ? 'Active — students can see this' : 'Closed — hidden from students'}</p>
            <p className="rlf-toggle-hint">You can change this at any time from the My Services page</p>
          </div>
          <div
            className={`rlf-toggle-pill ${form.isActive ? 'rlf-toggle-pill--on' : ''}`}
            onClick={() => set('isActive', !form.isActive)}
            role="switch"
            aria-checked={form.isActive}
            id="rlf-active"
          >
            <div className="rlf-toggle-knob" />
          </div>
        </label>
      </div>

      {/* ── Submit ─────────────────────────────────────────────── */}
      <button
        type="submit"
        className="rlf-submit"
        disabled={loading || !isValid || imgUploading}
      >
        {loading
          ? <><Loader2 size={18} className="rlf-spinner" /> Saving…</>
          : submitLabel
        }
      </button>
    </form>
  );
}
