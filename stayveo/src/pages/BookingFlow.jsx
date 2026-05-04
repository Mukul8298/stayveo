import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import { listings } from '../data/mockData';
import './BookingFlow.css';

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const room = listings.find(l => l.id === +id) || listings[0];
  const [step, setStep] = useState(0);
  const [moveIn, setMoveIn] = useState('2026-06-01');

  if (step === 2) {
    return (
      <div className="booking-success" id="booking-confirmed">
        <div className="booking-success-icon"><CheckCircle2 size={64} /></div>
        <h1>Booking Confirmed!</h1>
        <p>Your room at {room.title} is booked</p>
        <div className="booking-success-details">
          <div className="bsd-row"><span>Move-in Date</span><strong>{moveIn}</strong></div>
          <div className="bsd-row"><span>Monthly Rent</span><strong>₹{room.price.toLocaleString()}</strong></div>
          <div className="bsd-row"><span>Booking ID</span><strong>#CN{Math.floor(Math.random() * 9000 + 1000)}</strong></div>
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
        <img src={room.images[0]} alt={room.title} />
        <div><h3>{room.title}</h3><p>₹{room.price.toLocaleString()}/month</p></div>
      </div>

      {step === 0 && (
        <div className="booking-step">
          <h2>Select Move-in Date</h2>
          <div className="booking-date-input">
            <Calendar size={18} />
            <input type="date" value={moveIn} onChange={e => setMoveIn(e.target.value)} />
          </div>
          <Button variant="primary" fullWidth size="lg" onClick={() => setStep(1)}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="booking-step">
          <h2>Price Breakdown</h2>
          <div className="booking-breakdown">
            <div className="bb-row"><span>Monthly Rent</span><span>₹{room.price.toLocaleString()}</span></div>
            <div className="bb-row"><span>Security Deposit</span><span>₹{(room.price * 2).toLocaleString()}</span></div>
            <div className="bb-row"><span>Platform Fee</span><span>₹499</span></div>
            <div className="bb-divider" />
            <div className="bb-row bb-total"><span>Total Due Now</span><span>₹{(room.price * 3 + 499).toLocaleString()}</span></div>
          </div>
          <Button variant="accent" fullWidth size="lg" onClick={() => setStep(2)}>Confirm Booking</Button>
        </div>
      )}
    </div>
  );
}
