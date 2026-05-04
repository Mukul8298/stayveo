import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, CheckCircle } from 'lucide-react';
import Rating from '../components/Rating';
import Button from '../components/Button';
import { services } from '../data/mockData';
import './ServiceDetail.css';

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const service = services.find(s => s.id === +id) || services[0];

  return (
    <div className="page" id="service-detail">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>{service.name}</h1>
      </div>

      <div className="sd-body">
        <div className="sd-hero">
          <span className="sd-emoji">{service.image}</span>
          <h2>{service.name}</h2>
          <div className="sd-meta">
            <Rating value={service.rating} count={service.reviews} size="md" />
            <span className="sd-distance"><MapPin size={14} /> {service.distance} km</span>
          </div>
          <p className="sd-desc">{service.description}</p>
        </div>

        <div className="sd-section">
          <h3>Pricing Plans</h3>
          <div className="sd-plans">
            {service.plans.map((p, i) => (
              <div key={i} className={`sd-plan ${i === 1 ? 'recommended' : ''}`}>
                {i === 1 && <span className="sd-plan-badge">Best Value</span>}
                <h4>{p.name}</h4>
                <div className="sd-plan-price">₹{p.price.toLocaleString()}</div>
                <p>{p.details}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-section">
          <h3>Reviews</h3>
          <div className="sd-review">
            <div className="sd-reviewer"><span>👩‍🎓</span><div><strong>Ria M.</strong><span>1 week ago</span></div></div>
            <p>Excellent service! Always on time and very thorough. Highly recommend for students.</p>
            <div className="sd-review-rating"><Star size={12} fill="#F59E0B" stroke="#F59E0B" /> {service.rating}</div>
          </div>
        </div>
      </div>

      <div className="sd-sticky-footer">
        <div className="sd-footer-price">
          From ₹{service.plans[0].price}<span>{service.unit}</span>
        </div>
        <Button variant="accent" size="lg">Add to My Room</Button>
      </div>
    </div>
  );
}
