import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit3, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import Button from '../../components/Button';
import './ProviderServices.css';

const SERVICE_META = {
  pg:       { emoji: '🏠', label: 'PG / Rooms' },
  tiffin:   { emoji: '🍱', label: 'Tiffin' },
  laundry:  { emoji: '🧺', label: 'Laundry' },
  cleaning: { emoji: '🧹', label: 'Cleaning' },
};

// Default services by type for display when no DB services exist
const defaultServicesByType = {
  pg: [
    { name: 'Single Room - AC', price: 8500, unit: '/month' },
    { name: 'Shared Room (2 bed)', price: 5500, unit: '/month' },
    { name: 'Shared Room (3 bed)', price: 4000, unit: '/month' },
  ],
  tiffin: [
    { name: 'Veg Thali (Full Day)', price: 2800, unit: '/month' },
    { name: 'Non-Veg Thali', price: 3200, unit: '/month' },
  ],
  laundry: [
    { name: 'Wash + Fold', price: 149, unit: '/kg' },
    { name: 'Premium Wash + Iron', price: 199, unit: '/kg' },
  ],
  cleaning: [
    { name: 'Basic Room Clean', price: 299, unit: '/visit' },
    { name: 'Deep Clean', price: 599, unit: '/visit' },
  ],
};

export default function ProviderServices() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const providerServices = (provider.services || []).map(s => s.toLowerCase());

  // Build service list from provider's selected types
  const initialServices = [];
  let idCounter = 1;
  providerServices.forEach(type => {
    const defaults = defaultServicesByType[type] || [];
    defaults.forEach(s => {
      initialServices.push({ id: idCounter++, ...s, type, active: true });
    });
  });

  const [serviceList, setServiceList] = useState(initialServices);

  const toggleService = (id) => {
    setServiceList(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  // Group services by type
  const groupedServices = {};
  serviceList.forEach(s => {
    if (!groupedServices[s.type]) groupedServices[s.type] = [];
    groupedServices[s.type].push(s);
  });

  return (
    <div className="ps-page" id="provider-services">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>My Services</h1>
      </div>

      <div className="ps-body">
        <div className="ps-add-banner">
          <Plus size={20} />
          <div>
            <h3>Add New Service</h3>
            <p>Create a new pricing plan or offering</p>
          </div>
        </div>

        {Object.entries(groupedServices).map(([type, services]) => {
          const meta = SERVICE_META[type] || { emoji: '📦', label: type };
          return (
            <div key={type} className="ps-group">
              <h3 className="ps-group-title">{meta.emoji} {meta.label}</h3>
              <div className="ps-list">
                {services.map((service, i) => (
                  <div key={service.id} className={`ps-item ${!service.active ? 'ps-disabled' : ''}`}
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="ps-item-info">
                      <h3>{service.name}</h3>
                      <div className="ps-item-price">
                        <span className="ps-price">₹{service.price.toLocaleString()}</span>
                        <span className="ps-unit">{service.unit}</span>
                      </div>
                    </div>
                    <div className="ps-item-actions">
                      <button className="ps-edit"><Edit3 size={14} /></button>
                      <button className="ps-toggle" onClick={() => toggleService(service.id)}>
                        {service.active
                          ? <ToggleRight size={28} className="ps-toggle-on" />
                          : <ToggleLeft size={28} className="ps-toggle-off" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {serviceList.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No services added</h3>
            <p>Add services from onboarding to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}
