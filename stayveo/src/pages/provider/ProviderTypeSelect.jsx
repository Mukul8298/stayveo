import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import Button from '../../components/Button';
import { providerTypes } from '../../data/mockData';
import { useProvider } from '../../context/ProviderContext';
import { saveSelectType } from '../../api/provider';
import { useToast } from '../../context/ToastContext';
import './ProviderTypeSelect.css';

export default function ProviderTypeSelect() {
  const navigate = useNavigate();
  const toast = useToast();
  const { updateProvider } = useProvider();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (key) => {
    setSelected(key);
  };

  async function continueToSelectedService() {
    if (!selected) return;
    const type = selected.toUpperCase();

    setLoading(true);
    try {
      await saveSelectType(type);

      updateProvider({
        services: [type],
        activeServiceType: type,
      });

      if (type === 'TIFFIN') {
        navigate('/provider/tiffin/onboarding');
      } else {
        navigate('/provider/pg/onboarding');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save provider type');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pts-page" id="provider-type-select">
      <button className="pts-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </button>

      <div className="pts-header">
        <h1>What do you provide?</h1>
        <p>Select the service you want to offer</p>
      </div>

      <div className="pts-grid">
        {providerTypes.map((type, i) => {
          const isSelected = selected === type.key;
          return (
            <button
              key={type.key}
              className={`pts-card ${isSelected ? 'pts-card-selected' : ''}`}
              onClick={() => handleSelect(type.key)}
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
          disabled={!selected || loading}
          onClick={continueToSelectedService}
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
