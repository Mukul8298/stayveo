// ─── Edit Room Listing Page ────────────────────────────────────────────────
// Same RoomListingForm as Create, but:
//   1. Fetches existing record on mount (useEffect + getRoomListing)
//   2. Passes DB values as initialValues → form is prefilled
//   3. On save calls PUT instead of POST
//
// EDIT PREFILL ARCHITECTURE:
//   - Mount → loading=true → fetch from backend → set initialValues → render form
//   - Why not pass via location.state? Because direct URL access (bookmark,
//     refresh) would lose the state. Always fetch from the backend on mount.
//   - This is the standard pattern used by Airbnb's host dashboard.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Loader2, Trash2 } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { getRoomListing, updateRoomListing, deleteRoomListing } from '../../api/provider';
import RoomListingForm from './RoomListingForm';
import './ProviderEditListing.css';

export default function ProviderEditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { provider } = useProvider();
  const toast = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ── Fetch existing listing on mount ─────────────────────────────────
  useEffect(() => {
    if (!provider.phone || !id) return;

    async function fetch() {
      try {
        const res = await getRoomListing(provider.phone, id);
        setListing(res.data);
      } catch (err) {
        toast.error('Could not load listing');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [provider.phone, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle update ───────────────────────────────────────────────────
  async function handleUpdate(data) {
    try {
      setSaving(true);
      await updateRoomListing(provider.phone, id, data);
      toast.success('Listing updated!');
      navigate('/provider/services', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  }

  // ── Handle delete ──────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Are you sure? This listing will be closed and hidden from students.')) return;
    try {
      await deleteRoomListing(provider.phone, id);
      toast.success('Listing removed');
      navigate('/provider/services', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to remove listing');
    }
  }

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pel-page" id="provider-edit-listing">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Edit Room</h1>
        </div>
        <div className="pel-loading">
          <Loader2 size={24} className="pel-spinner" />
          <p>Loading listing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pel-page" id="provider-edit-listing">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Edit Room</h1>
        <button className="pel-delete-btn" onClick={handleDelete} title="Delete this listing">
          <Trash2 size={18} />
        </button>
      </div>

      {/* ── Status badge ──────────────────────────────────────── */}
      {listing && (
        <div className="pel-status-bar">
          <span className={`pel-status pel-status--${listing.status?.toLowerCase()}`}>
            {listing.status}
          </span>
          <span className="pel-beds-label">
            {listing.availableBeds}/{listing.totalBeds} beds available
          </span>
        </div>
      )}

      <div className="pel-hero">
        <div className="pel-hero-icon">
          <Edit3 size={24} />
        </div>
        <div>
          <h2>Update Listing</h2>
          <p>Changes are saved directly to your live listing</p>
        </div>
      </div>

      <div className="pel-content">
        <RoomListingForm
          initialValues={listing}
          onSubmit={handleUpdate}
          loading={saving}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
