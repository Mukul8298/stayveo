import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import ServiceCard from '../components/ServiceCard';
import { fetchAllServices } from '../api/supabaseApi';
import './ServicesHome.css';

// ── ServicesHome ────────────────────────────────────────────────────────
// MIGRATION CHANGES:
// - Removed mock data import — uses ONLY real Supabase data
// - Uses AbortController for safe async cleanup
// ────────────────────────────────────────────────────────────────────────

const categories = [
  { key: 'all', label: 'All', icon: '🏠' },
  { key: 'laundry', label: 'Laundry', icon: '🧺' },
  { key: 'tiffin', label: 'Tiffin', icon: '🍱' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧹' },
];

export default function ServicesHome() {
  const navigate = useNavigate();
  const [active, setActive] = useState('all');
  // Start with empty array — NO mock data
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch real services from Supabase ─────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data, error } = await fetchAllServices({ signal: controller.signal });
        if (controller.signal.aborted) return;

        if (error) {
          console.error('ServicesHome: fetch error:', error);
          return;
        }
        setServices(data || []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('ServicesHome: unexpected error:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
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
