import './Button.css';

export default function Button({ children, variant = 'primary', size = 'md', icon, fullWidth, onClick, disabled, className = '' }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
