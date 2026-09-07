import { ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TiffinTopbar({ backTo, backLabel = 'Back' }) {
  const navigate = useNavigate();

  return (
    <header className="tiffin-topbar">
      <button type="button" className="tiffin-back" onClick={() => (backTo ? navigate(backTo) : navigate(-1))} aria-label={backLabel}>
        <ArrowLeft size={14} />
        <span>{backLabel}</span>
      </button>
      <button type="button" className="tiffin-notification" onClick={() => navigate('/notifications')} aria-label="Open notifications">
        <Bell size={16} />
      </button>
    </header>
  );
}
