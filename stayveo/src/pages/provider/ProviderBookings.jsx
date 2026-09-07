import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  DollarSign,
  MapPin,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { getCurrentProviderBookings, updateBookingStatus } from '../../api/booking';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import './ProviderBookings.css';

const STATUS_LABELS = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status) {
  return STATUS_LABELS[String(status || '').toUpperCase()] || String(status || 'Unknown').replace(/_/g, ' ');
}

function BookingStatus({ status }) {
  const key = String(status || '').toLowerCase();
  return <span className={`pb-status pb-status--${key}`}>{statusLabel(status)}</span>;
}

function BookingValue({ label, children, wide = false }) {
  return (
    <div className={`pb-value ${wide ? 'pb-value--wide' : ''}`}>
      <span>{label}</span>
      <strong>{children || 'Not available'}</strong>
    </div>
  );
}

export default function ProviderBookings() {
  const { provider } = useProvider();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const loadBookings = useCallback(async () => {
    if (!provider.phone) {
      setBookings([]);
      setLoading(false);
      setLoadError('Provider authentication is missing. Please sign in again.');
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const response = await getCurrentProviderBookings(provider.phone, { limit: 100 });
      setBookings(response?.data?.items || []);
    } catch (error) {
      console.error('Failed to load provider bookings:', error);
      setLoadError(error.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [provider.phone]);

  useEffect(() => {
    queueMicrotask(() => void loadBookings());
  }, [loadBookings]);

  async function changeStatus(booking, nextStatus) {
    if (updatingId) return;

    setUpdatingId(booking.id);
    try {
      await updateBookingStatus(booking.id, nextStatus, provider.phone);
      toast.success(`Booking marked ${statusLabel(nextStatus)}`);
      await loadBookings();
      setSelectedBooking(null);
    } catch (error) {
      toast.error(error.message || 'Could not update booking status');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <main className="pb-page" id="provider-bookings">
      <header className="pb-page-header">
        <div>
          <span className="pb-kicker"><Building2 size={15} /> Property reservations</span>
          <h1>Bookings</h1>
          <p>Every reservation connected to your properties, with payment and student details.</p>
        </div>
        <button className="pb-refresh" type="button" onClick={() => void loadBookings()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} /> Refresh
        </button>
      </header>

      {loading ? (
        <section className="pb-state-card"><RefreshCw size={26} className="spinning" /><p>Loading bookings...</p></section>
      ) : loadError ? (
        <section className="pb-state-card pb-state-card--error">
          <AlertCircle size={28} />
          <h2>Unable to load bookings</h2>
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadBookings()}>Try again</button>
        </section>
      ) : bookings.length === 0 ? (
        <section className="pb-state-card">
          <CalendarDays size={30} />
          <h2>No bookings yet</h2>
          <p>Successful student reservations will appear here automatically.</p>
        </section>
      ) : (
        <section className="pb-booking-list" aria-label="Provider bookings">
          {bookings.map((booking) => {
            const property = booking.property || {};
            const student = booking.student || {};
            const payment = booking.payment || {};
            const status = String(booking.status || '').toUpperCase();
            return (
            <article
                className="pb-booking-card"
                key={booking.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBooking(booking)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedBooking(booking);
                }}
              >
                <div className="pb-booking-card-main">
                  <div className="pb-student-block">
                    <span className="pb-avatar"><UserRound size={19} /></span>
                    <div>
                      <h2>{student.name || booking.studentName || 'Student'}</h2>
                      <span className="pb-muted-id">Reservation {booking.reservationId || 'Pending payment'}</span>
                    </div>
                  </div>
                  <div className="pb-property-block">
                    <strong>{property.name || 'Property details pending'}</strong>
                    <span><MapPin size={13} /> {property.address || 'Address not available'}</span>
                    <span><BedDouble size={13} /> {booking.room?.type || booking.roomType || 'Room'}</span>
                  </div>
                  <div className="pb-booking-meta">
                    <span className="pb-meta-label">Booking date</span>
                    <strong>{formatDate(booking.bookingDate)}</strong>
                    <BookingStatus status={booking.status} />
                  </div>
                  <div className="pb-payment-block">
                    <span className="pb-meta-label">Amount paid</span>
                    <strong>{formatCurrency(booking.amountPaid || payment.amount || 0)}</strong>
                    <span>{String(booking.paymentStatus || payment.status || 'PENDING').toLowerCase()}</span>
                  </div>
                </div>
                <div className="pb-booking-card-footer">
                  <span>Booking ID <b>{booking.id}</b></span>
                  <div className="pb-card-actions">
                    {['NEW', 'PENDING', 'ACCEPTED'].includes(status) && (
                      <button
                        className="pb-action pb-action--accept"
                        type="button"
                        onClick={(event) => { event.stopPropagation(); void changeStatus(booking, 'in_progress'); }}
                        disabled={updatingId === booking.id}
                        aria-busy={updatingId === booking.id}
                      >
                        Start Service
                      </button>
                    )}
                    {status === 'IN_PROGRESS' && (
                      <>
                        <button
                          className="pb-action pb-action--accept"
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void changeStatus(booking, 'completed'); }}
                          disabled={updatingId === booking.id}
                          aria-busy={updatingId === booking.id}
                        >
                          <Check size={15} /> Completed
                        </button>
                        <button
                          className="pb-action pb-action--reject"
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void changeStatus(booking, 'rejected'); }}
                          disabled={updatingId === booking.id}
                          aria-busy={updatingId === booking.id}
                        >
                          <X size={15} /> Rejected
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedBooking && <BookingDetail booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </main>
  );
}

function BookingDetail({ booking, onClose }) {
  const property = booking.property || {};
  const student = booking.student || {};
  const payment = booking.payment || {};
  return (
    <div className="pb-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pb-detail-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
        <header className="pb-detail-header">
          <div><span className="pb-kicker">Reservation details</span><h2 id="booking-detail-title">{property.name || 'Booking details'}</h2></div>
          <button type="button" className="pb-close" onClick={onClose} aria-label="Close booking details"><X size={20} /></button>
        </header>
        <div className="pb-detail-id-row"><span>Reservation ID</span><strong>{booking.reservationId || 'Pending payment'}</strong></div>
        <div className="pb-detail-sections">
          <section><h3><UserRound size={16} /> Student</h3><div className="pb-detail-grid"><BookingValue label="Name">{student.name || booking.studentName}</BookingValue><BookingValue label="Phone"><a href={student.phone ? `tel:${student.phone}` : undefined}>{student.phone || 'Not available'}</a></BookingValue><BookingValue label="Email">{student.email || 'Not available'}</BookingValue></div></section>
          <section><h3><Building2 size={16} /> Property</h3><div className="pb-detail-grid"><BookingValue label="PG / property">{property.name}</BookingValue><BookingValue label="Address" wide>{property.address}</BookingValue><BookingValue label="Room">{booking.room?.type || booking.roomType}</BookingValue><BookingValue label="Bed">{booking.numberOfBeds || 1}</BookingValue></div></section>
          <section><h3><CalendarDays size={16} /> Booking</h3><div className="pb-detail-grid"><BookingValue label="Booking ID" wide>{booking.id}</BookingValue><BookingValue label="Booking date">{formatDate(booking.bookingDate)}</BookingValue><BookingValue label="Visit Date">{formatDate(booking.moveInDate)}</BookingValue><BookingValue label="Status"><BookingStatus status={booking.status} /></BookingValue></div></section>
          <section><h3><DollarSign size={16} /> Payment</h3><div className="pb-detail-grid"><BookingValue label="Reservation fee">{formatCurrency(booking.reservationFee)}</BookingValue><BookingValue label="Platform fee">{formatCurrency(booking.platformFee)}</BookingValue><BookingValue label="Total paid">{formatCurrency(booking.amountPaid || payment.amount)}</BookingValue><BookingValue label="Payment status">{String(booking.paymentStatus || payment.status || 'PENDING').toLowerCase()}</BookingValue><BookingValue label="Transaction ID" wide>{booking.transactionId || payment.transactionId}</BookingValue><BookingValue label="Payment date">{formatDate(booking.paymentDate || payment.createdAt)}</BookingValue><BookingValue label="Monthly rent">{formatCurrency(booking.monthlyRent)}</BookingValue><BookingValue label="Security deposit">{formatCurrency(booking.securityDeposit)}</BookingValue><BookingValue label="Minimum stay">{booking.minimumStayMonths || 1} month(s)</BookingValue></div></section>
        </div>
      </section>
    </div>
  );
}
