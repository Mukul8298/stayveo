import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Edit3, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import Button from '../../components/Button';
import './ProviderServices.css';

const mockServices = [
  { id: 1, name: 'Single Room - AC', price: 8500, unit: '/month', active: true, type: 'pg' },
  { id: 2, name: 'Shared Room (2 bed)', price: 5500, unit: '/month', active: true, type: 'pg' },
  { id: 3, name: 'Shared Room (3 bed)', price: 4000, unit: '/month', active: false, type: 'pg' },
  { id: 4, name: 'Wash + Fold', price: 149, unit: '/kg', active: true, type: 'laundry' },
  { id: 5, name: 'Premium Wash + Iron', price: 199, unit: '/kg', active: true, type: 'laundry' },
  { id: 6, name: 'Veg Thali (Full Day)', price: 2800, unit: '/month', active: true, type: 'tiffin' },
  { id: 7, name: 'Non-Veg Thali', price: 3200, unit: '/month', active: true, type: 'tiffin' },
  { id: 8, name: 'Basic Room Clean', price: 299, unit: '/visit', active: true, type: 'cleaning' },
  { id: 9, name: 'Deep Clean', price: 599, unit: '/visit', active: false, type: 'cleaning' },
];

export default function ProviderServices() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];
  const [serviceList, setServiceList] = useState(mockServices.filter(s => types.includes(s.type)));

  const toggleService = (id) => {
    setServiceList(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <div className="ps-page" id="provider-services">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
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

        <div className="ps-list">
          {serviceList.map((service, i) => (
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
    </div>
  );
}
