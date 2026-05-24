import { statusLabel } from '../../lib/serviceVisibility';
import './ServiceManagement.css';

export default function ServiceStatusChip({ status = 'DRAFT' }) {
  return (
    <span className={`svc-status svc-status--${String(status).toLowerCase()}`}>
      {statusLabel(status)}
    </span>
  );
}
