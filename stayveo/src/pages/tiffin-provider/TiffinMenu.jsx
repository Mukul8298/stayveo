import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { getTiffinMenu, saveTiffinMenu } from '../../api/tiffinProvider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { PageHeading, PageState } from './TiffinDashboard';
import './TiffinProviderPages.css';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = ['lunch', 'dinner'];
const DIETS = ['veg', 'nonveg', 'jain'];

function emptyMenus() {
  return DAYS.flatMap((day) => MEALS.map((meal) => ({ day, meal, items: [] })));
}

function emptyDietMenus() {
  return Object.fromEntries(DIETS.map((diet) => [diet, emptyMenus()]));
}

function hydrateMenus(response) {
  const next = emptyDietMenus();
  for (const saved of response?.data?.items || []) {
    const itemsByDiet = Array.isArray(saved.items) ? { veg: saved.items } : saved.items || {};
    for (const diet of DIETS) {
      const slot = next[diet].find((item) => item.day === saved.day && item.meal === saved.meal);
      if (slot) slot.items = Array.isArray(itemsByDiet[diet]) ? itemsByDiet[diet] : [];
    }
  }
  return next;
}

export default function TiffinMenu() {
  const { provider } = useProvider();
  const toast = useToast();
  const [activeDiet, setActiveDiet] = useState('veg');
  const [menusByDiet, setMenusByDiet] = useState(emptyDietMenus);
  const [expandedDays, setExpandedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTiffinMenu(provider)
      .then((response) => {
        if (cancelled) return;
        const next = hydrateMenus(response);
        setMenusByDiet(next);
        setExpandedDays(DAYS.filter((day) => DIETS.some((diet) => next[diet].filter((slot) => slot.day === day).some((slot) => slot.items.length))));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provider, toast]);

  const menus = menusByDiet[activeDiet];

  function updateItem(day, meal, items) {
    setMenusByDiet((current) => ({
      ...current,
      [activeDiet]: current[activeDiet].map((slot) => slot.day === day && slot.meal === meal ? { ...slot, items } : slot),
    }));
  }

  function addItem(day, meal) {
    const slot = menus.find((item) => item.day === day && item.meal === meal);
    if (!slot) return;
    setExpandedDays((current) => current.includes(day) ? current : [...current, day]);
    updateItem(day, meal, [...slot.items, '']);
  }

  function updateAt(day, meal, index, value) {
    const slot = menus.find((item) => item.day === day && item.meal === meal);
    if (!slot) return;
    updateItem(day, meal, slot.items.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  async function save() {
    const merged = emptyMenus().map((slot) => ({
      ...slot,
      items: Object.fromEntries(DIETS.map((diet) => [diet, menusByDiet[diet].find((item) => item.day === slot.day && item.meal === slot.meal)?.items.map((item) => item.trim()) || []])),
    }));
    const hasInvalidItem = merged.some((slot) => DIETS.some((diet) => slot.items[diet].some((item) => !item || item.length > 120)));
    if (hasInvalidItem) {
      toast.error('Complete or remove empty menu items. Items must be 120 characters or fewer.');
      return;
    }
    setSaving(true);
    try {
      const response = await saveTiffinMenu(provider, merged);
      setMenusByDiet(hydrateMenus(response));
      toast.success('Menu saved');
    } catch (error) {
      toast.error(error.message || 'Unable to save the menu');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageState label="Loading weekly menu…" />;
  return <div className="tpv-page"><PageHeading title="Menu" subtitle="Plan and update your weekly meals." action={<div className="tpv-heading-actions"><button type="button" className="tp-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}</button><button type="button" className="tp-button tp-button-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Publish Menu'}</button></div>} /><div className="tpv-tabs tpv-menu-tabs">{DIETS.map((diet) => <button type="button" key={diet} className={activeDiet === diet ? 'is-active' : ''} onClick={() => setActiveDiet(diet)}>{diet === 'nonveg' ? 'Non-Veg' : diet[0].toUpperCase() + diet.slice(1)} Menu</button>)}</div><div className="tpv-menu-board">{DAYS.map((day) => {
    const slots = menus.filter((slot) => slot.day === day);
    const hasMeals = slots.some((slot) => slot.items.length);
    const isEditing = expandedDays.includes(day) || hasMeals;
    return <section className={`tp-card tpv-day-card${isEditing ? '' : ' tpv-day-empty'}`} key={day}>
      {isEditing ? <><div className="tpv-day-title"><h2>{day[0].toUpperCase() + day.slice(1)}</h2><span>{activeDiet} menu</span></div>{slots.map((slot) => <MealEditor key={slot.meal} slot={slot} onAdd={() => addItem(slot.day, slot.meal)} onUpdate={(index, value) => updateAt(slot.day, slot.meal, index, value)} onRemove={(index) => updateItem(slot.day, slot.meal, slot.items.filter((_, itemIndex) => itemIndex !== index))} />)}</> : <><h2>{day[0].toUpperCase() + day.slice(1)}</h2><p>No meals planned yet</p><button type="button" className="tp-button" onClick={() => setExpandedDays((current) => current.includes(day) ? current : [...current, day])}><Plus size={15} /> Plan Day</button></>}
    </section>;
  })}</div></div>;
}

function MealEditor({ slot, onAdd, onUpdate, onRemove }) { return <div className="tpv-meal-editor"><div className="tpv-meal-label">{slot.meal}</div>{slot.items.map((item, index) => <div className="tpv-menu-input" key={`${slot.meal}-${index}`}><input value={item} onChange={(event) => onUpdate(index, event.target.value)} placeholder="Meal item" /><button type="button" onClick={() => onRemove(index)} aria-label="Remove item"><Trash2 size={14} /></button></div>)}<button type="button" className="tpv-add-item" onClick={onAdd}><Plus size={14} /> Add Item</button></div>; }
