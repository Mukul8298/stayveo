import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, BadgeCheck, Wifi, UtensilsCrossed, WashingMachine, Sparkles, Star, Phone } from 'lucide-react';
import ImageCarousel from '../components/ImageCarousel';
import Rating from '../components/Rating';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { listings } from '../data/mockData';
import './RoomDetail.css';

const serviceMap = { wifi: { icon: <Wifi size={16}/>, name: 'WiFi' }, food: { icon: <UtensilsCrossed size={16}/>, name: 'Food' }, laundry: { icon: <WashingMachine size={16}/>, name: 'Laundry' }, cleaning: { icon: <Sparkles size={16}/>, name: 'Cleaning' } };

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const room = listings.find(l => l.id === +id) || listings[0];

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
            <h1 className="rd-title">{room.title}</h1>
            <p className="rd-address"><MapPin size={14} /> {room.address}</p>
          </div>
          {room.verified && <div className="verified-badge"><BadgeCheck size={14} /> Verified</div>}
        </div>

        <div className="rd-price-row">
          <div className="rd-price">₹{room.price.toLocaleString()}<span>/month</span></div>
          <Chip variant="distance" icon={<MapPin size={11} />}>{room.distance} km from campus</Chip>
        </div>

        <div className="rd-section">
          <h3>Services Included</h3>
          <div className="rd-services">
            {room.services.map(s => (
              <div key={s} className="rd-service-item">{serviceMap[s]?.icon}<span>{serviceMap[s]?.name}</span></div>
            ))}
          </div>
        </div>

        <div className="rd-section">
          <h3>Amenities</h3>
          <div className="rd-amenities">{room.amenities.map(a => <Chip key={a} variant="primary">{a}</Chip>)}</div>
        </div>

        <div className="rd-section">
          <h3>About</h3>
          <p className="rd-desc">{room.description}</p>
        </div>

        <div className="rd-section">
          <h3>Reviews</h3>
          <div className="rd-reviews-summary">
            <div className="rd-rating-big"><Star size={24} fill="#F59E0B" stroke="#F59E0B" /><span>{room.rating}</span></div>
            <span className="rd-review-count">{room.reviews} reviews</span>
          </div>
          <div className="rd-review">
            <div className="rd-reviewer"><span className="rd-reviewer-avatar">👨‍🎓</span><div><p className="rd-reviewer-name">Vikram S.</p><p className="rd-reviewer-date">2 weeks ago</p></div></div>
            <p className="rd-review-text">Great place! Clean rooms and excellent food. Walking distance from campus gate. Highly recommended.</p>
          </div>
        </div>

        <div className="rd-section">
          <h3>Location</h3>
          <div className="rd-map">
            <div className="rd-map-placeholder"><MapPin size={32} /><p>Map Preview</p><span>{room.distance} km from IIT Delhi</span></div>
          </div>
        </div>

        <div className="rd-owner">
          <div className="rd-owner-info">
            <span className="rd-owner-avatar">👤</span>
            <div><p className="rd-owner-name">{room.owner}</p><p className="rd-owner-label">Property Owner</p></div>
          </div>
          <button className="rd-call"><Phone size={16} /> Call</button>
        </div>
      </div>

      <div className="rd-sticky-footer">
        <div className="rd-footer-price">₹{room.price.toLocaleString()}<span>/mo</span></div>
        <Button variant="accent" size="lg" onClick={() => navigate(`/booking/${room.id}`)}>Book Now</Button>
      </div>
    </div>
  );
}
