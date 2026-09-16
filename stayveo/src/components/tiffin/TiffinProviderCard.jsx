import { MapPin, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TiffinProviderCard({ provider }) {
  const navigate = useNavigate();
  const distance = Number(provider.distanceKm);

  return (
    <article className="tiffin-provider-card">
      <button type="button" className="tiffin-provider-image-button" onClick={() => navigate(`/tiffin/${provider.id}`)} aria-label={`Open ${provider.name}`}>
        <img src={provider.image} alt={`${provider.name} meals`} loading="lazy" decoding="async" />
        <span className="tiffin-card-rating"><Star size={11} fill="currentColor" /> {provider.rating.toFixed(1)}</span>
      </button>
      <div className="tiffin-provider-body">
        <div className="tiffin-provider-name-row">
          <h2>{provider.name}</h2>
          <span className="tiffin-card-distance"><MapPin size={13} /> {distance.toFixed(1)} km away</span>
        </div>
        <p className="tiffin-provider-style">{provider.cuisine}</p>
        <div className="tiffin-provider-divider" />
        <div className="tiffin-provider-footer">
          <span>Starting from <strong>₹{provider.price}</strong> / meal</span>
          <button type="button" className="tiffin-small-button" onClick={() => navigate(`/tiffin/${provider.id}`)}>View Menu <span>→</span></button>
        </div>
      </div>
    </article>
  );
}
