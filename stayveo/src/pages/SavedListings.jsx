import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import { currentUser } from '../data/mockData';
import './SavedListings.css';

export default function SavedListings() {
  const navigate = useNavigate();

  return (
    <div className="page" id="saved-listings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Saved Listings</h1>
      </div>
      <div className="saved-grid">
        {currentUser.savedListings.map(l => (
          <ListingCard key={l.id} listing={l} variant="vertical" />
        ))}
      </div>
    </div>
  );
}
