import { useCallback, useEffect, useMemo, useState } from 'react';
import { BedDouble, Building2, CircleAlert, Loader2, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adjustRoomListingInventory, getRoomListings } from '../../api/provider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderManageBeds.css';

const asNumber = (value) => Math.max(0, Number(value) || 0);

function normaliseListing(listing) {
  const totalBeds = asNumber(listing.totalBeds ?? listing.numberOfBeds ?? 1);
  const reservedBeds = asNumber(listing.reservedBeds);
  const occupiedBeds = asNumber(listing.occupiedBeds);
  const blockedBeds = asNumber(listing.blockedBeds);
  const offlineBeds = asNumber(listing.offlineBeds);
  const availableBeds = asNumber(listing.availableBeds ?? totalBeds);
  return { ...listing, totalBeds, availableBeds, reservedBeds, occupiedBeds, blockedBeds, offlineBeds };
}

export default function ProviderManageBeds() {
  const navigate = useNavigate();
  const toast = useToast();
  const { provider } = useProvider();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState('');

  const loadListings = useCallback(async () => {
    if (!provider.phone) {
      setListings([]);
      setLoading(false);
      setLoadError('Provider authentication is missing. Please sign in again.');
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const response = await getRoomListings(provider.phone);
      setListings((response.data || []).map(normaliseListing));
    } catch (error) {
      setLoadError(error.message || 'Could not load bed inventory');
    } finally {
      setLoading(false);
    }
  }, [provider.phone]);

  useEffect(() => { queueMicrotask(() => void loadListings()); }, [loadListings]);

  const totals = useMemo(() => listings.reduce((summary, listing) => {
    summary.total += listing.totalBeds;
    summary.available += listing.availableBeds;
    summary.reserved += listing.reservedBeds;
    summary.occupied += listing.occupiedBeds;
    return summary;
  }, { total: 0, available: 0, reserved: 0, occupied: 0 }), [listings]);

  async function adjustCapacity(listing, delta) {
    setSavingId(listing.id);
    try {
      await adjustRoomListingInventory(provider.phone, listing.id, delta);
      await loadListings();
      toast.success(delta > 0 ? 'Bed added to inventory' : 'Bed removed from inventory');
    } catch (error) {
      toast.error(error.message || 'Could not update bed inventory');
    } finally {
      setSavingId('');
    }
  }

  return (
    <main className="mb-page" id="provider-manage-beds">
      <section className="mb-heading"><div><h1>Manage beds</h1><p>Capacity changes are checked against reserved and occupied beds on the server.</p></div><button className="mb-add-property" type="button" onClick={() => navigate('/provider/add-property')}><Plus size={18} /> Add property</button></section>
      <section className="mb-overview" aria-label="Bed inventory overview"><OverviewCard label="Total beds" value={totals.total} tone="neutral" /><OverviewCard label="Available" value={totals.available} tone="available" /><OverviewCard label="Reserved" value={totals.reserved} tone="reserved" /><OverviewCard label="Occupied" value={totals.occupied} tone="occupied" /></section>
      {loading ? <section className="mb-loading"><Loader2 size={24} className="mb-spin" /><span>Loading bed inventory</span></section> : loadError ? <section className="mb-empty mb-error-state"><CircleAlert size={26} /><h2>Could not load bed inventory</h2><p>{loadError}</p><button type="button" onClick={() => void loadListings()}>Try again</button></section> : listings.length === 0 ? <section className="mb-empty"><BedDouble size={26} /><h2>No room inventory yet</h2><p>Add a property with room types to start managing beds.</p><button type="button" onClick={() => navigate('/provider/add-property')}>Add property</button></section> : <section className="mb-list" aria-label="Room bed inventory">{listings.map((listing) => <InventoryCard key={listing.id} listing={listing} saving={savingId === listing.id} onAdjust={(delta) => void adjustCapacity(listing, delta)} />)}</section>}
    </main>
  );
}

function OverviewCard({ label, value, tone }) {
  return <article className={`mb-overview-card mb-overview-card--${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function InventoryCard({ listing, saving, onAdjust }) {
  const minimumTotal = listing.reservedBeds + listing.occupiedBeds + listing.blockedBeds + listing.offlineBeds;
  return <article className="mb-listing"><header className="mb-listing-head"><div className="mb-listing-title"><span className="mb-building"><Building2 size={19} /></span><div><h2>{listing.title}</h2><p>{listing.roomType} <span aria-hidden="true">/</span> {listing.numberOfBeds || 1} bed{Number(listing.numberOfBeds || 1) === 1 ? '' : 's'} per room</p></div></div><div className="mb-total-beds"><span>Total beds</span><div className="mb-capacity-stepper"><button type="button" onClick={() => onAdjust(-1)} disabled={saving || listing.totalBeds <= Math.max(1, minimumTotal)} aria-label="Remove one bed"><Minus size={16} /></button><strong>{listing.totalBeds}</strong><button type="button" onClick={() => onAdjust(1)} disabled={saving} aria-label="Add one bed"><Plus size={16} /></button></div></div></header><div className="mb-bed-grid mb-bed-grid--summary"><BedState label="Available" value={listing.availableBeds} tone="available" /><BedState label="Reserved" value={listing.reservedBeds} tone="reserved" /><BedState label="Occupied" value={listing.occupiedBeds} tone="occupied" /></div><footer className="mb-listing-footer"><span className="mb-allocation-note"><CircleAlert size={15} /> {listing.availableBeds > 0 ? `${listing.availableBeds} bed${listing.availableBeds === 1 ? '' : 's'} can be reserved now` : 'No beds are currently available'}</span>{saving && <span className="mb-saving-note"><Loader2 size={15} className="mb-spin" /> Updating inventory</span>}</footer></article>;
}

function BedState({ label, value, tone }) {
  return <div className={`mb-state mb-state--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}
