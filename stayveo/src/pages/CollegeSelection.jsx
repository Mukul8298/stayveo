import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import { duColleges } from '../data/mockData';
import './CollegeSelection.css';

export default function CollegeSelection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const filtered = duColleges.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.city.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectCollege = (collegeName) => {
    // Save selected college to localStorage for the onboarding step
    localStorage.setItem('selectedCollege', collegeName);
    navigate('/onboarding');
  };

  return (
    <div className="college-page" id="college-selection">
      <button className="auth-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
      <h1 className="college-heading">Select your college</h1>
      <p className="college-sub">We'll show you listings near your campus</p>

      <div className="college-search">
        <Search size={18} />
        <input type="text" placeholder="Search colleges..." value={query}
          onChange={e => setQuery(e.target.value)} autoFocus />
      </div>

      <button className="college-gps" onClick={() => handleSelectCollege('Nearby College')}>
        <MapPin size={16} /> Detect nearest college
      </button>

      <div className="college-section">
        <h3>{query ? 'Results' : 'Popular Colleges'}</h3>
        <div className="college-list">
          {filtered.map(c => (
            <button key={c.id} className="college-item" onClick={() => handleSelectCollege(c.name)}>
              <div className="college-item-icon">🏛️</div>
              <div className="college-item-info">
                <span className="college-item-name">{c.name}</span>
                <span className="college-item-city">{c.city} • {c.university}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
