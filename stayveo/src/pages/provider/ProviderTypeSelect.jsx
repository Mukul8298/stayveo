import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import Button from '../../components/Button';
import { providerTypes } from '../../data/mockData';
import './ProviderTypeSelect.css';

export default function ProviderTypeSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="pts-page" id="provider-type-select">
      <button className="pts-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </button>

      <div className="pts-header">
        <h1>What do you provide?</h1>
        <p>Select one or more services you offer</p>
      </div>

      <div className="pts-grid">
        {providerTypes.map((type, i) => {
          const isSelected = selected.includes(type.key);
          return (
            <button
              key={type.key}
              className={`pts-card ${isSelected ? 'pts-card-selected' : ''}`}
              onClick={() => toggle(type.key)}
              style={{
                '--card-color': type.color,
                '--card-bg': type.bgColor,
                animationDelay: `${i * 0.08}s`,
              }}
              id={`provider-${type.key}`}
            >
              {isSelected && (
                <div className="pts-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
              <div className="pts-emoji">{type.emoji}</div>
              <h3>{type.label}</h3>
              <p>{type.description}</p>
            </button>
          );
        })}
      </div>

      <div className="pts-footer">
        <Button
          variant="accent"
          fullWidth
          size="lg"
          disabled={selected.length === 0}
          onClick={() => navigate('/provider/onboarding', { state: { types: selected } })}
        >
          Continue ({selected.length} selected)
        </Button>
      </div>
    </div>
  );
}
