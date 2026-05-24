import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Wifi, UtensilsCrossed, WashingMachine, Sparkles, Star, Phone, Eye, X, Calendar, Clock, Loader } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';
import Rating from '../components/Rating';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { fetchPGListings } from '../api/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createVisitRequest, recordProfileView } from '../api/booking';
import RoomDetailMap from '../components/maps/RoomDetailMap';
import { getCollegeById } from '../api/colleges';
import { calculateDistanceKm, formatDistance } from '../utils/calculateDistance';
import './RoomDetail.css';

// ── RoomDetail ──────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mock data import — fetches PG details from Supabase
// - Uses AbortController for safe async cleanup
// - Handles missing room gracefully (shows "not found" state)
// ────────────────────────────────────────────────────────────────────────

const serviceMap = { wifi: { icon: <Wifi size={16}/>, name: 'WiFi' }, food: { icon: <UtensilsCrossed size={16}/>, name: 'Food' }, laundry: { icon: <WashingMachine size={16}/>, name: 'Laundry' }, cleaning: { icon: <Sparkles size={16}/>, name: 'Cleaning' } };

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM',
];

function getStoredCollegeCoordinates() {
  const latitude = Number(localStorage.getItem('selectedCollegeLatitude'));
  const longitude = Number(localStorage.getItem('selectedCollegeLongitude'));

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  return null;
}

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const toast = useToast();

  // ── Fetch room from real database ──────────────────────────────────
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCallSheet, setShowCallSheet] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        let college = getStoredCollegeCoordinates();
        const collegeId = localStorage.getItem('userCollegeId') || localStorage.getItem('selectedCollegeId');
        if (!college && collegeId) {
          college = await getCollegeById(collegeId, { signal: controller.signal });
          if (college?.latitude && college?.longitude) {
            localStorage.setItem('selectedCollegeLatitude', String(college.latitude));
            localStorage.setItem('selectedCollegeLongitude', String(college.longitude));
          }
        }

        const { data, aborted } = await fetchPGListings({ signal: controller.signal });
        if (aborted) return;
        // Find the room by ID (try numeric and string match)
        const found = (data || []).find(l => String(l.id) === String(id));
        if (found && college) {
          const distanceKm = calculateDistanceKm(college.latitude, college.longitude, found.latitude, found.longitude);
          setRoom({
            ...found,
            distance: distanceKm,
            distanceKm,
            distanceLabel: formatDistance(distanceKm),
          });
        } else {
          setRoom(found || null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('RoomDetail: fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  // Gallery preview state
  const [previewImage, setPreviewImage] = useState(null);

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

  // Loading state
  if (loading) {
    return (
      <div className="room-detail" id="room-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader size={24} className="spinning" />
      </div>
    );
  }

  // Room not found
  if (!room) {
    return (
      <div className="room-detail" id="room-detail">
        <div className="room-detail-header">
          <button className="rd-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
          <h3>Room not found</h3>
          <p>This listing may have been removed or is unavailable.</p>
        </div>
      </div>
    );
  }

  const extraImages = room?.images ? room.images.slice(1) : [];
  const providerPhone = room?.providerPhone || 'Phone number unavailable';
  const canCallProvider = Boolean(room?.providerPhone);

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
          <Chip variant="distance" icon={<MapPin size={11} />}>{room?.distanceLabel || 'Distance unavailable'}</Chip>
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

        {extraImages.length > 0 && (
          <div className="rd-section">
            <h3>Gallery</h3>
            <div className="rd-gallery-stack">
              {extraImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="rd-gallery-card"
                  onClick={() => setPreviewImage(imgUrl)}
                >
                  <img src={imgUrl} alt={`Property view ${idx + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rd-section">
          <h3>Location</h3>
          <RoomDetailMap latitude={room?.latitude} longitude={room?.longitude} address={room?.address} />
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
            <button className="rd-call" onClick={() => setShowCallSheet(true)}><Phone size={16} /> Call</button>
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

      {showCallSheet && (
        <>
          <div className="overlay" onClick={() => setShowCallSheet(false)} />
          <div className="rd-call-sheet">
            <div className="rd-call-handle" />
            <div className="rd-call-header">
              <div>
                <h2>Call Property Owner</h2>
                <p>{room?.owner || 'Property Owner'}</p>
              </div>
              <button onClick={() => setShowCallSheet(false)}><X size={20} /></button>
            </div>
            <a
              className={`rd-call-number ${!canCallProvider ? 'disabled' : ''}`}
              href={canCallProvider ? `tel:${room.providerPhone}` : undefined}
            >
              <Phone size={18} />
              {providerPhone}
            </a>
          </div>
        </>
      )}

      {/* ─── Image Preview Modal ───────────────────────────────── */}
      {previewImage && (
        <>
          <div className="overlay" onClick={() => setPreviewImage(null)} style={{ zIndex: 1000 }} />
          <div className="rd-preview-modal" style={{ zIndex: 1001 }}>
            <button className="rd-preview-close" onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
            <img src={previewImage} alt="Full preview" className="rd-preview-img" />
          </div>
        </>
      )}
    </div>
  );
}
