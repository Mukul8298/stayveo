import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Loader2, Loader } from 'lucide-react';
import Button from '../components/Button';
import { fetchPGListings, FALLBACK_IMAGE } from '../api/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createBooking } from '../api/booking';
import './BookingFlow.css';

// ── BookingFlow ─────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mock data import — fetches from real Supabase data
// - Uses displayName from AuthContext instead of raw localStorage
// - Added loading state while fetching room data
// ────────────────────────────────────────────────────────────────────────

const timeSlots = ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'];

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState, displayName } = useAuth();
  const toast = useToast();

  // Fetch room from real data
  const [room, setRoom] = useState(null);
  const [roomLoading, setRoomLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data, aborted } = await fetchPGListings({ signal: controller.signal });
        if (aborted) return;
        const found = (data || []).find(l => String(l.id) === String(id));
        setRoom(found || null);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('BookingFlow: fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setRoomLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  const [step, setStep] = useState(0);
  const [moveIn, setMoveIn] = useState('');
  const [moveInTime, setMoveInTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const handleConfirmBooking = async () => {
    if (!moveIn) { toast.error('Please select a move-in date'); return; }
    if (!authState?.userId) { toast.error('Please login first'); navigate('/'); return; }

    setSubmitting(true);
    try {
      const res = await createBooking(authState.userId, {
        provider_id: room?.providerId || crypto.randomUUID(),
        room_id: room?.roomId || undefined,
        service_type: 'PG Room',
        room_type: room?.type || 'Single',
        booking_date: moveIn,
        booking_time: moveInTime || '10:00 AM',
        price: room?.price || 0,
        // Use displayName from AuthContext (handles old users properly)
        student_name: displayName || authState?.name || 'Student',
        student_phone: authState?.phone || '',
        notes: `Booking for ${room?.title || 'PG Room'}`,
      });
      setBookingId(res?.data?.id?.slice(0, 8) || Math.floor(Math.random() * 9000 + 1000));
      toast.success('Booking confirmed!');
      setStep(2);
    } catch (err) {
      console.error('Booking failed:', err);
      toast.error(err?.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (roomLoading) {
    return (
      <div className="booking-page" id="booking-flow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader size={24} className="spinning" />
      </div>
    );
  }

  // Room not found
  if (!room) {
    return (
      <div className="booking-page" id="booking-flow">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <h1>Book Room</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
          <h3>Room not found</h3>
          <p>This listing may have been removed.</p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="booking-success" id="booking-confirmed">
        <div className="booking-success-icon"><CheckCircle2 size={64} /></div>
        <h1>Booking Confirmed!</h1>
        <p>Your room at {room?.title || 'PG'} is booked</p>
        <div className="booking-success-details">
          <div className="bsd-row"><span>Move-in Date</span><strong>{moveIn}</strong></div>
          <div className="bsd-row"><span>Time</span><strong>{moveInTime || '10:00 AM'}</strong></div>
          <div className="bsd-row"><span>Monthly Rent</span><strong>₹{(room?.price || 0).toLocaleString()}</strong></div>
          <div className="bsd-row"><span>Booking ID</span><strong>#{bookingId}</strong></div>
        </div>
        <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/dashboard')}>Go to My Space</Button>
      </div>
    );
  }

  // Image source with fallback
  const imgSrc = room?.images?.[0] || FALLBACK_IMAGE;

  return (
    <div className="booking-page" id="booking-flow">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Book Room</h1>
      </div>
      <div className="booking-room-preview">
        <img
          src={imgSrc}
          alt={room?.title || 'Room'}
          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
        />
        <div><h3>{room?.title || 'PG Room'}</h3><p>₹{(room?.price || 0).toLocaleString()}/month</p></div>
      </div>

      {step === 0 && (
        <div className="booking-step">
          <h2>Select Move-in Date</h2>
          <div className="booking-date-input">
            <Calendar size={18} />
            <input
              type="date"
              value={moveIn}
              onChange={e => setMoveIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <h2 style={{ marginTop: 16 }}>Preferred Time</h2>
          <div className="booking-time-grid">
            {timeSlots.map(slot => (
              <button
                key={slot}
                className={`booking-time-slot ${moveInTime === slot ? 'active' : ''}`}
                onClick={() => setMoveInTime(slot)}
              >
                <Clock size={12} /> {slot}
              </button>
            ))}
          </div>

          <Button variant="primary" fullWidth size="lg" onClick={() => setStep(1)}
            disabled={!moveIn}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="booking-step">
          <h2>Price Breakdown</h2>
          <div className="booking-breakdown">
            <div className="bb-row"><span>Monthly Rent</span><span>₹{(room?.price || 0).toLocaleString()}</span></div>
            <div className="bb-row"><span>Security Deposit</span><span>₹{((room?.price || 0) * 2).toLocaleString()}</span></div>
            <div className="bb-row"><span>Platform Fee</span><span>₹499</span></div>
            <div className="bb-divider" />
            <div className="bb-row bb-total"><span>Total Due Now</span><span>₹{((room?.price || 0) * 3 + 499).toLocaleString()}</span></div>
          </div>
          <Button variant="accent" fullWidth size="lg" onClick={handleConfirmBooking}
            disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="spin" /> Processing...</> : 'Confirm Booking'}
          </Button>
        </div>
      )}
    </div>
  );
}
