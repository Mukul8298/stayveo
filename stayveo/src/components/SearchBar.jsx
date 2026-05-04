import { Search } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ placeholder = 'Search PGs, rooms...', value, onChange, onFocus, onClick }) {
  return (
    <div className="search-bar" onClick={onClick}>
      <Search size={18} className="search-bar-icon" />
      <input
        type="text"
        className="search-bar-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
      />
    </div>
  );
}
