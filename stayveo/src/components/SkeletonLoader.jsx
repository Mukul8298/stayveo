import './SkeletonLoader.css';

export function SkeletonCard({ variant = 'horizontal' }) {
  return (
    <div className={`skeleton-card skeleton-${variant}`}>
      <div className="skeleton-image skeleton-pulse" />
      <div className="skeleton-body">
        <div className="skeleton-line skeleton-pulse" style={{ width: '70%' }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: '50%' }} />
        <div className="skeleton-line skeleton-pulse" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton-circle skeleton-pulse" />
          <div className="skeleton-list-body">
            <div className="skeleton-line skeleton-pulse" style={{ width: '60%' }} />
            <div className="skeleton-line skeleton-pulse" style={{ width: '80%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
