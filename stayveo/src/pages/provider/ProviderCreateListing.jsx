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
import {
  Bell,
  Plus,
  PlusCircle,
  LayoutDashboard,
  ClipboardList,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Wrench,
} from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { createRoomListing } from '../../api/provider';
import RoomListingForm from './RoomListingForm';
import './ProviderCreateListing.css';

export default function ProviderCreateListing() {
  const navigate = useNavigate();
  const { provider, clearProvider } = useProvider();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const providerName = provider?.name || 'Manager';
  const firstName = providerName.split(' ')[0] || 'Manager';

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

  function handleLogout() {
    clearProvider();
    navigate('/role-select');
  }

  return (
    <div className="pcl-content-wrap" id="provider-create-listing">
      <main className="pcl-main">
        <section className="pcl-hero" aria-labelledby="pcl-title">
          <h1 id="pcl-title">List your property</h1>
        </section>

        <div className="pcl-content">
          <RoomListingForm
            onSubmit={handleCreate}
            loading={saving}
            submitLabel="Save Property"
          />
        </div>
      </main>
    </div>
  );
}
