import { useNavigate } from 'react-router-dom';
import { Home, Users, Briefcase, CreditCard, ChevronRight, MapPin } from 'lucide-react';
import { currentUser } from '../data/mockData';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { activeRoom, activeRoommate, activeServices, nextPayment } = currentUser;

  return (
    <div className="page page-padded" id="student-dashboard">
      <div className="dash-header">
        <h1>My Space</h1>
        <p>Everything in one place</p>
      </div>

      <div className="dash-card" onClick={() => navigate(`/room/${activeRoom.id}`)}>
        <div className="dash-card-icon"><Home size={20} /></div>
        <div className="dash-card-body">
          <h3>Active Room</h3>
          <p className="dash-card-title">{activeRoom.title}</p>
          <span className="dash-card-meta"><MapPin size={12} /> {activeRoom.distance} km • ₹{activeRoom.price.toLocaleString()}/mo</span>
        </div>
        <ChevronRight size={18} className="dash-chevron" />
      </div>

      <div className="dash-card" onClick={() => navigate('/roommate/chat')}>
        <div className="dash-card-icon dash-icon-purple"><Users size={20} /></div>
        <div className="dash-card-body">
          <h3>Roommate</h3>
          <p className="dash-card-title">{activeRoommate.name}</p>
          <span className="dash-card-meta">{activeRoommate.compatibility}% compatible • {activeRoommate.year}</span>
        </div>
        <ChevronRight size={18} className="dash-chevron" />
      </div>

      <div className="dash-section-title">Active Services</div>
      {activeServices.map(s => (
        <div key={s.id} className="dash-service" onClick={() => navigate(`/service/${s.id}`)}>
          <span className="dash-service-emoji">{s.image}</span>
          <div className="dash-service-info">
            <h4>{s.name}</h4>
            <span>₹{s.price.toLocaleString()}{s.unit}</span>
          </div>
          <ChevronRight size={16} className="dash-chevron" />
        </div>
      ))}

      <div className="dash-payment">
        <div className="dash-payment-icon"><CreditCard size={20} /></div>
        <div className="dash-payment-info">
          <h4>Next Payment</h4>
          <p>₹{nextPayment.amount.toLocaleString()} • {nextPayment.date}</p>
        </div>
        <button className="dash-pay-btn">Pay Now</button>
      </div>
    </div>
  );
}
