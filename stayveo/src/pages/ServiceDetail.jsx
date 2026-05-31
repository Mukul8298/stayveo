import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Loader } from 'lucide-react';
import Rating from '../components/Rating';
import Button from '../components/Button';
import RoomDetailMap from '../components/maps/RoomDetailMap';
import { fetchAllServices } from '../api/supabaseApi';
import { useDistanceFromCollege } from '../hooks/useDistanceFromCollege';
import { createServiceRequest } from '../api/serviceRequests';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './ServiceDetail.css';

// ── ServiceDetail ───────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mock data import — fetches from Supabase
// - Uses AbortController for cleanup
// ────────────────────────────────────────────────────────────────────────

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const toast = useToast();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { itemsWithDistance } = useDistanceFromCollege(service ? [service] : []);
  const serviceWithDistance = itemsWithDistance[0] || service;
  const isRequestService = ['laundry', 'cleaning'].includes(String(serviceWithDistance?.category || '').toLowerCase());

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data, aborted } = await fetchAllServices({ signal: controller.signal });
        if (aborted) return;
        // Find by ID — try numeric and string match
        const found = (data || []).find(s => String(s.id) === String(id));
        setService(found || null);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('ServiceDetail: fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="page" id="service-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader size={24} className="spinning" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="page" id="service-detail">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <h1>Service</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3>Service not found</h3>
          <p>This service may have been removed or is unavailable.</p>
        </div>
      </div>
    );
  }

  const handlePrimaryAction = async () => {
    if (!isRequestService) {
      navigate(`/booking/${serviceWithDistance.id}`, { state: { service: serviceWithDistance } });
      return;
    }

    if (!authState?.userId) {
      toast.error('Login required to request this service');
      navigate('/auth');
      return;
    }

    setRequesting(true);
    try {
      await createServiceRequest(authState.userId, {
        providerId: serviceWithDistance.providerId,
        providerName: serviceWithDistance.provider,
        serviceId: serviceWithDistance.id,
        serviceType: serviceWithDistance.category,
        providerLatitude: serviceWithDistance.latitude,
        providerLongitude: serviceWithDistance.longitude,
        studentPhone: authState.phone,
      });
      toast.success('Request sent. The provider will review your address and distance.');
      navigate('/notifications');
    } catch (error) {
      toast.error(error.message || 'Could not send request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="page" id="service-detail">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>{service.name}</h1>
      </div>

      <div className="sd-body">
        <div className="sd-hero">
          <span className="sd-emoji">{service.image}</span>
          <h2>{serviceWithDistance.name}</h2>
          <div className="sd-meta">
            <span className="sd-distance"><MapPin size={14} /> {serviceWithDistance.distanceLabel || 'Distance unavailable'}</span>
            <span className="sd-meta-dot">•</span>
            <Rating value={serviceWithDistance.rating} count={serviceWithDistance.reviews} size="md" />
          </div>
          <p className="sd-desc">{serviceWithDistance.description}</p>
        </div>

        <div className="sd-section">
          <h3>Pricing Plans</h3>
          <div className="sd-plans">
            {(serviceWithDistance.plans || []).map((p, i) => (
              <div key={i} className={`sd-plan ${i === 1 ? 'recommended' : ''}`}>
                {i === 1 && <span className="sd-plan-badge">Best Value</span>}
                <h4>{p.name}</h4>
                <div className="sd-plan-price">₹{(p.price || 0).toLocaleString()}</div>
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
            <div className="sd-review-rating"><Star size={12} fill="#F59E0B" stroke="#F59E0B" /> {serviceWithDistance.rating}</div>
          </div>
        </div>

        <div className="sd-section sd-map-section">
          <h3>Location</h3>
          <RoomDetailMap
            latitude={serviceWithDistance.latitude}
            longitude={serviceWithDistance.longitude}
            address={serviceWithDistance.address}
          />
        </div>
      </div>

      <div className="sd-sticky-footer">
        <div className="sd-footer-price">
          ₹{(serviceWithDistance.plans?.[0]?.price || serviceWithDistance.price || 0).toLocaleString()}<span>{serviceWithDistance.unit}</span>
        </div>
        <Button variant="accent" size="lg" onClick={handlePrimaryAction} disabled={requesting}>
          {requesting ? 'Sending...' : isRequestService ? 'Book Request' : 'Book Now'}
        </Button>
      </div>
    </div>
  );
}
