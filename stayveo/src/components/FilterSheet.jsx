import { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import './FilterSheet.css';

export default function FilterSheet({ isOpen, onClose, onApply }) {
  const [priceRange, setPriceRange] = useState([3000, 15000]);
  const [distance, setDistance] = useState(2);
  const [roomType, setRoomType] = useState('any');
  const [serviceFilters, setServiceFilters] = useState({ food: false, wifi: true, laundry: false, cleaning: false });

  const toggleService = (key) => setServiceFilters(prev => ({ ...prev, [key]: !prev[key] }));

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="filter-sheet" id="filter-sheet">
        <div className="filter-sheet-header">
          <h2>Filters</h2>
          <button className="filter-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="filter-sheet-body">
          <div className="filter-group">
            <label className="filter-label">Price Range</label>
            <div className="filter-range-labels">
              <span>₹{priceRange[0].toLocaleString()}</span>
              <span>₹{priceRange[1].toLocaleString()}</span>
            </div>
            <input type="range" className="filter-slider" min="2000" max="20000" step="500"
              value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])} />
          </div>

          <div className="filter-group">
            <label className="filter-label">Max Distance</label>
            <div className="filter-range-labels"><span>{distance} km</span></div>
            <input type="range" className="filter-slider" min="0.1" max="5" step="0.1"
              value={distance} onChange={e => setDistance(+e.target.value)} />
          </div>

          <div className="filter-group">
            <label className="filter-label">Room Type</label>
            <div className="filter-options">
              {['any', 'single', 'shared'].map(t => (
                <button key={t} className={`filter-option ${roomType === t ? 'active' : ''}`}
                  onClick={() => setRoomType(t)}>
                  {t === 'any' ? 'Any' : t === 'single' ? 'Single' : 'Shared'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Services</label>
            <div className="filter-toggles">
              {Object.entries(serviceFilters).map(([key, val]) => (
                <div key={key} className="filter-toggle-row">
                  <span className="filter-toggle-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <div className={`toggle ${val ? 'active' : ''}`} onClick={() => toggleService(key)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="filter-sheet-footer">
          <Button variant="secondary" onClick={() => { setPriceRange([3000, 15000]); setDistance(2); setRoomType('any'); }}>
            Reset
          </Button>
          <Button variant="accent" onClick={() => { onApply?.({ priceRange, distance, roomType, serviceFilters }); onClose(); }}>
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}
