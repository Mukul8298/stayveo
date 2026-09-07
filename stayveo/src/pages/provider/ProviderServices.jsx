import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BedDouble, Building2, Eye, EyeOff, Loader2, MapPin, Plus, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoomListings, toggleRoomListing } from '../../api/provider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderServices.css';

function validImage(value) {
  return typeof value === 'string' && /^(https?:\/\/|data:image\/)/.test(value);
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export default function ProviderServices() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [togglingId, setTogglingId] = useState('');

  const loadListings = useCallback(async () => {
    if (!provider.phone) {
      setListings([]);
      setLoadError('Provider authentication is missing. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const response = await getRoomListings(provider.phone);
      setListings(response?.data || []);
    } catch (error) {
      console.error('Failed to load provider properties:', error);
      setLoadError(error.message || 'Unable to load your properties.');
    } finally {
      setLoading(false);
    }
  }, [provider.phone]);

  useEffect(() => {
    queueMicrotask(() => void loadListings());
  }, [loadListings]);

  const stats = useMemo(() => ({
    totalManaged: listings.length,
    activeListings: listings.filter((item) => item.isActive === true).length,
    totalRooms: listings.reduce((sum, item) => sum + number(item.totalRooms ?? item.roomCount ?? 1), 0),
  }), [listings]);

  async function handleToggle(item) {
    const nextActive = item.isActive === false;
    setTogglingId(item.id);
    try {
      const response = await toggleRoomListing(provider.phone, item.id, nextActive);
      const updated = response?.data;
      setListings((current) => current.map((listing) => listing.id === item.id ? { ...listing, ...(updated || {}), isActive: nextActive } : listing));
      toast.success(nextActive ? 'Listing visible to students' : 'Listing hidden from students');
    } catch (error) {
      toast.error(error.message || 'Could not update listing visibility');
    } finally {
      setTogglingId('');
    }
  }

  return (
    <main className="ps-page" id="provider-services-root">
      <header className="ps-page-header">
        <div>
          <span className="ps-kicker"><Building2 size={15} /> Property management</span>
          <h1>Services</h1>
          <p>Manage the properties, beds, and visibility connected to your provider account.</p>
        </div>
        <div className="ps-header-actions">
          <button className="ps-refresh" type="button" onClick={() => void loadListings()} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Refresh</button>
          <button className="ps-add-property" type="button" onClick={() => navigate('/provider/listing/create')}><Plus size={17} /> Add property</button>
        </div>
      </header>

      <section className="ps-stats-grid" aria-label="Property statistics">
        <Stat label="Total managed" value={stats.totalManaged} />
        <Stat label="Active listings" value={stats.activeListings} tone="green" />
        <Stat label="Total rooms" value={stats.totalRooms} />
        <Stat label="Waitlist" value="—" />
      </section>

      {loading ? (
        <section className="ps-state-card"><Loader2 size={28} className="spinning" /><p>Loading your properties...</p></section>
      ) : loadError ? (
        <section className="ps-state-card ps-state-card--error"><AlertCircle size={28} /><h2>Unable to load properties</h2><p>{loadError}</p><button type="button" onClick={() => void loadListings()}>Try again</button></section>
      ) : listings.length === 0 ? (
        <section className="ps-state-card"><Building2 size={30} /><h2>No properties yet</h2><p>Add a room listing to start managing beds and reservations.</p><button type="button" onClick={() => navigate('/provider/listing/create')}>Add property</button></section>
      ) : (
        <section className="ps-listings" aria-label="Provider properties">
          {listings.map((item) => <PropertyCard key={item.id} item={item} onToggle={() => void handleToggle(item)} toggling={togglingId === item.id} onManageBeds={() => navigate('/provider/manage-beds')} onEdit={() => navigate(`/provider/listing/${item.id}/edit`)} />)}
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, tone = '' }) {
  return <article className={`ps-stat-card ${tone ? `ps-stat-card--${tone}` : ''}`}><span>{label}</span><strong>{String(value).padStart(2, '0')}</strong></article>;
}

function PropertyCard({ item, onToggle, toggling, onManageBeds, onEdit }) {
  const image = item.images?.find(validImage);
  const totalBeds = number(item.totalBeds);
  const availableBeds = number(item.availableBeds);
  const reservedBeds = number(item.reservedBeds);
  const occupiedBeds = number(item.occupiedBeds);
  const status = String(item.status || '').toLowerCase();
  const visible = item.isActive === true;
  return (
    <article className={`ps-property-card ${visible ? '' : 'ps-property-card--disabled'}`}>
      <div className="ps-property-image">
        {image ? <img src={image} alt={item.title || 'Property'} /> : <div className="ps-property-image-placeholder"><Building2 size={32} /></div>}
        <span>{item.roomType || 'Property'}</span>
      </div>
      <div className="ps-property-body">
        <div className="ps-property-topline">
          <div><h2>{item.title || 'Untitled property'}</h2><p className="ps-property-address"><MapPin size={14} /> {item.address || 'Address not provided'}</p></div>
          <div className="ps-visibility-control"><span>{visible ? <><Eye size={13} /> Visible</> : <><EyeOff size={13} /> Hidden</>}</span><button type="button" className={`ps-switch ${visible ? 'is-on' : ''}`} onClick={onToggle} disabled={toggling} aria-label={`${visible ? 'Hide' : 'Show'} ${item.title || 'property'}`}><span /></button></div>
        </div>
        <div className="ps-property-divider" />
        <div className="ps-property-metrics">
          <Metric label="Rooms" value={number(item.totalRooms ?? item.roomCount ?? 1)} />
          <Metric label="Total beds" value={totalBeds} />
          <Metric label="Available" value={availableBeds} tone="green" />
          <Metric label="Reserved" value={reservedBeds} tone="orange" />
          <Metric label="Occupied" value={occupiedBeds} tone="blue" />
        </div>
        <div className="ps-property-footer">
          <span className={`ps-full-state ${status === 'full' || availableBeds === 0 ? 'is-full' : ''}`}><BedDouble size={14} /> {status === 'full' || availableBeds === 0 ? 'No beds available' : `${availableBeds} bed${availableBeds === 1 ? '' : 's'} available`}</span>
          <div className="ps-property-actions"><button type="button" onClick={onEdit}>Edit</button><button type="button" onClick={onManageBeds}><Settings2 size={14} /> Manage beds</button></div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, tone = '' }) {
  return <div className={`ps-metric ${tone ? `ps-metric--${tone}` : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}
