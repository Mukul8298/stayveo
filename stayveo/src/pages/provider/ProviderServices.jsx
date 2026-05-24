import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bed, Edit3, Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import EmptyStateCard from '../../components/provider/EmptyStateCard';
import ServiceStatusChip from '../../components/provider/ServiceStatusChip';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import {
  getProviderServiceItems,
  getRoomListings,
  toggleProviderServiceItem,
  toggleRoomListing,
} from '../../api/provider';
import {
  getCreatePath,
  getEditPath,
  getProviderServiceTypes,
  providerServiceConfig,
  SERVICE_TYPES,
} from '../../config/providerServices';
import { calculateRoomInventory } from '../../lib/serviceVisibility';
import './ProviderServices.css';

function ServiceCard({ serviceType, item, onToggle, onEdit }) {
  const config = providerServiceConfig[serviceType];
  const title = item.title || item.name || item.planName || config.label;
  const image = item.images?.[0] || item.coverImage;
  const roomInventory = serviceType === SERVICE_TYPES.PG
    ? calculateRoomInventory(item)
    : null;
  const status = roomInventory?.status || item.status || (item.isActive === false ? 'PAUSED' : 'ACTIVE');

  return (
    <div className={`ps-card ${item.isActive === false ? 'ps-card--disabled' : ''}`}>
      {image ? (
        <div className="ps-card-img"><img src={image} alt={title} /></div>
      ) : (
        <div className="ps-card-img ps-card-img--empty">{config.emoji}</div>
      )}

      <div className="ps-card-body">
        <div className="ps-card-top">
          <h3 className="ps-card-title">{title}</h3>
          <ServiceStatusChip status={status} />
        </div>

        <div className="ps-card-meta">
          <span className="ps-card-type">{item.roomType || item.mealType || item.washType || item.cleaningType || config.label}</span>
          {item.genderPreference && <span className="ps-card-gender">{item.genderPreference}</span>}
        </div>

        <div className="ps-card-stats">
          <div className="ps-card-price">
            <span className="ps-price">₹{(item.price || item.monthlyPrice || item.kgPrice || 0).toLocaleString()}</span>
            <span className="ps-unit">{serviceType === SERVICE_TYPES.PG ? '/month' : serviceType === SERVICE_TYPES.LAUNDRY ? '/kg' : ''}</span>
          </div>
          {roomInventory && (
            <div className="ps-card-beds">
              <Bed size={13} />
              <span>{roomInventory.availableBeds}/{roomInventory.totalBeds} beds</span>
            </div>
          )}
        </div>

        {roomInventory && (
          <div className="ps-inventory-bar">
            <span style={{ width: `${roomInventory.occupancyPercent}%` }} />
          </div>
        )}
      </div>

      <div className="ps-card-actions">
        <button className="ps-edit" onClick={onEdit} title="Edit service">
          <Edit3 size={14} />
        </button>
        <button className="ps-toggle" onClick={onToggle} title={item.isActive === false ? 'Activate' : 'Pause'}>
          {item.isActive !== false
            ? <ToggleRight size={28} className="ps-toggle-on" />
            : <ToggleLeft size={28} className="ps-toggle-off" />}
        </button>
      </div>
    </div>
  );
}

export default function ProviderServices() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const toast = useToast();
  const serviceTypes = useMemo(() => getProviderServiceTypes(provider), [provider]);
  const [itemsByType, setItemsByType] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider.phone) return;

    let cancelled = false;
    async function fetchServices() {
      setLoading(true);
      const next = {};

      for (const type of serviceTypes) {
        try {
          const res = type === SERVICE_TYPES.PG
            ? await getRoomListings(provider.phone)
            : await getProviderServiceItems(provider.phone, type);
          next[type] = res.data || [];
        } catch {
          next[type] = [];
        }
      }

      if (!cancelled) {
        setItemsByType(next);
        setLoading(false);
      }
    }

    fetchServices();
    return () => { cancelled = true; };
  }, [provider.phone, serviceTypes]);

  const allItems = Object.values(itemsByType).flat();
  const activeCount = allItems.filter((item) => item.isActive !== false && item.status !== 'FULL').length;

  async function handleToggle(serviceType, item) {
    const nextActive = item.isActive === false;
    setItemsByType((current) => ({
      ...current,
      [serviceType]: (current[serviceType] || []).map((existing) =>
        existing.id === item.id ? { ...existing, isActive: nextActive } : existing
      ),
    }));

    try {
      if (serviceType === SERVICE_TYPES.PG) {
        await toggleRoomListing(provider.phone, item.id, nextActive);
      } else {
        await toggleProviderServiceItem(provider.phone, serviceType, item.id, nextActive);
      }
    } catch {
      setItemsByType((current) => ({
        ...current,
        [serviceType]: (current[serviceType] || []).map((existing) =>
          existing.id === item.id ? item : existing
        ),
      }));
      toast.error('Could not update visibility');
    }
  }

  return (
    <div className="ps-page" id="provider-services">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>My Services</h1>
      </div>

      <div className="ps-body">
        {!loading && (
          <div className="ps-stats-row">
            <div className="ps-stat">
              <span className="ps-stat-num">{allItems.length}</span>
              <span>Total</span>
            </div>
            <div className="ps-stat-line" />
            <div className="ps-stat">
              <span className="ps-stat-num ps-stat-num--green">{activeCount}</span>
              <span>Active</span>
            </div>
            <div className="ps-stat-line" />
            <div className="ps-stat">
              <span className="ps-stat-num ps-stat-num--amber">{serviceTypes.length}</span>
              <span>Categories</span>
            </div>
          </div>
        )}

        {serviceTypes.map((type) => {
          const config = providerServiceConfig[type];
          return (
            <button
              key={type}
              className="ps-add-banner"
              onClick={() => navigate(getCreatePath(type))}
            >
              <Plus size={20} />
              <div>
                <h3>{config.addLabel}</h3>
                <p>{config.emptyDescription}</p>
              </div>
            </button>
          );
        })}

        {loading && (
          <div className="ps-loading">
            <Loader2 size={24} className="ps-spinner" />
            <p>Loading your services...</p>
          </div>
        )}

        {!loading && serviceTypes.map((type) => {
          const config = providerServiceConfig[type];
          const items = itemsByType[type] || [];
          return (
            <section key={type} className="ps-group">
              <h3 className="ps-group-title">
                <span>{config.emoji}</span>
                {config.groupTitle}
              </h3>

              {items.length > 0 ? (
                <div className="ps-list">
                  {items.map((item) => (
                    <ServiceCard
                      key={item.id}
                      serviceType={type}
                      item={item}
                      onEdit={() => navigate(getEditPath(type, item.id))}
                      onToggle={() => handleToggle(type, item)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyStateCard
                  icon={config.emoji}
                  title={config.emptyTitle}
                  description={config.emptyDescription}
                  ctaLabel={config.addLabel}
                  onAction={() => navigate(getCreatePath(type))}
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
