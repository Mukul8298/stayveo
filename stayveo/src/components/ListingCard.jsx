import { useNavigate } from 'react-router-dom';
import { MapPin, Wifi, UtensilsCrossed, WashingMachine, Sparkles, BadgeCheck, Heart } from 'lucide-react';
import Rating from './Rating';
import './ListingCard.css';

const serviceIcons = {
  wifi: <Wifi size={12} />, food: <UtensilsCrossed size={12} />,
  laundry: <WashingMachine size={12} />, cleaning: <Sparkles size={12} />,
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop';

export default function ListingCard({ listing, variant = 'horizontal' }) {
  const navigate = useNavigate();
  const {
    id, title = 'PG Room', price = 0, distance = 0,
    rating = 0, reviews = 0, verified, images = [], services, roomType
  } = listing || {};

  const imgSrc = images?.[0] || FALLBACK_IMG;

  return (
    <div className={`listing-card listing-card-${variant}`} onClick={() => navigate(`/room/${id}`)} id={`listing-${id}`}>
      <div className="listing-card-image">
        <img
          src={imgSrc}
          alt={title}
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
        />
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
          <span className="listing-distance"><MapPin size={12} /> {distance ?? '?'} km</span>
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
