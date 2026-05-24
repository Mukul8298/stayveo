// ─── Create Room Listing Page ──────────────────────────────────────────────
// Thin page wrapper around RoomListingForm.
//
// COMPONENT REUSE PATTERN:
//   This page and ProviderEditListing.jsx both import RoomListingForm.
//   The ONLY differences:
//   1. Create passes empty initialValues; Edit passes DB values.
//   2. Create calls createRoomListing (POST); Edit calls updateRoomListing (PUT).
//   The form itself is 100% identical — zero duplication.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { createRoomListing } from '../../api/provider';
import RoomListingForm from './RoomListingForm';
import './ProviderCreateListing.css';

export default function ProviderCreateListing() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleCreate(data) {
    try {
      setSaving(true);
      await createRoomListing(provider.phone, data);
      toast.success('Room listing created!');
      navigate('/provider/services', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create listing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pcl-page" id="provider-create-listing">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Add New Room</h1>
      </div>

      <div className="pcl-hero">
        <div className="pcl-hero-icon">
          <PlusCircle size={28} />
        </div>
        <div>
          <h2>Create a Room Listing</h2>
          <p>Add details, pricing, and photos to attract students</p>
        </div>
      </div>

      <div className="pcl-content">
        <RoomListingForm
          onSubmit={handleCreate}
          loading={saving}
          submitLabel="Create Listing"
        />
      </div>
    </div>
  );
}
