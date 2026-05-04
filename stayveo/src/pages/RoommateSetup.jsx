import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import './RoommateSetup.css';

export default function RoommateSetup() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ sleep: 'Night Owl', cleanliness: 4, food: 'Vegetarian', study: 'Room', social: 'Ambivert' });

  const update = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  return (
    <div className="page" id="roommate-setup">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Roommate Preferences</h1>
      </div>
      <div className="rms-body">
        <div className="rms-group">
          <label>🌙 Sleep Schedule</label>
          <div className="rms-options">{['Early Bird', 'Night Owl', 'Flexible'].map(o => (
            <button key={o} className={`rms-opt ${prefs.sleep === o ? 'active' : ''}`} onClick={() => update('sleep', o)}>{o}</button>
          ))}</div>
        </div>
        <div className="rms-group">
          <label>🧹 Cleanliness Level</label>
          <div className="rms-slider-row">
            <span>Messy</span>
            <input type="range" min="1" max="5" value={prefs.cleanliness} onChange={e => update('cleanliness', +e.target.value)} className="rms-slider" />
            <span>Spotless</span>
          </div>
          <div className="rms-slider-value">{prefs.cleanliness}/5</div>
        </div>
        <div className="rms-group">
          <label>🍽️ Food Preference</label>
          <div className="rms-options">{['Vegetarian', 'Non-Veg', 'Vegan'].map(o => (
            <button key={o} className={`rms-opt ${prefs.food === o ? 'active' : ''}`} onClick={() => update('food', o)}>{o}</button>
          ))}</div>
        </div>
        <div className="rms-group">
          <label>📚 Study Habits</label>
          <div className="rms-options">{['Room', 'Library', 'Cafe'].map(o => (
            <button key={o} className={`rms-opt ${prefs.study === o ? 'active' : ''}`} onClick={() => update('study', o)}>{o}</button>
          ))}</div>
        </div>
        <div className="rms-group">
          <label>💬 Social Level</label>
          <div className="rms-options">{['Introvert', 'Ambivert', 'Extrovert'].map(o => (
            <button key={o} className={`rms-opt ${prefs.social === o ? 'active' : ''}`} onClick={() => update('social', o)}>{o}</button>
          ))}</div>
        </div>
        <Button variant="accent" fullWidth size="lg" onClick={() => navigate('/roommate/swipe')}>Save & Find Matches</Button>
      </div>
    </div>
  );
}
