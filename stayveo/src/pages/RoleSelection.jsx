import { useNavigate } from 'react-router-dom';
import { GraduationCap, Building2 } from 'lucide-react';
import './RoleSelection.css';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="role-page" id="role-selection">
      <div className="role-header">
        <h1>Welcome to<br /><span>StayVeo</span></h1>
        <p>How would you like to use the platform?</p>
      </div>
      <div className="role-cards">
        <button className="role-card" onClick={() => navigate('/auth')} id="role-student">
          <div className="role-icon role-icon-student"><GraduationCap size={36} /></div>
          <h2>I'm a Student</h2>
          <p>Find PGs, roommates & services near your college</p>
          <div className="role-arrow">→</div>
        </button>
        <button className="role-card" onClick={() => navigate('/provider/select')} id="role-broker">
          <div className="role-icon role-icon-broker"><Building2 size={36} /></div>
          <h2>I'm a Provider</h2>
          <p>PG owner, tiffin, laundry or cleaning service</p>
          <div className="role-arrow">→</div>
        </button>
      </div>
    </div>
  );
}
