import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, CirclePause, CircleX, Clock3, PlayCircle, RefreshCw, Users } from 'lucide-react';
import { getTiffinDashboard, getTiffinMealChanges, updateTiffinDelivery } from '../../api/tiffinProvider';
import { useToast } from '../../context/ToastContext';
import { useTiffinProviderRequest } from './useTiffinProviderRequest';
import './TiffinProviderPages.css';

export default function TiffinDashboard() {
  const toast = useToast();
  const [refresh, setRefresh] = useState(0);
  const [changeFilter, setChangeFilter] = useState('');
  const [changeState, setChangeState] = useState({ loading: true, error: '', data: null });
  const { data, loading, error, provider } = useTiffinProviderRequest(getTiffinDashboard, [refresh]);
  const dashboard = data || { metrics: {}, deliveries: [], foodSummary: [] };
  const metrics = dashboard.metrics || {};
  const changes = changeState.data || { items: [], counts: { all: 0, skipped: 0, paused: 0, resumed: 0 } };

  useEffect(() => {
    let cancelled = false;
    getTiffinMealChanges(provider, changeFilter).then((response) => {
      if (!cancelled) setChangeState({ loading: false, error: '', data: response.data });
    }).catch((requestError) => {
      if (!cancelled) setChangeState({ loading: false, error: requestError.message || 'Unable to load meal changes', data: null });
    });
    return () => { cancelled = true; };
  }, [changeFilter, provider, refresh]);

  async function markDelivered(id) {
    try {
      await updateTiffinDelivery(provider, id, true);
      toast.success('Meal marked as delivered');
      setRefresh((value) => value + 1);
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageState label="Loading your Tiffin dashboard…" />;
  if (error) return <PageState error={error} />;
  if (!dashboard.kitchen) return <div className="tpv-empty tp-card"><h2>Finish setting up your Tiffin service</h2><p>Complete onboarding to activate the provider workspace.</p><a className="tp-button tp-button-primary" href="/provider/tiffin/onboarding">Continue onboarding</a></div>;

  return <div className="tpv-page">
    <PageHeading title="Dashboard" subtitle="Your Tiffin operations at a glance." action={<button type="button" className="tp-button" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} /> Refresh</button>} />
    <div className="tpv-stat-grid">
      <Stat label="Active Students" value={metrics.activeStudents} icon={Users} />
      <Stat label="Today's Meals" value={metrics.todaysMeals} icon={Clock3} />
      <Stat label="Pending Deliveries" value={metrics.pendingDeliveries} icon={CircleAlert} tone="danger" />
      <Stat label="Delivered Meals" value={metrics.deliveredMeals} icon={CheckCircle2} tone="success" />
    </div>
    <div className="tpv-status-strip tp-card"><span className="tpv-status-pill"><span /> {dashboard.kitchen.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'VERIFICATION PENDING'}</span><span>KITCHEN: <strong>{String(dashboard.kitchen.status || '').toUpperCase()}</strong></span></div>
    <div className="tpv-two-column">
      <section className="tp-card tpv-list-card"><div className="tpv-card-heading"><h2>Today's Deliveries</h2><a href="/provider/tiffin/deliveries">View all</a></div>{dashboard.deliveries.length ? dashboard.deliveries.map((delivery) => <div className="tpv-delivery-row" key={delivery.id}><div className="tpv-initials">{delivery.student?.slice(0, 2).toUpperCase()}</div><div className="tpv-row-copy"><strong>{delivery.student}</strong><span><b>{delivery.meal}</b> · {delivery.room}</span></div>{delivery.status === 'delivered' ? <span className="tpv-status success">Delivered</span> : delivery.status === 'skipped' || delivery.status === 'cancelled' ? <span className="tpv-status">{delivery.status}</span> : <button type="button" className="tp-button tp-button-primary tpv-row-action" onClick={() => markDelivered(delivery.id)}>Mark Delivered</button>}</div>) : <div className="tpv-empty">No meals scheduled for today.</div>}</section>
      <section className="tp-card tpv-summary-card"><div className="tpv-card-heading"><h2>Kitchen Summary</h2></div><div className="tpv-summary-total"><span>Total Meals</span><strong>{dashboard.kitchenSummary?.totalMeals ?? metrics.todaysMeals ?? 0}</strong></div><div className="tpv-summary-line"><span>Lunch</span><strong>{dashboard.kitchenSummary?.lunch ?? 0}</strong></div><div className="tpv-summary-line"><span>Dinner</span><strong>{dashboard.kitchenSummary?.dinner ?? 0}</strong></div><div className="tpv-summary-line"><span>Skipped</span><strong>{dashboard.kitchenSummary?.skipped ?? 0}</strong></div><div className="tpv-summary-line"><span>Paused Students</span><strong>{dashboard.kitchenSummary?.pausedStudents ?? 0}</strong></div>{dashboard.foodSummary.map((item) => <div className="tpv-summary-line" key={item.preference}><span>{item.preference[0].toUpperCase() + item.preference.slice(1)}</span><strong>{item.count}</strong></div>)}{!dashboard.foodSummary.length && <div className="tpv-empty">No active food preferences yet.</div>}</section>
    </div>
    <MealChanges state={changeState} data={changes} filter={changeFilter} onFilter={setChangeFilter} />
  </div>;
}

function MealChanges({ state, data, filter, onFilter }) {
  const filters = [
    { value: '', label: 'All', count: data.counts.all },
    { value: 'skipped', label: 'Skipped', count: data.counts.skipped },
    { value: 'paused', label: 'Paused', count: data.counts.paused },
    { value: 'resumed', label: 'Resumed', count: data.counts.resumed },
  ];
  return <section className="tp-card tpv-meal-changes"><div className="tpv-card-heading"><div><h2>Meal Changes</h2><p>Recent changes that affect your meal planning</p></div></div><div className="tpv-change-filters">{filters.map((item) => <button type="button" key={item.value || 'all'} className={filter === item.value ? 'is-active' : ''} onClick={() => onFilter(item.value)}>{item.label} ({item.count})</button>)}</div>{state.loading ? <div className="tpv-empty">Loading meal changes…</div> : state.error ? <div className="tpv-empty tpv-empty-error">{state.error}</div> : data.items.length ? <div className="tpv-change-list">{data.items.map((item) => <MealChangeRow key={item.id} item={item} />)}</div> : <div className="tpv-empty">No meal changes recorded.</div>}</section>;
}

function MealChangeRow({ item }) {
  const details = item.eventType === 'skipped'
    ? `${item.meal ? `${item.meal[0].toUpperCase()}${item.meal.slice(1)} skipped` : 'Meal skipped'}${item.mealDate ? `, ${item.mealDate}` : ''}`
    : item.eventType === 'paused'
      ? `Subscription paused${item.startDate && item.endDate ? `, ${item.startDate} – ${item.endDate}` : ''}`
      : `Subscription resumed${item.startDate ? ` from ${item.startDate}` : ''}`;
  const Icon = item.eventType === 'skipped' ? CircleX : item.eventType === 'paused' ? CirclePause : PlayCircle;
  return <div className="tpv-change-row"><span className={`tpv-change-icon ${item.eventType}`}><Icon size={18} /></span><div className="tpv-change-copy"><strong>{item.student}</strong><span>{details}</span><small>{item.description}</small></div><time>{formatRelative(item.createdAt)}</time></div>;
}

function formatRelative(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function PageHeading({ title, subtitle, action }) { return <div className="tpv-page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Stat({ label, value, icon: Icon, tone = '' }) { return <div className="tp-card tpv-stat"><div><span>{label}</span><strong className={tone}>{value ?? 0}</strong></div><Icon size={21} /></div>; }
function PageState({ label, error }) { return <div className={`tpv-state${error ? ' is-error' : ''}`}>{error || label}</div>; }

export { PageHeading, PageState, Stat };
