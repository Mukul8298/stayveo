import { MapPin } from 'lucide-react';
import Rating from './Rating';
import './ServiceCard.css';

export default function ServiceCard({ service, onClick }) {
  const { name, category, price, unit, rating, reviews, distance, verified, image } = service;
  return (
    <div className="service-card" onClick={onClick} id={`service-${service.id}`}>
      <div className="service-card-emoji">{image}</div>
      <div className="service-card-info">
        <div className="service-card-header">
          <h3>{name}</h3>
          {verified && <span className="service-verified">✓</span>}
        </div>
        <div className="service-card-meta">
          <Rating value={rating} count={reviews} />
          <span className="service-distance"><MapPin size={11} /> {distance} km</span>
        </div>
        <div className="service-card-price">
          <span className="service-price">₹{price.toLocaleString()}</span>
          <span className="service-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
