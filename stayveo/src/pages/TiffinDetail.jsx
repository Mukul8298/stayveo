import { useEffect, useState } from 'react';
import { Loader2, Map, MapPin, Star, Truck, Utensils } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchTiffinProvider, fetchTodaysTiffinMenu } from '../api/tiffin';
import ExactLocation from '../components/tiffin/ExactLocation';
import MealMenuCard from '../components/tiffin/MealMenuCard';
import MealPlanSelector from '../components/tiffin/MealPlanSelector';
import TiffinTopbar from '../components/tiffin/TiffinTopbar';
import { useToast } from '../context/ToastContext';
import './Tiffin.css';

const FOOD_LABELS = { veg: 'Vegetarian', nonveg: 'Non-Vegetarian', jain: 'Jain' };

function formatProviderSince(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `Hosting since ${date.getFullYear()}`;
}

function providerFoodLabels(provider) {
  const categories = Array.isArray(provider.foodCategories) && provider.foodCategories.length
    ? provider.foodCategories
    : [String(provider.foodType || 'veg').toLowerCase()];
  return categories.map((category) => FOOD_LABELS[category] || category).filter(Boolean);
}

export default function TiffinDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [menuState, setMenuState] = useState({ loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchTiffinProvider(id, { signal: controller.signal })
      .then(async (result) => {
        if (result.aborted || cancelled) return;
        setProvider(result.data);
        if (!result.data) {
          setMenuState({ loading: false, error: '' });
          return;
        }
        const availablePlans = Object.keys(result.data.plans || {});
        if (availablePlans.length && !availablePlans.includes('monthly')) setSelectedPlan(availablePlans[0]);
        try {
          const today = await fetchTodaysTiffinMenu(result.data.id, { signal: controller.signal });
          if (!cancelled) {
            setProvider((current) => current ? {
              ...current,
              menus: {
                lunch: Array.isArray(today.meals?.lunch) ? today.meals.lunch : [],
                dinner: Array.isArray(today.meals?.dinner) ? today.meals.dinner : [],
              },
            } : current);
            setMenuState({ loading: false, error: '' });
          }
        } catch (error) {
          if (!cancelled && !controller.signal.aborted) setMenuState({ loading: false, error: error.message || "Unable to load today's menu." });
        }
      })
      .catch((error) => {
        if (!cancelled && !controller.signal.aborted) setMenuState({ loading: false, error: error.message || 'Unable to load provider.' });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => { cancelled = true; controller.abort(); };
  }, [id]);

  function handleSubscribe() {
    const plan = provider?.plans?.[selectedPlan];
    if (!plan?.id) {
      toast.error('This meal plan is not available right now.');
      return;
    }
    navigate(`/tiffin/${encodeURIComponent(id)}/reservation?planId=${encodeURIComponent(plan.id)}`);
  }

  return (
    <main className="tiffin-page tiffin-detail-page" id="tiffin-detail">
      <div className="tiffin-content">
        <TiffinTopbar backTo="/tiffin" />
        {loading ? (
          <div className="tiffin-state"><Loader2 size={24} className="spinning" /><span>Loading provider...</span></div>
        ) : provider ? (
          <>
            <section className="tiffin-detail-layout">
              <div className="tiffin-detail-main">
                <article className="tiffin-detail-provider">
                  <img src={provider.image} alt={`${provider.name} home-cooked meals`} />
                  <div className="tiffin-detail-provider-copy">
                    <div className="tiffin-detail-title-row"><h1>{provider.name}</h1><span className="tiffin-detail-rating"><Star size={12} fill="currentColor" /> {provider.rating.toFixed(1)}</span></div>
                    <p className="tiffin-detail-meta"><MapPin size={12} /> {provider.distanceKm.toFixed(1)} km away <span>•</span> {provider.deliveryTiming}</p>
                    <p>{provider.description}</p>
                  </div>
                </article>

                <section className="tiffin-about-provider" aria-labelledby="about-provider-title">
                  <div className="tiffin-about-provider-copy">
                    <h2 id="about-provider-title">About the Provider</h2>
                    <p>{provider.description}</p>
                  </div>
                  <div className="tiffin-provider-profile">
                    <img src={provider.providerPhoto || provider.image} alt="" />
                    <div>
                      <strong>Managed by {provider.providerName || provider.name}</strong>
                      <span>{formatProviderSince(provider.providerSince) || 'Tiffin service provider'}</span>
                    </div>
                  </div>
                </section>

                <section className="tiffin-service-information" aria-labelledby="service-information-title">
                  <h2 id="service-information-title">Service Information</h2>
                  <div className="tiffin-service-information-grid">
                    <div className="tiffin-service-information-item">
                      <span className="tiffin-service-information-icon"><Utensils size={17} /></span>
                      <div><strong>Food Type</strong><span>{providerFoodLabels(provider).join(' & ')}</span></div>
                    </div>
                    <div className="tiffin-service-information-item">
                      <span className="tiffin-service-information-icon"><Truck size={17} /></span>
                      <div><strong>Service Options</strong><span>{provider.serviceOptions.join(' & ')}</span></div>
                    </div>
                    <div className="tiffin-service-information-item">
                      <span className="tiffin-service-information-icon"><Map size={17} /></span>
                      <div><strong>Delivery Coverage</strong><span>Up to {provider.deliveryRadiusKm} km radius from location</span></div>
                    </div>
                  </div>
                </section>

                <section className="tiffin-menu-section" aria-labelledby="todays-menu-title">
                  <div className="tiffin-section-title"><h2 id="todays-menu-title">Today's Menu</h2></div>
                  {menuState.loading ? <div className="tiffin-state"><Loader2 size={20} className="spinning" /><span>Loading today's menu...</span></div> : menuState.error ? <div className="tiffin-state"><span>{menuState.error}</span></div> : (provider.menus.lunch.length || provider.menus.dinner.length) ? <div className="tiffin-menu-grid">
                    <MealMenuCard title="Lunch" time="Served 12:30 PM - 2:30 PM" items={provider.menus.lunch} />
                    <MealMenuCard title="Dinner" time="Served 7:30 PM - 9:30 PM" items={provider.menus.dinner} />
                  </div> : <div className="tiffin-state"><span>Today's menu hasn't been planned yet.</span></div>}
                </section>
              </div>
              <MealPlanSelector provider={provider} selectedPlan={selectedPlan} onSelect={setSelectedPlan} onSubscribe={handleSubscribe} />
            </section>
            <ExactLocation latitude={provider.latitude} longitude={provider.longitude} address={provider.address} />
            <section className="tiffin-about-service-mobile" aria-labelledby="about-service-title">
              <h2 id="about-service-title">About This Service</h2>
              <p>{provider.description}</p>
            </section>
          </>
        ) : (
          <div className="tiffin-state"><span>That provider is no longer available.</span><button type="button" onClick={() => navigate('/tiffin')}>Back to providers</button></div>
        )}
      </div>
    </main>
  );
}
