import { Plus } from 'lucide-react';
import './ServiceManagement.css';

export default function EmptyStateCard({ icon, title, description, ctaLabel, onAction }) {
  return (
    <div className="svc-empty">
      <div className="svc-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {ctaLabel && (
        <button type="button" className="svc-empty-btn" onClick={onAction}>
          <Plus size={16} />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
