import { useNavigate } from 'react-router-dom';
import { Heart, Users, Sparkles } from 'lucide-react';
import Button from '../components/Button';
import { roommates } from '../data/mockData';
import './RoommateHome.css';

export default function RoommateHome() {
  const navigate = useNavigate();
  const topMatch = roommates[3];

  return (
    <div className="page page-padded" id="roommate-home">
      <div className="rm-hero">
        <div className="rm-hero-icon"><Heart size={32} /></div>
        <h1>Find Your<br />Perfect Roommate</h1>
        <p>We match you based on lifestyle, habits & preferences</p>
      </div>

      <div className="rm-compat-card">
        <div className="rm-compat-header"><Sparkles size={16} /> Your Top Match</div>
        <div className="rm-compat-body">
          <span className="rm-compat-avatar">{topMatch.avatar}</span>
          <div>
            <h3>{topMatch.name}</h3>
            <p>{topMatch.year} • {topMatch.branch}</p>
          </div>
          <div className="rm-compat-pct">{topMatch.compatibility}%</div>
        </div>
      </div>

      <div className="rm-stats">
        <div className="rm-stat"><Users size={20} /><span className="rm-stat-num">{roommates.length}</span><span className="rm-stat-label">Potential Matches</span></div>
        <div className="rm-stat"><Heart size={20} /><span className="rm-stat-num">3</span><span className="rm-stat-label">Mutual Likes</span></div>
      </div>

      <div className="rm-actions">
        <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/roommate/swipe')}>
          Find Matches 💜
        </Button>
        <Button variant="outline" fullWidth onClick={() => navigate('/roommate/setup')}>
          Update Preferences
        </Button>
      </div>
    </div>
  );
}
