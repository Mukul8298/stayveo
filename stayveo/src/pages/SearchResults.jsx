import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import FilterSheet from '../components/FilterSheet';
import { listings } from '../data/mockData';
import './SearchResults.css';

export default function SearchResults() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <div className="page" id="search-results">
      <div className="search-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}><SearchBar value={query} onChange={e => setQuery(e.target.value)} placeholder="Search PGs near IIT Delhi..." /></div>
      </div>
      <div className="search-controls">
        <div className="search-count">{listings.length} listings found</div>
        <div className="search-actions">
          <button className={`view-toggle ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><Grid3X3 size={16} /></button>
          <button className={`view-toggle ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><List size={16} /></button>
          <button className="filter-btn" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} /> Filters</button>
        </div>
      </div>
      <div className={`search-grid search-${view}`}>
        {listings.map(l => <ListingCard key={l.id} listing={l} variant={view === 'grid' ? 'vertical' : 'horizontal'} />)}
      </div>
      <FilterSheet isOpen={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
