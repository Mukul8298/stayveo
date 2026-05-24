// ─── Business Details Page ────────────────────────────────────────────────
// Allows providers to edit their business name, address, contact & description.
//
// FORM STATE PATTERN:
//   1. Mount → fetch current data → prefill form fields
//   2. Provider edits → local state updates (controlled inputs)
//   3. Save → PUT request → success toast → navigate back
//   4. Error → toast + button re-enabled (never silent failure)
//
// WHY controlled inputs?
//   React's "controlled input" pattern means the input value is always
//   driven by state. This gives us: validation on keypress, easy reset,
//   and predictable re-renders. Uncontrolled inputs (using refs) are only
//   for edge cases like file uploads.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Phone, FileText, Loader2, Save } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { getProviderBusinessDetails, updateProviderBusinessDetails } from '../../api/provider';
import './ProviderBusinessDetails.css';

export default function ProviderBusinessDetails() {
  const navigate = useNavigate();
  const { provider, updateProvider } = useProvider();
  const toast = useToast();

  // ── Form state ─────────────────────────────────────────────────────────
  // Each field mirrors a DB column on providerProfile.
  // We initialize with '' so inputs are always controlled (never undefined).
  const [form, setForm] = useState({
    name:          '',
    businessName:  '',
    address:       '',
    contactNumber: '',
    description:   '',
    email:         '',
  });

  // ── UI state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);   // initial fetch
  const [saving, setSaving]   = useState(false);   // PUT request in progress
  const [dirty, setDirty]     = useState(false);   // has the user changed anything?

  // ── Fetch current details on mount ────────────────────────────────────
  // This is the "prefill" step. We fetch from the DB so the form shows
  // what's actually saved — not stale localStorage data.
  useEffect(() => {
    if (!provider.phone) return;

    async function fetchDetails() {
      try {
        const res = await getProviderBusinessDetails(provider.phone);
        const d = res.data;
        setForm({
          name:          d.name          ?? '',
          businessName:  d.businessName  ?? '',
          address:       d.address       ?? '',
          contactNumber: d.contactNumber ?? '',
          description:   d.description   ?? '',
          email:         d.email         ?? '',
        });
      } catch {
        toast.error('Could not load business details');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [provider.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle input change ────────────────────────────────────────────────
  // One generic handler for all fields — cleaner than 6 individual ones.
  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  // ── Handle save ───────────────────────────────────────────────────────
  // PUT /api/provider/business-details
  // On success: update ProviderContext so profile card name updates immediately.
  async function handleSave() {
    if (!dirty) return; // No changes → don't waste a network call

    try {
      setSaving(true);

      // Only send non-empty fields. Empty string means "clear this field".
      const payload = {
        name:          form.name         || undefined,
        businessName:  form.businessName  || undefined,
        address:       form.address       || undefined,
        contactNumber: form.contactNumber || undefined,
        description:   form.description   || undefined,
        email:         form.email         || undefined,
      };

      const res = await updateProviderBusinessDetails(provider.phone, payload);

      // Optimistic update: sync the new name back into ProviderContext
      // so the profile card shows the updated name without a page refresh.
      if (res.data?.name) {
        updateProvider({ name: res.data.name });
      }

      toast.success('Business details saved!');
      setDirty(false);
      navigate(-1); // Go back to profile
    } catch (err) {
      toast.error(err.message || 'Failed to save details');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pbd-page" id="provider-business-details">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Business Details</h1>
        </div>
        <div className="pbd-loading">
          <Loader2 size={24} className="pbd-spinner" />
          <p>Loading details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pbd-page" id="provider-business-details">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Business Details</h1>
      </div>

      <div className="pbd-content">
        {/* ── Hero Section ──────────────────────────────────────── */}
        <div className="pbd-hero">
          <div className="pbd-hero-icon">
            <Building2 size={28} />
          </div>
          <div>
            <h2>Your Business Profile</h2>
            <p>This information is shown to students on your listings</p>
          </div>
        </div>

        {/* ── Form Fields ───────────────────────────────────────── */}
        <div className="pbd-section">
          <h3 className="pbd-section-title">Basic Information</h3>

          <div className="pbd-field">
            <label htmlFor="pbd-name" className="pbd-label">
              Your Name
            </label>
            <input
              id="pbd-name"
              type="text"
              className="pbd-input"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              maxLength={200}
            />
          </div>

          <div className="pbd-field">
            <label htmlFor="pbd-businessName" className="pbd-label">
              Business Name
              <span className="pbd-label-hint">Optional</span>
            </label>
            <input
              id="pbd-businessName"
              type="text"
              className="pbd-input"
              value={form.businessName}
              onChange={e => handleChange('businessName', e.target.value)}
              placeholder="e.g. Rajesh PG & Accommodation"
              maxLength={200}
            />
          </div>

          <div className="pbd-field">
            <label htmlFor="pbd-email" className="pbd-label">
              Email Address
              <span className="pbd-label-hint">Optional</span>
            </label>
            <input
              id="pbd-email"
              type="email"
              className="pbd-input"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="e.g. rajesh@example.com"
            />
          </div>
        </div>

        <div className="pbd-section">
          <h3 className="pbd-section-title">Location & Contact</h3>

          <div className="pbd-field">
            <label htmlFor="pbd-address" className="pbd-label">
              <MapPin size={14} className="pbd-label-icon" />
              Business Address
            </label>
            <textarea
              id="pbd-address"
              className="pbd-input pbd-textarea"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="e.g. 42, MG Road, Near Gate 3, North Campus"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="pbd-field">
            <label htmlFor="pbd-contact" className="pbd-label">
              <Phone size={14} className="pbd-label-icon" />
              Contact Number
            </label>
            <input
              id="pbd-contact"
              type="tel"
              className="pbd-input"
              value={form.contactNumber}
              onChange={e => handleChange('contactNumber', e.target.value)}
              placeholder="e.g. +91 98765 43210"
              maxLength={20}
            />
          </div>
        </div>

        <div className="pbd-section">
          <h3 className="pbd-section-title">About Your Business</h3>

          <div className="pbd-field">
            <label htmlFor="pbd-description" className="pbd-label">
              <FileText size={14} className="pbd-label-icon" />
              Description
              <span className="pbd-label-hint">Optional</span>
            </label>
            <textarea
              id="pbd-description"
              className="pbd-input pbd-textarea pbd-textarea--lg"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Tell students about your business, what makes you unique, your rules and offerings…"
              rows={5}
              maxLength={1000}
            />
            <span className="pbd-char-count">{form.description.length}/1000</span>
          </div>
        </div>

        {/* ── Save Button ────────────────────────────────────────── */}
        <div className="pbd-footer">
          <button
            className="pbd-save-btn"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <><Loader2 size={18} className="pbd-spinner" /> Saving…</>
            ) : (
              <><Save size={18} /> Save Changes</>
            )}
          </button>

          {!dirty && !saving && (
            <p className="pbd-no-changes">No unsaved changes</p>
          )}
        </div>
      </div>
    </div>
  );
}
