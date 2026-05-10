import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Wifi, UtensilsCrossed, WashingMachine, Sparkles, Star, Phone, Eye, X, Calendar, Clock } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';
import Rating from '../components/Rating';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { listings } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createVisitRequest, recordProfileView } from '../api/booking';
import './RoomDetail.css';

const serviceMap = { wifi: { icon: <Wifi size={16}/>, name: 'WiFi' }, food: { icon: <UtensilsCrossed size={16}/>, name: 'Food' }, laundry: { icon: <WashingMachine size={16}/>, name: 'Laundry' }, cleaning: { icon: <Sparkles size={16}/>, name: 'Cleaning' } };

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM',
];

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const toast = useToast();
  const room = listings.find(l => l.id === +id) || listings[0];

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  const handleVisitSubmit = async () => {
    if (!visitDate || !visitTime) {
      toast.error('Please select date and time');
      return;
    }
    if (!authState?.userId) {
      toast.error('Please login first');
      navigate('/');
      return;
    }
    setVisitSubmitting(true);
    try {
      await createVisitRequest(authState.userId, {
        booking_id: crypto.randomUUID(), // temp ID since no booking yet
        provider_id: room.providerId || crypto.randomUUID(),
        visit_date: visitDate,
        visit_time: visitTime,
        instructions: `Visit scheduled for ${room?.title || 'PG Room'}. Contact owner before arriving.`,
      });
      toast.success('Visit request sent successfully!');
      setShowVisitModal(false);
      setVisitDate('');
      setVisitTime('');
    } catch (err) {
      console.error('Visit request failed:', err);
      toast.error(err?.message || 'Failed to send visit request');
    } finally {
      setVisitSubmitting(false);
    }
  };

  return (
    <div className="room-detail" id="room-detail">
      <div className="room-detail-header">
        <button className="rd-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <div className="rd-header-actions">
          <button className="rd-btn"><Share2 size={18} /></button>
          <button className="rd-btn"><Heart size={18} /></button>
        </div>
      </div>

      <ImageCarousel images={room.images} />

      <div className="rd-body">
        <div className="rd-top">
          <div>
            <h1 className="rd-title">{room?.title || 'PG Room'}</h1>
            <p className="rd-address"><MapPin size={14} /> {room?.address || 'Address not available'}</p>
          </div>
          {room?.verified && <div className="verified-badge"><BadgeCheck size={14} /> Verified</div>}
        </div>

        <div className="rd-price-row">
          <div className="rd-price">₹{(room?.price || 0).toLocaleString()}<span>/month</span></div>
          <Chip variant="distance" icon={<MapPin size={11} />}>{room?.distance || '?'} km from campus</Chip>
        </div>

        <div className="rd-section">
          <h3>Services Included</h3>
          <div className="rd-services">
            {(room?.services || []).map(s => (
              <div key={s} className="rd-service-item">{serviceMap[s]?.icon}<span>{serviceMap[s]?.name || s}</span></div>
            ))}
          </div>
        </div>

        <div className="rd-section">
          <h3>Amenities</h3>
          <div className="rd-amenities">{(room?.amenities || []).map(a => <Chip key={a} variant="primary">{a}</Chip>)}</div>
        </div>

        <div className="rd-section">
          <h3>About</h3>
          <p className="rd-desc">{room?.description || 'No description available.'}</p>
        </div>

        <div className="rd-section">
          <h3>Reviews</h3>
          <div className="rd-reviews-summary">
            <div className="rd-rating-big"><Star size={24} fill="#F59E0B" stroke="#F59E0B" /><span>{room?.rating || '--'}</span></div>
            <span className="rd-review-count">{room?.reviews || 0} reviews</span>
          </div>
          <div className="rd-review">
            <div className="rd-reviewer"><span className="rd-reviewer-avatar">👨‍🎓</span><div><p className="rd-reviewer-name">Vikram S.</p><p className="rd-reviewer-date">2 weeks ago</p></div></div>
            <p className="rd-review-text">Great place! Clean rooms and excellent food. Walking distance from campus gate. Highly recommended.</p>
          </div>
        </div>

        <div className="rd-section">
          <h3>Location</h3>
          <div className="rd-map">
            <div className="rd-map-placeholder"><MapPin size={32} /><p>Map Preview</p><span>{room?.distance || '?'} km from IIT Delhi</span></div>
          </div>
        </div>

        {/* ─── Owner Section with Visit + Call buttons ─────────────── */}
        <div className="rd-owner">
          <div className="rd-owner-info">
            <span className="rd-owner-avatar">👤</span>
            <div><p className="rd-owner-name">{room?.owner || 'Property Owner'}</p><p className="rd-owner-label">Property Owner</p></div>
          </div>
          <div className="rd-owner-actions">
            <button className="rd-visit-btn" onClick={() => setShowVisitModal(true)}>
              <Eye size={14} /> Visit for Review
            </button>
            <button className="rd-call"><Phone size={16} /> Call</button>
          </div>
        </div>
      </div>

      {/* ─── Sticky Footer (above bottom nav) ──────────────────── */}
      <div className="rd-sticky-footer">
        <div className="rd-footer-price">₹{(room?.price || 0).toLocaleString()}<span>/mo</span></div>
        <Button variant="accent" size="lg" onClick={() => navigate(`/booking/${room.id}`)}>Book Now</Button>
      </div>

      {/* ─── Visit Request Modal ───────────────────────────────── */}
      {showVisitModal && (
        <>
          <div className="overlay" onClick={() => setShowVisitModal(false)} />
          <div className="rd-visit-modal">
            <div className="rd-visit-modal-header">
              <h2>📋 Schedule Visit</h2>
              <button onClick={() => setShowVisitModal(false)}><X size={20} /></button>
            </div>

            <div className="rd-visit-modal-info">
              <p><strong>PG:</strong> {room?.title || 'PG Room'}</p>
              <p><strong>Owner:</strong> {room?.owner || 'Property Owner'}</p>
              <p><strong>Price:</strong> ₹{(room?.price || 0).toLocaleString()}/month</p>
            </div>

            <div className="rd-visit-field">
              <label><Calendar size={14} /> Select Visit Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
              />
            </div>

            <div className="rd-visit-field">
              <label><Clock size={14} /> Select Time Slot</label>
              <div className="rd-visit-time-grid">
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    className={`rd-visit-time-slot ${visitTime === slot ? 'active' : ''}`}
                    onClick={() => setVisitTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="rd-visit-instructions">
              <h3><MapPin size={14} /> Visit Instructions</h3>
              <ul>
                <li>📍 Contact the PG owner before arriving</li>
                <li>🪪 Carry a valid ID proof (College ID)</li>
                <li>⏰ Be on time for your scheduled slot</li>
                <li>📱 Keep your phone charged for directions</li>
                <li>🚫 No entry without prior confirmation</li>
              </ul>
            </div>

            <button
              className="rd-visit-submit"
              onClick={handleVisitSubmit}
              disabled={!visitDate || !visitTime || visitSubmitting}
            >
              {visitSubmitting ? 'Scheduling...' : '✅ Schedule Visit'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
