import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import { useSavedListings } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './SavedListings.css';

export default function SavedListings() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { listings, loading, refresh } = useSavedListings(authState?.userId);
  const savedListings = authState?.userId ? listings : [];

  useEffect(() => {
    if (!authState?.userId) return;
    refresh().catch((err) => {
      console.error('SavedListings: failed to load saved listings:', err);
    });
  }, [authState?.userId, refresh]);

  return (
    <div className="page" id="saved-listings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Saved Listings</h1>
      </div>
      <div className="saved-grid">
        {loading && savedListings.length === 0 ? (
          <p>Loading saved listings...</p>
        ) : savedListings.length > 0 ? (
          savedListings.map(l => (
            <ListingCard key={l.id} listing={l} variant="vertical" />
          ))
        ) : (
          <p>No saved listings yet.</p>
        )}
      </div>
    </div>
  );
}
