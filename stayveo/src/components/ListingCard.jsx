import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wifi, UtensilsCrossed, WashingMachine, Sparkles, BadgeCheck, Heart } from 'lucide-react';
import Rating from './Rating';
import './ListingCard.css';

// ── ListingCard ─────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Enhanced image error handling with progressive fallback
// - Validates image URLs before rendering
// - Shows a styled placeholder instead of broken image icons
// - Handles missing/malformed listing data defensively
// ────────────────────────────────────────────────────────────────────────

const serviceIcons = {
  wifi: <Wifi size={12} />, food: <UtensilsCrossed size={12} />,
  laundry: <WashingMachine size={12} />, cleaning: <Sparkles size={12} />,
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop';

// ── CSS-based placeholder for when all images fail ──────────────────────
const PLACEHOLDER_STYLE = {
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  color: '#94a3b8',
  borderRadius: 'inherit',
};

export default function ListingCard({ listing, variant = 'horizontal' }) {
  const navigate = useNavigate();

  // Defensive destructuring — handle completely missing listing
  const {
    id, title = 'PG Room', price = 0, distance = 0,
    distanceLabel, rating = 0, reviews = 0, verified, images = [], services, roomType
  } = listing || {};
  const safeDistanceLabel = distanceLabel || (Number.isFinite(distance) ? `${distance}km` : 'Distance unavailable');

  // ── Image handling with progressive fallback ────────────────────────
  // 1. Try the first image from the listing
  // 2. On error, try the FALLBACK_IMG (Unsplash)
  // 3. If even fallback fails, show a CSS placeholder
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Select the first valid image from the images array
  const primaryImage = images?.find(img => img && typeof img === 'string' && img.trim()) || null;
  const imgSrc = primaryImage || FALLBACK_IMG;

  const handleImgError = useCallback((e) => {
    if (!imgError) {
      // First error: try the fallback image
      console.warn(`🖼️ ListingCard: image failed for "${title}":`, e.target.src?.substring(0, 80));
      e.target.onerror = null; // Prevent infinite loop
      e.target.src = FALLBACK_IMG;
      setImgError(true);
    } else {
      // Fallback also failed — show CSS placeholder
      setFallbackError(true);
    }
  }, [imgError, title]);

  return (
    <div className={`listing-card listing-card-${variant}`} onClick={() => navigate(`/room/${id}`)} id={`listing-${id}`}>
      <div className="listing-card-image">
        {fallbackError ? (
          // All images failed — show styled placeholder
          <div style={PLACEHOLDER_STYLE} aria-label="No image available">
            🏠
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={title}
            loading="lazy"
            onError={handleImgError}
          />
        )}
        {verified && (
          <span className="listing-badge"><BadgeCheck size={12} /> Verified</span>
        )}
        <button className="listing-fav" onClick={e => { e.stopPropagation(); }}>
          <Heart size={18} />
        </button>
        <div className="listing-price-tag">₹{(price || 0).toLocaleString()}<span>/mo</span></div>
      </div>
      <div className="listing-card-info">
        <h3 className="listing-title">{title}</h3>
        <div className="listing-meta">
          <span className="listing-distance"><MapPin size={12} /> {safeDistanceLabel}</span>
          <Rating value={rating} count={reviews} />
        </div>
        <div className="listing-services">
          {services?.map(s => (
            <span key={s} className="listing-service-icon" title={s}>
              {serviceIcons[s]}
            </span>
          ))}
          <span className="listing-room-type">{roomType === 'shared' ? 'Shared' : 'Single'}</span>
        </div>
      </div>
    </div>
  );
}
