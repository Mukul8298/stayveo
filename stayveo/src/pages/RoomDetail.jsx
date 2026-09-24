import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Wifi, UtensilsCrossed, Star, Phone, X, Loader, UserRound, BedDouble } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { fetchPGListings } from '../api/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RoomDetailMap from '../components/maps/RoomDetailMap';
import { getCollegeById } from '../api/colleges';
import { calculateDistanceKm, formatDistance } from '../utils/calculateDistance';
import { useSavedListings } from '../api/client';
import './RoomDetail.css';

// ── RoomDetail ──────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mock data import — fetches PG details from Supabase
// - Uses AbortController for safe async cleanup
// - Handles missing room gracefully (shows "not found" state)
// ────────────────────────────────────────────────────────────────────────

const serviceMap = { wifi: { icon: <Wifi size={16}/>, name: 'WiFi' }, food: { icon: <UtensilsCrossed size={16}/>, name: 'Food' } };

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
  const { isSaved, savingIds, toggleSaved } = useSavedListings(authState?.userId);

  // ── Fetch room from real database ──────────────────────────────────
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeOverlay, setActiveOverlay] = useState('none');
  const callTriggerRef = useRef(null);
  const overlayReturnRef = useRef(null);
  const callSheetRef = useRef(null);

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

  // Gallery preview state
  const [previewImage, setPreviewImage] = useState(null);
  const isInteractionOverlayOpen = activeOverlay !== 'none';
  const roomSaved = room ? isSaved(room.id) : false;
  const roomSaving = room ? savingIds.has(String(room.id)) : false;

  const openOverlay = (overlay, triggerRef) => {
    overlayReturnRef.current = triggerRef?.current || document.activeElement;
    setActiveOverlay(overlay);
  };

  const closeOverlay = () => {
    setActiveOverlay('none');
  };

  const handleFavoriteClick = async () => {
    if (!authState?.userId) {
      toast.error('Please login first');
      return;
    }
    if (!room?.id) return;

    try {
      const result = await toggleSaved(room);
      toast.success(result.saved ? 'Listing saved' : 'Listing removed');
    } catch (err) {
      console.error('RoomDetail: saved listing toggle failed:', err);
      toast.error(err?.message || 'Failed to update saved listing');
    }
  };

  useEffect(() => {
    if (!isInteractionOverlayOpen) {
      overlayReturnRef.current?.focus?.();
      overlayReturnRef.current = null;
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const sheet = callSheetRef.current;
    requestAnimationFrame(() => {
      const firstFocusable = sheet?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable || sheet)?.focus?.();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (event.key !== 'Tab' || !sheet) return;

      const focusable = Array.from(
        sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.disabled && element.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) {
        event.preventDefault();
        sheet.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOverlay, isInteractionOverlayOpen]);

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
          <button className="rd-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={20} /></button>
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
  const availableBeds = Number.isFinite(Number(room?.availableBeds)) ? Number(room.availableBeds) : null;

  return (
    <div className={`room-detail ${isInteractionOverlayOpen ? 'rd-overlay-open' : ''}`} id="room-detail">
      <div className="room-detail-header">
        <button className="rd-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={20} /></button>
        <div className="rd-header-actions">
          <button className="rd-btn" aria-label="Share listing"><Share2 size={18} /></button>
          <button
            className="rd-btn"
            aria-label={roomSaved ? 'Unsave listing' : 'Save listing'}
            aria-pressed={roomSaved}
            onClick={handleFavoriteClick}
            disabled={roomSaving}
          >
            <Heart size={18} fill={roomSaved ? 'currentColor' : 'none'} />
          </button>
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

          <div className="rd-capacity-card" aria-label="Room bed capacity">
            <span className="rd-capacity-icon"><BedDouble size={19} /></span>
            <div>
              <span className="rd-capacity-label">No. of Beds</span>
              <strong>{availableBeds === null ? 'Availability unavailable' : `${availableBeds} bed${availableBeds === 1 ? '' : 's'} available`}</strong>
            </div>
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
            <div className="rd-reviewer"><span className="rd-reviewer-avatar"><UserRound size={18} /></span><div><p className="rd-reviewer-name">Vikram S.</p><p className="rd-reviewer-date">2 weeks ago</p></div></div>
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

        {/* ─── Owner Section with Call action ──────────────────────── */}
        <div className="rd-owner">
          <div className="rd-owner-info">
            <span className="rd-owner-avatar"><UserRound size={18} /></span>
            <div><p className="rd-owner-name">{room?.owner || 'Property Owner'}</p><p className="rd-owner-label">Property Owner</p></div>
          </div>
          <div className="rd-owner-actions">
            <button
              ref={callTriggerRef}
              className="rd-call"
              onClick={() => openOverlay('call', callTriggerRef)}
            >
              <Phone size={16} /> Call
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sticky Footer (above bottom nav) ──────────────────── */}
      <div className={`rd-sticky-footer ${isInteractionOverlayOpen ? 'is-hidden' : ''}`} aria-hidden={isInteractionOverlayOpen}>
        <div className="rd-footer-price">₹{(room?.price || 0).toLocaleString()}<span>/mo</span></div>
        <Button variant="accent" size="lg" onClick={() => navigate(`/booking/${room.id}`)}>Reserve Slot</Button>
      </div>

      {activeOverlay === 'call' && (
        <>
          <div className="overlay" onClick={closeOverlay} />
          <div
            ref={callSheetRef}
            className="rd-call-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rd-call-title"
            tabIndex={-1}
          >
            <div className="rd-call-handle" />
            <div className="rd-call-header">
              <div>
                <h2 id="rd-call-title">Call Property Owner</h2>
                <p>{room?.owner || 'Property Owner'}</p>
              </div>
              <button onClick={closeOverlay} aria-label="Close call sheet"><X size={20} /></button>
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
            <button className="rd-preview-close" onClick={() => setPreviewImage(null)} aria-label="Close image preview">
              <X size={24} />
            </button>
            <img src={previewImage} alt="Full preview" className="rd-preview-img" />
          </div>
        </>
      )}
    </div>
  );
}
