import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WashingMachine, UtensilsCrossed, Sparkles } from 'lucide-react';
import ServiceCard from '../components/ServiceCard';
import { services } from '../data/mockData';
import './ServicesHome.css';

const categories = [
  { key: 'all', label: 'All', icon: '🏠' },
  { key: 'laundry', label: 'Laundry', icon: '🧺' },
  { key: 'tiffin', label: 'Tiffin', icon: '🍱' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧹' },
];

export default function ServicesHome() {
  const navigate = useNavigate();
  const [active, setActive] = useState('all');
  const filtered = active === 'all' ? services : services.filter(s => s.category === active);

  return (
    <div className="page" id="services-home">
      <div className="services-header">
        <h1>Services</h1>
        <p>Book services near your campus</p>
      </div>

      <div className="services-categories">
        {categories.map(c => (
          <button key={c.key} className={`services-cat ${active === c.key ? 'active' : ''}`}
            onClick={() => setActive(c.key)}>
            <span className="services-cat-icon">{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="services-list">
        {filtered.map(s => (
          <ServiceCard key={s.id} service={s} onClick={() => navigate(`/service/${s.id}`)} />
        ))}
      </div>
    </div>
  );
}
