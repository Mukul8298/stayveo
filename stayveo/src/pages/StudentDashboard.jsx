import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Briefcase,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Home,
  Loader,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { getUserBookings } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

const ACTIVE_STATUSES = new Set(['NEW', 'ACCEPTED', 'IN_PROGRESS', 'new', 'accepted', 'in_progress']);

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return 'Date pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStatus(status) {
  return String(status || 'new').replace(/_/g, ' ').toLowerCase();
}

function MySpaceCard({ icon, tone = 'green', eyebrow, title, meta, children, actionLabel, onClick }) {
  const clickable = Boolean(onClick);

  return (
    <article
      className={`dash-card dash-card-${tone} ${clickable ? 'is-clickable' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (clickable && (event.key === 'Enter' || event.key === ' ')) onClick();
      }}
    >
      <div className="dash-card-icon">{icon}</div>
      <div className="dash-card-body">
        <h3>{eyebrow}</h3>
        <p className="dash-card-title">{title}</p>
        {meta && <span className="dash-card-meta">{meta}</span>}
        {children}
      </div>
      {actionLabel ? <span className="dash-card-action">{actionLabel}</span> : <ChevronRight size={18} className="dash-chevron" />}
    </article>
  );
}

function EmptyMySpace({ onBrowseRooms, onBrowseServices }) {
  return (
    <section className="dash-empty-state">
      <div className="dash-empty-visual">
        <div className="dash-empty-orbit dash-empty-orbit-one" />
        <div className="dash-empty-orbit dash-empty-orbit-two" />
        <Home size={46} />
      </div>
      <h2>No active bookings yet</h2>
      <p>Once you reserve a room or service, your space will appear here.</p>
      <div className="dash-empty-actions">
        <button className="dash-primary-btn" onClick={onBrowseRooms}>
          <Search size={18} /> Browse Rooms
        </button>
        <button className="dash-secondary-btn" onClick={onBrowseServices}>
          <Briefcase size={18} /> Browse Services
        </button>
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(Boolean(authState?.userId));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!authState?.userId) {
      return;
    }

    let cancelled = false;

    getUserBookings(authState.userId, { page: 1, limit: 10 })
      .then((response) => {
        if (!cancelled) {
          setBookings(response?.data?.items || []);
          setLoadFailed(false);
        }
      })
      .catch((error) => {
        console.error('My Space bookings load failed:', error);
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authState?.userId]);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => ACTIVE_STATUSES.has(booking.status)),
    [bookings]
  );
  const activeRoomBooking = activeBookings.find((booking) => /pg|room/i.test(booking.serviceType || booking.service_type || ''));
  const activeServices = activeBookings.filter((booking) => !/pg|room/i.test(booking.serviceType || booking.service_type || ''));
  const hasRoommate = false;
  const hasContent = Boolean(activeRoomBooking || hasRoommate || activeServices.length);

  return (
    <div className="page page-padded dash-page" id="student-dashboard">
      <div className="dash-header">
        <div>
          <h1>My Space</h1>
          <p>Everything in one place</p>
        </div>
        <span className="dash-header-pill"><ShieldCheck size={14} /> Student hub</span>
      </div>

      {loading && (
        <div className="dash-loading">
          <Loader size={22} className="spinning" />
          <span>Loading your space...</span>
        </div>
      )}

      {!loading && !hasContent && (
        <>
          <EmptyMySpace onBrowseRooms={() => navigate('/search')} onBrowseServices={() => navigate('/services')} />
          {loadFailed && (
            <p className="dash-load-note">We could not refresh bookings right now. You can still browse rooms and services.</p>
          )}
        </>
      )}

      {!loading && hasContent && (
        <div className="dash-card-stack">
          {activeRoomBooking && (
            <MySpaceCard
              icon={<BedDouble size={21} />}
              eyebrow="Active Room"
              title={activeRoomBooking.serviceType || activeRoomBooking.roomType || 'Room reservation'}
              meta={<><MapPin size={12} /> {formatStatus(activeRoomBooking.status)} • {formatCurrency(activeRoomBooking.price)}</>}
              onClick={() => activeRoomBooking.roomId && navigate(`/room/${activeRoomBooking.roomId}`)}
            >
              <div className="dash-booking-row">
                <CalendarClock size={14} />
                <span>{formatDate(activeRoomBooking.bookingDate)} · {activeRoomBooking.bookingTime || 'Time pending'}</span>
              </div>
            </MySpaceCard>
          )}

          <MySpaceCard
            icon={<Users size={21} />}
            tone="purple"
            eyebrow="Roommate Match"
            title="Find a compatible roommate"
            meta="Match by lifestyle, budget, food, and study habits"
            actionLabel="Explore"
            onClick={() => navigate('/roommate')}
          />

          <section className="dash-section">
            <div className="dash-section-title">Active Services</div>
            {activeServices.length ? activeServices.map((service) => (
              <MySpaceCard
                key={service.id}
                icon={<Briefcase size={21} />}
                tone="blue"
                eyebrow={service.serviceType || 'Service'}
                title={service.roomType || service.notes || 'Active service'}
                meta={`${formatStatus(service.status)} • ${formatCurrency(service.price)}`}
              />
            )) : (
              <div className="dash-soft-card">
                <Sparkles size={18} />
                <div>
                  <h4>No active services</h4>
                  <p>Book tiffin, laundry, or cleaning when you need them.</p>
                </div>
                <button onClick={() => navigate('/services')}>Browse</button>
              </div>
            )}
          </section>

          {activeRoomBooking && (
            <MySpaceCard
              icon={<CreditCard size={21} />}
              tone="orange"
              eyebrow="Upcoming Payments"
              title="Property charges are paid directly"
              meta={`${formatCurrency(activeRoomBooking.price)} reservation recorded`}
              actionLabel="View"
            />
          )}
        </div>
      )}
    </div>
  );
}
