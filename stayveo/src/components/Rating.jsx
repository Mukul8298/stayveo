import { Star } from 'lucide-react';
import './Rating.css';

export default function Rating({ value, count, size = 'sm' }) {
  return (
    <div className={`rating rating-${size}`}>
      <Star size={size === 'sm' ? 14 : 16} fill="#F59E0B" stroke="#F59E0B" />
      <span className="rating-value">{value}</span>
      {count !== undefined && <span className="rating-count">({count})</span>}
    </div>
  );
}
