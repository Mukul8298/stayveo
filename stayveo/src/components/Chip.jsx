import './Chip.css';

export default function Chip({ children, icon, variant = 'default', active, onClick, size = 'sm' }) {
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={`chip chip-${variant} chip-${size} ${active ? 'chip-active' : ''} ${onClick ? 'chip-clickable' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {icon && <span className="chip-icon">{icon}</span>}
      {children}
    </Component>
  );
}
