import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Loader, Package } from 'lucide-react';
import Button from '../components/Button';
import { getStudentServiceRequests } from '../api/serviceRequests';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './ServiceRequestCheckout.css';

const packages = [
  { key: 'standard', label: 'Standard Wash', pricePerKg: 70 },
  { key: 'premium', label: 'Premium Wash + Iron', pricePerKg: 110 },
  { key: 'express', label: 'Express Same Day', pricePerKg: 150 },
];

export default function ServiceRequestCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { authState } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState(3);
  const [selectedPackage, setSelectedPackage] = useState(packages[0].key);

  useEffect(() => {
    if (!authState?.userId) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    getStudentServiceRequests(authState.userId, { status: 'accepted', limit: 50 })
      .then((res) => {
        const found = (res.data?.items || []).find((item) => String(item.id) === String(id));
        setRequest(found || null);
      })
      .catch((error) => {
        toast.error(error.message || 'Could not load checkout');
      })
      .finally(() => setLoading(false));
  }, [authState?.userId, id, toast]);

  const plan = packages.find((item) => item.key === selectedPackage) || packages[0];
  const payable = useMemo(() => Math.max(1, weight) * plan.pricePerKg, [plan.pricePerKg, weight]);

  if (loading) {
    return (
      <div className="page src-page">
        <div className="empty-state">
          <Loader size={28} className="spinning" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="page src-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <h1>Checkout</h1>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>Accepted request not found</h3>
          <p>This request may still be pending or was removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page src-page" id="service-request-checkout">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Checkout</h1>
      </div>

      <div className="src-content">
        <div className="src-accepted">
          <CheckCircle2 size={22} />
          <div>
            <strong>Request accepted</strong>
            <p>Confirm laundry weight and continue payment.</p>
          </div>
        </div>

        <section className="src-section">
          <h2><Package size={18} /> Cloth weight</h2>
          <div className="src-weight">
            <button onClick={() => setWeight((current) => Math.max(1, current - 1))}>-</button>
            <strong>{weight} kg</strong>
            <button onClick={() => setWeight((current) => Math.min(20, current + 1))}>+</button>
          </div>
          <input
            className="src-range"
            type="range"
            min="1"
            max="20"
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
          />
        </section>

        <section className="src-section">
          <h2>Service package</h2>
          <div className="src-packages">
            {packages.map((item) => (
              <button
                key={item.key}
                className={`src-package ${selectedPackage === item.key ? 'active' : ''}`}
                onClick={() => setSelectedPackage(item.key)}
              >
                <span>{item.label}</span>
                <strong>₹{item.pricePerKg}/kg</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="src-section">
          <h2><Calendar size={18} /> Pickup confirmation</h2>
          <div className="src-pickup">
            <p><strong>Date</strong><span>{request.pickupDate ? new Date(request.pickupDate).toLocaleDateString('en-IN') : 'Provider will confirm'}</span></p>
            <p><strong>Time</strong><span>{request.pickupTime || 'Provider will confirm'}</span></p>
            <p><strong>Address</strong><span>{request.studentAddress || 'Address not shared'}</span></p>
          </div>
        </section>
      </div>

      <div className="src-sticky">
        <div>
          <span>Total</span>
          <strong>₹{payable.toLocaleString()}</strong>
        </div>
        <Button variant="accent" size="lg" onClick={() => toast.info('Payment gateway will open here')}>
          Continue Payment
        </Button>
      </div>
    </div>
  );
}
