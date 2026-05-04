import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Home, Users, BarChart3 } from 'lucide-react';
import Button from '../components/Button';
import { brokerData } from '../data/mockData';
import './BrokerDashboard.css';

export default function BrokerDashboard() {
  const navigate = useNavigate();
  const d = brokerData;

  return (
    <div className="page page-padded" id="broker-dashboard">
      <div className="broker-header">
        <div><p className="broker-greeting">Welcome back</p><h1>{d.name}</h1></div>
        <button className="broker-add" onClick={() => navigate('/broker/add-listing')}>
          <Plus size={20} />
        </button>
      </div>

      <div className="broker-earnings">
        <div className="be-label"><TrendingUp size={16} /> This Month</div>
        <div className="be-amount">₹{d.thisMonth.toLocaleString()}</div>
        <div className="be-total">Total: ₹{d.totalEarnings.toLocaleString()}</div>
      </div>

      <div className="broker-stats">
        <div className="broker-stat">
          <Home size={20} />
          <span className="bs-num">{d.activeListings}</span>
          <span className="bs-label">Active Listings</span>
        </div>
        <div className="broker-stat">
          <Users size={20} />
          <span className="bs-num">{d.totalBookings}</span>
          <span className="bs-label">Bookings</span>
        </div>
        <div className="broker-stat">
          <BarChart3 size={20} />
          <span className="bs-num">{d.occupancyRate}%</span>
          <span className="bs-label">Occupancy</span>
        </div>
      </div>

      {d.pendingRequests > 0 && (
        <div className="broker-pending" onClick={() => navigate('/broker/bookings')}>
          <span className="bp-badge">{d.pendingRequests}</span>
          <span>Pending booking requests</span>
          <span className="bp-arrow">→</span>
        </div>
      )}

      <Button variant="accent" fullWidth size="lg" icon={<Plus size={18} />}
        onClick={() => navigate('/broker/add-listing')}>
        Add New Listing
      </Button>
    </div>
  );
}
