import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Truck } from 'lucide-react';
import { getTiffinDeliveries, markAllTiffinDeliveries, updateTiffinDelivery } from '../../api/tiffinProvider';
import { useProvider } from '../../context/ProviderContext';
import { useToast } from '../../context/ToastContext';
import { PageHeading, PageState, Stat } from './TiffinDashboard';
import './TiffinProviderPages.css';

export default function TiffinDeliveries() {
  const { provider } = useProvider();
  const toast = useToast();
  const [meal, setMeal] = useState('lunch');
  const [status, setStatus] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => { let cancelled = false; getTiffinDeliveries(provider, { meal, status }).then((response) => { if (!cancelled) setState({ loading: false, error: '', data: response.data }); }).catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, data: null }); }); return () => { cancelled = true; }; }, [meal, provider, refresh, status]);
  const data = state.data || { kitchen: {}, summary: {}, items: [] };
  const pending = useMemo(() => data.items.filter((item) => !['delivered', 'skipped', 'cancelled'].includes(item.status)), [data.items]);
  async function mark(id, delivered = true) { try { await updateTiffinDelivery(provider, id, delivered); toast.success(delivered ? 'Marked as delivered' : 'Moved back to pending'); setRefresh((value) => value + 1); } catch (error) { toast.error(error.message); } }
  async function markAll() { try { await markAllTiffinDeliveries(provider, pending.map((item) => item.id)); toast.success('Visible deliveries marked as delivered'); setRefresh((value) => value + 1); } catch (error) { toast.error(error.message); } }
  if (state.loading) return <PageState label="Loading today's deliveries…" />;
  if (state.error) return <PageState error={state.error} />;
  return <div className="tpv-page"><PageHeading title="Today's Deliveries" subtitle="Manage today's lunch and dinner deliveries." action={<button type="button" className="tp-button tp-button-primary" onClick={markAll} disabled={!pending.length}><CheckCircle2 size={16} /> Mark All Visible as Delivered</button>} /><div className="tpv-kitchen-strip tp-card"><span><i /> KITCHEN: {String(data.kitchen.status || '—').toUpperCase()}</span><span>Verification: {String(data.kitchen.verificationStatus || '—').toUpperCase()}</span></div><div className="tpv-stat-grid"><Stat label="Total Meals" value={data.summary.total} icon={Truck} /><Stat label="Pending Deliveries" value={data.summary.pending} icon={Clock3} tone="danger" /><Stat label="Delivered" value={data.summary.delivered} icon={CheckCircle2} tone="success" /><Stat label="Dinner Remaining" value={data.summary.dinnerRemaining ?? 0} icon={Clock3} /></div><div className="tpv-filter-row"><div className="tpv-tabs">{['lunch', 'dinner'].map((value) => <button type="button" key={value} className={meal === value ? 'is-active' : ''} onClick={() => setMeal(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div><div className="tpv-tabs tpv-status-tabs">{['all', 'pending', 'delivered'].map((value) => <button type="button" key={value} className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><section className="tp-card tpv-table-card"><div className="tpv-table-wrap"><table><thead><tr><th>Student</th><th>Room</th><th>College</th><th>Preference</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.items.length ? data.items.map((item) => <tr key={item.id}><td><strong>{item.student}</strong><small>{item.phone}</small></td><td>{item.room}</td><td>{item.college}</td><td><span className="tpv-chip">{item.preference}</span></td><td><span className={`tpv-status ${item.status === 'delivered' ? 'success' : item.status === 'skipped' || item.status === 'cancelled' ? '' : 'pending'}`}>{item.status}</span></td><td>{item.status === 'delivered' ? <button type="button" className="tpv-text-button" onClick={() => mark(item.id, false)}>Undo</button> : ['skipped', 'cancelled'].includes(item.status) ? <span className="tpv-muted">No action</span> : <button type="button" className="tp-button tpv-row-action" onClick={() => mark(item.id)}>Mark Delivered</button>}</td></tr>) : <tr><td colSpan="6" className="tpv-empty">No deliveries match these filters.</td></tr>}</tbody></table></div></section></div>;
}
