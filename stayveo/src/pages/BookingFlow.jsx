import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import { listings } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createBooking } from '../api/booking';
import './BookingFlow.css';

const timeSlots = ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'];

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const toast = useToast();
  const room = listings.find(l => l.id === +id) || listings[0];

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
        student_name: authState?.name || localStorage.getItem('userName') || 'Student',
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

  return (
    <div className="booking-page" id="booking-flow">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Book Room</h1>
      </div>
      <div className="booking-room-preview">
        <img src={room?.images?.[0]} alt={room?.title || 'Room'} />
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
