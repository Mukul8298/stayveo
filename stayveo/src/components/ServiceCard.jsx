import { MapPin } from 'lucide-react';
import Rating from './Rating';
import './ServiceCard.css';

export default function ServiceCard({ service, onClick }) {
  const {
    name = 'Service', price = 0, unit = '',
    rating = 0, reviews = 0, distance, distanceLabel, verified, image = '📦'
  } = service || {};
  const safeDistanceLabel = distanceLabel || (Number.isFinite(Number(distance)) ? `${Number(distance).toFixed(1)}km` : 'Distance unavailable');

  return (
    <div className="service-card" onClick={onClick} id={`service-${service?.id}`}>
      <div className="service-card-emoji">{image}</div>
      <div className="service-card-info">
        <div className="service-card-header">
          <h3>{name}</h3>
          {verified && <span className="service-verified">✓</span>}
        </div>
        <div className="service-card-meta">
          <span className="service-distance"><MapPin size={12} /> {safeDistanceLabel}</span>
          <span className="service-meta-dot">•</span>
          <Rating value={rating} count={reviews} />
        </div>
        <div className="service-card-price">
          <span className="service-price">₹{(price || 0).toLocaleString()}</span>
          <span className="service-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
