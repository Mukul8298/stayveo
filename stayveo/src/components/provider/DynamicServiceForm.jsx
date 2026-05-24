import { useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import LocationPicker from '../maps/LocationPicker';
import { providerServiceConfig, serviceSectionLabels } from '../../config/providerServices';
import PhotoUploadGrid from './PhotoUploadGrid';
import './ServiceManagement.css';

function FieldRenderer({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className="svc-input svc-textarea"
        value={value || ''}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        rows={4}
      />
    );
  }

  if (field.type === 'chips' || field.type === 'multiChips') {
    const isMulti = field.type === 'multiChips';
    const selected = isMulti ? value || [] : value;
    return (
      <div className="svc-chip-row">
        {field.options.map((option) => {
          const active = isMulti ? selected.includes(option) : selected === option;
          return (
            <button
              key={option}
              type="button"
              className={`svc-chip ${active ? 'svc-chip--active' : ''}`}
              onClick={() => {
                if (!isMulti) onChange(field.name, option);
                else onChange(field.name, active ? selected.filter((item) => item !== option) : [...selected, option]);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === 'toggle') {
    return (
      <button
        type="button"
        className={`svc-toggle ${value ? 'svc-toggle--on' : ''}`}
        onClick={() => onChange(field.name, !value)}
        role="switch"
        aria-checked={!!value}
      >
        <span>{value ? 'Enabled' : 'Disabled'}</span>
        <i />
      </button>
    );
  }

  return (
    <input
      className="svc-input"
      type={field.type}
      value={value || ''}
      onChange={(event) => onChange(field.name, event.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      min={field.type === 'number' ? 0 : undefined}
    />
  );
}

export default function DynamicServiceForm({
  serviceType,
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  providerId,
}) {
  const config = providerServiceConfig[serviceType];
  const [form, setForm] = useState(() => ({ ...config.initialValues, ...(initialValues || {}) }));

  const fieldsBySection = useMemo(() => {
    return config.fields.reduce((acc, field) => {
      const section = field.section || 'basics';
      acc[section] ||= [];
      acc[section].push(field);
      return acc;
    }, {});
  }, [config.fields]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : undefined,
      weeklyPrice: form.weeklyPrice ? Number(form.weeklyPrice) : undefined,
      kgPrice: form.kgPrice ? Number(form.kgPrice) : undefined,
      perClothPrice: form.perClothPrice ? Number(form.perClothPrice) : undefined,
      price: form.price ? Number(form.price) : undefined,
      serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
    });
  }

  const isValid = !config.fields.some((field) => field.required && !form[field.name]);

  return (
    <form className="svc-form" onSubmit={handleSubmit}>
      <div className="svc-live-preview" style={{ borderColor: config.bg }}>
        <div className="svc-live-icon" style={{ background: config.bg, color: config.accent }}>
          {config.emoji}
        </div>
        <div>
          <h3>{form.name || config.createTitle}</h3>
          <p>{form.isActive ? 'Visible after publishing' : 'Paused and hidden from students'}</p>
        </div>
      </div>

      {Object.entries(fieldsBySection).map(([sectionKey, fields]) => {
        const section = serviceSectionLabels[sectionKey] || { title: sectionKey };
        const SectionIcon = section.icon;
        return (
          <section key={sectionKey} className="svc-form-section">
            <h3 className="svc-section-title">
              {SectionIcon && <SectionIcon size={15} />}
              {section.title}
            </h3>
            {fields.map((field) => (
              <label key={field.name} className="svc-field">
                <span>
                  {field.label}
                </span>
                <FieldRenderer field={field} value={form[field.name]} onChange={setField} />
              </label>
            ))}
            {sectionKey === 'location' && (
              <LocationPicker
                latitude={typeof form.latitude === 'number' ? form.latitude : undefined}
                longitude={typeof form.longitude === 'number' ? form.longitude : undefined}
                address={form.address}
                onChange={(location) => {
                  setForm((current) => ({
                    ...current,
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }));
                }}
              />
            )}
          </section>
        );
      })}

      <section className="svc-form-section">
        <h3 className="svc-section-title">Photos</h3>
        <PhotoUploadGrid
          images={form.images}
          coverImage={form.coverImage}
          providerId={providerId}
          serviceType={serviceType.toLowerCase()}
          onChange={({ images, coverImage }) => setForm((current) => ({ ...current, images, coverImage }))}
        />
      </section>

      <section className="svc-form-section">
        <h3 className="svc-section-title">Visibility</h3>
        <button
          type="button"
          className={`svc-visibility ${form.isActive ? 'svc-visibility--on' : ''}`}
          onClick={() => setField('isActive', !form.isActive)}
        >
          <span>{form.isActive ? 'Active - students can see this' : 'Paused - hidden from students'}</span>
          <i />
        </button>
      </section>

      <div className="svc-sticky-submit">
        <button type="submit" disabled={!isValid || loading}>
          {loading ? <Loader2 size={18} className="spinning" /> : <Save size={18} />}
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
