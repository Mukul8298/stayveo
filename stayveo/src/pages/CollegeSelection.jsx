import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, MapPin, Search } from 'lucide-react';
import { getColleges } from '../api/colleges';
import './CollegeSelection.css';

const SEARCH_DEBOUNCE_MS = 300;

export default function CollegeSelection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedCollegeId = localStorage.getItem('selectedCollegeId');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchColleges() {
      try {
        setLoading(true);
        setError('');
        const result = await getColleges({
          search: debouncedQuery,
          page: 1,
          limit: 20,
          signal: controller.signal,
        });
        setColleges(result.items || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Could not load colleges');
        setColleges([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchColleges();
    return () => controller.abort();
  }, [debouncedQuery]);

  const sectionTitle = useMemo(() => {
    if (debouncedQuery) return 'Results';
    return 'Popular Colleges';
  }, [debouncedQuery]);

  const handleSelectCollege = (college) => {
    localStorage.setItem('selectedCollege', college.name);
    localStorage.setItem('selectedCollegeName', college.name);
    localStorage.setItem('selectedCollegeId', college.id);
    if (Number.isFinite(Number(college.latitude)) && Number.isFinite(Number(college.longitude))) {
      localStorage.setItem('selectedCollegeLatitude', String(college.latitude));
      localStorage.setItem('selectedCollegeLongitude', String(college.longitude));
    } else {
      localStorage.removeItem('selectedCollegeLatitude');
      localStorage.removeItem('selectedCollegeLongitude');
    }
    navigate('/onboarding');
  };

  const handleDetectNearestCollege = () => {
    localStorage.removeItem('selectedCollege');
    localStorage.removeItem('selectedCollegeName');
    localStorage.removeItem('selectedCollegeId');
    localStorage.removeItem('selectedCollegeLatitude');
    localStorage.removeItem('selectedCollegeLongitude');
    navigate('/onboarding');
  };

  return (
    <div className="college-page" id="college-selection">
      <button className="auth-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
      <h1 className="college-heading">Select your college</h1>
      <p className="college-sub">We'll show you listings near your campus</p>

      <div className="college-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search colleges..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <button className="college-gps" onClick={handleDetectNearestCollege}>
        <MapPin size={16} /> Detect nearest college
      </button>

      <div className="college-section">
        <h3>{sectionTitle}</h3>

        {loading && (
          <div className="college-list" aria-busy="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="college-skeleton">
                <span />
                <div>
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="college-state college-state-error">
            <AlertCircle size={20} />
            <h4>Could not load colleges</h4>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && colleges.length === 0 && (
          <div className="college-state">
            <div className="college-state-icon">🏛️</div>
            <h4>{debouncedQuery ? 'No colleges found' : 'No colleges available'}</h4>
            <p>{debouncedQuery ? 'Try a different college name or city.' : 'The colleges table is empty.'}</p>
          </div>
        )}

        {!loading && !error && colleges.length > 0 && (
          <div className="college-list">
            {colleges.map(c => (
              <button
                key={c.id}
                className={`college-item ${selectedCollegeId === c.id ? 'selected' : ''}`}
                onClick={() => handleSelectCollege(c)}
              >
                <div className="college-item-icon">🏛️</div>
                <div className="college-item-info">
                  <span className="college-item-name">{c.name}</span>
                  <span className="college-item-city">
                    {c.city}{c.university ? ` • ${c.university}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
