import { useNavigate } from 'react-router-dom';
import { MapPin, Wifi, UtensilsCrossed, WashingMachine, Sparkles, BadgeCheck, Heart } from 'lucide-react';
import Rating from './Rating';
import './ListingCard.css';

const serviceIcons = {
  wifi: <Wifi size={12} />, food: <UtensilsCrossed size={12} />,
  laundry: <WashingMachine size={12} />, cleaning: <Sparkles size={12} />,
};

export default function ListingCard({ listing, variant = 'horizontal' }) {
  const navigate = useNavigate();
  const { id, title, price, distance, rating, reviews, verified, images, services, roomType } = listing;

  return (
    <div className={`listing-card listing-card-${variant}`} onClick={() => navigate(`/room/${id}`)} id={`listing-${id}`}>
      <div className="listing-card-image">
        <img src={images[0]} alt={title} loading="lazy" />
        {verified && (
          <span className="listing-badge"><BadgeCheck size={12} /> Verified</span>
        )}
        <button className="listing-fav" onClick={e => { e.stopPropagation(); }}>
          <Heart size={18} />
        </button>
        <div className="listing-price-tag">₹{price.toLocaleString()}<span>/mo</span></div>
      </div>
      <div className="listing-card-info">
        <h3 className="listing-title">{title}</h3>
        <div className="listing-meta">
          <span className="listing-distance"><MapPin size={12} /> {distance} km</span>
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
