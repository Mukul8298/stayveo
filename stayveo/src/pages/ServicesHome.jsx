import { ArrowRight, Sparkles, Shirt, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TiffinTopbar from '../components/tiffin/TiffinTopbar';
import './Tiffin.css';

export default function ServicesHome() {
  const navigate = useNavigate();

  return (
    <main className="tiffin-page tiffin-services-page" id="services-home">
      <div className="tiffin-content">
        <TiffinTopbar />
        <header className="tiffin-page-heading">
          <h1>Services</h1>
          <p>Everything you need for a comfortable stay, all in one place.</p>
        </header>

        <section className="tiffin-services-grid" aria-label="Student services">
          <article className="tiffin-feature-service">
            <div className="tiffin-feature-copy">
              <span className="tiffin-service-icon"><Utensils size={17} /></span>
              <span className="tiffin-coming-label">Available now</span>
              <h2>Tiffin Service</h2>
              <p>Fresh, homely meals delivered to your doorstep.</p>
              <span className="tiffin-starting-price">Starting from ₹80 / meal</span>
              <button type="button" className="tiffin-dark-button" onClick={() => navigate('/tiffin')}>Explore Tiffin <ArrowRight size={15} /></button>
            </div>
            <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82" alt="Fresh homestyle tiffin meal" />
          </article>

          <ComingSoonCard icon={<Shirt size={16} />} title="Laundry" description="Professional wash and fold services." />
          <ComingSoonCard icon={<Sparkles size={16} />} title="Room Cleaning" description="Schedule deep cleaning for your space." />
        </section>
      </div>
    </main>
  );
}

function ComingSoonCard({ icon, title, description }) {
  return (
    <article className="tiffin-coming-card">
      <div className="tiffin-coming-card-top"><span className="tiffin-service-icon is-muted">{icon}</span><span>Coming Soon</span></div>
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}
