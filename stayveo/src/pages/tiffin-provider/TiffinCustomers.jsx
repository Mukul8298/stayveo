import { useEffect, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { createTiffinCustomer, getTiffinCustomers } from '../../api/tiffinProvider';
import { useToast } from '../../context/ToastContext';
import { useProvider } from '../../context/ProviderContext';
import { formatDate } from './useTiffinProviderRequest';
import { PageHeading, PageState, Stat } from './TiffinDashboard';
import './TiffinProviderPages.css';

export default function TiffinCustomers() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [reload, setReload] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ phone: '', planId: '', foodPreference: 'veg', deliveryAddress: '' });
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const { provider } = useProvider();

  useEffect(() => {
    let cancelled = false;
    getTiffinCustomers(provider, { search: query, status: filter })
      .then((response) => { if (!cancelled) setState({ loading: false, error: '', data: response.data }); })
      .catch((error) => { if (!cancelled) { setState({ loading: false, error: error.message, data: null }); toast.error(error.message); } });
    return () => { cancelled = true; };
  }, [filter, provider, query, reload, toast]);

  async function addCustomer(event) {
    event.preventDefault();
    try {
      await createTiffinCustomer(provider, newCustomer);
      toast.success('Customer added');
      setShowAdd(false);
      setNewCustomer({ phone: '', planId: '', foodPreference: 'veg', deliveryAddress: '' });
      setReload((value) => value + 1);
    } catch (error) { toast.error(error.message); }
  }

  if (state.loading) return <PageState label="Loading customers…" />;
  if (state.error) return <PageState error={state.error} />;
  const data = state.data || { summary: {}, items: [] };
  return <div className="tpv-page"><PageHeading title="Customers" subtitle="Manage your active tiffin customers and their subscriptions." action={<button type="button" className="tp-button tp-button-primary" onClick={() => setShowAdd(true)}><UserPlus size={16} /> Add Customer</button>} />
    <div className="tpv-stat-grid"><Stat label="Total Customers" value={data.summary.total} icon={UsersIcon} /><Stat label="Active Subscriptions" value={data.summary.active} icon={CheckIcon} /><Stat label="Renewals This Week" value={data.summary.renewalsThisWeek} icon={CalendarIcon} /><Stat label="Pending Payments" value={data.summary.pendingPayments} icon={PaymentIcon} tone="danger" /></div>
    <section className="tp-card tpv-table-card"><div className="tpv-table-toolbar"><label className="tpv-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or college…" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending</option></select></div><div className="tpv-table-wrap"><table><thead><tr><th>Customer</th><th>College</th><th>Room / Address</th><th>Food Preference</th><th>Subscription</th><th>Renewal Date</th><th>Payment</th></tr></thead><tbody>{data.items.length ? data.items.map((customer) => <tr key={customer.subscriptionId}><td><a href={`/provider/tiffin/customers/${customer.id}`} className="tpv-customer-link"><span className="tpv-initials">{customer.name?.slice(0, 2).toUpperCase()}</span>{customer.name}</a></td><td>{customer.college}</td><td>{customer.address}</td><td><span className="tpv-chip">{customer.foodPreference}</span></td><td>{customer.subscription}</td><td>{formatDate(customer.renewalDate)}</td><td><span className={`tpv-status ${customer.paymentStatus === 'paid' ? 'success' : 'pending'}`}>{customer.paymentStatus}</span></td></tr>) : <tr><td colSpan="7" className="tpv-empty">No customers found.</td></tr>}</tbody></table></div></section>
    {showAdd && <div className="tpv-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false); }}><form className="tp-card tpv-modal" onSubmit={addCustomer}><div className="tpv-card-heading"><h2>Add Customer</h2><button type="button" className="tpv-text-button" onClick={() => setShowAdd(false)}>Close</button></div><div className="tpv-modal-body"><label><span>Student phone number</span><input required value={newCustomer.phone} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="9876543210" /></label><label><span>Plan</span><select required value={newCustomer.planId} onChange={(event) => setNewCustomer((current) => ({ ...current, planId: event.target.value }))}><option value="">Choose a plan</option>{(data.plans || []).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · ₹{plan.price}</option>)}</select></label><label><span>Food preference</span><select value={newCustomer.foodPreference} onChange={(event) => setNewCustomer((current) => ({ ...current, foodPreference: event.target.value }))}><option value="veg">Veg</option><option value="nonveg">Non-Veg</option><option value="jain">Jain</option></select></label><label><span>Delivery address (optional)</span><textarea rows="3" value={newCustomer.deliveryAddress} onChange={(event) => setNewCustomer((current) => ({ ...current, deliveryAddress: event.target.value }))} /></label></div><div className="tpv-modal-actions"><button type="button" className="tp-button" onClick={() => setShowAdd(false)}>Cancel</button><button type="submit" className="tp-button tp-button-primary">Add Customer</button></div></form></div>}
  </div>;
}

function UsersIcon(props) { return <span {...props}>♙</span>; }
function CheckIcon(props) { return <span {...props}>✓</span>; }
function CalendarIcon(props) { return <span {...props}>▣</span>; }
function PaymentIcon(props) { return <span {...props}>₹</span>; }
