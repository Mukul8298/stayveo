import './Chip.css';

export default function Chip({ children, icon, variant = 'default', active, onClick, size = 'sm' }) {
  return (
    <span
      className={`chip chip-${variant} chip-${size} ${active ? 'chip-active' : ''} ${onClick ? 'chip-clickable' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="chip-icon">{icon}</span>}
      {children}
    </span>
  );
}
