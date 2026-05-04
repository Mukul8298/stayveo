import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Briefcase, User } from 'lucide-react';
import './BottomNav.css';

const tabs = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/roommate', icon: Heart, label: 'Match' },
  { path: '/services', icon: Briefcase, label: 'Services' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  return (
    <nav className="bottom-nav" id="bottom-navigation">
      {tabs.map(tab => {
        const isActive = current.startsWith(tab.path);
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
            id={`nav-${tab.label.toLowerCase()}`}
          >
            <div className="bottom-nav-icon">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && <div className="nav-dot" />}
            </div>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
