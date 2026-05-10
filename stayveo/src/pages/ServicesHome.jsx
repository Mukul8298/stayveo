import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import ServiceCard from '../components/ServiceCard';
import { services as mockServices } from '../data/mockData';
import { fetchAllServices } from '../api/supabaseApi';
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
  const [services, setServices] = useState(mockServices);
  const [loading, setLoading] = useState(true);

  // ── Fetch real services from Supabase ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await fetchAllServices();
        if (error) {
          console.error('ServicesHome: fetch error:', error);
          // Keep mock data as fallback
          return;
        }
        if (data?.length > 0) {
          setServices(data);
        }
        // If no data from DB, keep mock services
      } catch (err) {
        console.error('ServicesHome: unexpected error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = active === 'all' ? services : services.filter(s => s?.category === active);

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

      {/* Loading state */}
      {loading && (
        <div className="home-loading">
          <Loader size={24} className="spinning" />
          <span>Loading services...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No services yet</h3>
          <p>Services will appear here when providers add them</p>
        </div>
      )}

      <div className="services-list">
        {filtered.map(s => (
          <ServiceCard key={s.id} service={s} onClick={() => navigate(`/service/${s.id}`)} />
        ))}
      </div>
    </div>
  );
}
