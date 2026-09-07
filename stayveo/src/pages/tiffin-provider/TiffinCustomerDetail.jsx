import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Phone, RefreshCw, Utensils } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTiffinCustomer } from '../../api/tiffinProvider';
import { useProvider } from '../../context/ProviderContext';
import { formatCurrency, formatDate } from './useTiffinProviderRequest';
import { PageState } from './TiffinDashboard';
import './TiffinProviderPages.css';

export default function TiffinCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { provider } = useProvider();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => { let cancelled = false; getTiffinCustomer(provider, id).then((response) => { if (!cancelled) setState({ loading: false, error: '', data: response.data }); }).catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, data: null }); }); return () => { cancelled = true; }; }, [id, provider]);
  if (state.loading) return <PageState label="Loading customer…" />;
  if (state.error) return <PageState error={state.error} />;
  const customer = state.data.customer;
  const subscription = state.data.subscriptions?.[0];
  return <div className="tpv-page"><button type="button" className="tpv-back-link" onClick={() => navigate('/provider/tiffin/customers')}><ArrowLeft size={17} /> Back to Customers</button><div className="tpv-profile-heading"><div className="tpv-profile-avatar">{customer.name?.slice(0, 2).toUpperCase()}</div><div><h1>{customer.name}</h1><span className="tpv-status success">Active Subscriber</span></div><div className="tpv-profile-actions"><button type="button" className="tp-button"><CreditCard size={16} /> View Payments</button><button type="button" className="tp-button tp-button-primary"><RefreshCw size={16} /> Renew Subscription</button></div></div><div className="tpv-detail-grid"><section className="tp-card tpv-detail-card"><h2><Phone size={19} /> Student Details</h2><div className="tpv-detail-fields"><Detail label="Phone" value={customer.phone} /><Detail label="Dietary Preference" value={customer.foodPreference} /><Detail label="College / Institute" value={customer.college} /><Detail label="Delivery Address" value={customer.address} full /></div></section><section className="tp-card tpv-detail-card"><h2><CreditCard size={19} /> Subscription</h2><div className="tpv-plan-highlight"><small>Current plan</small><strong>{customer.subscription}</strong><span className="tpv-status success">{customer.status}</span></div><div className="tpv-detail-fields"><Detail label="Start Date" value={formatDate(subscription?.startDate)} /><Detail label="Renewal Date" value={formatDate(customer.renewalDate)} /></div></section><section className="tp-card tpv-detail-card"><h2><CreditCard size={19} /> Recent Payments</h2>{subscription?.payments?.length ? subscription.payments.map((payment) => <div className="tpv-history-row" key={payment.id}><span>{formatDate(payment.createdAt)}</span><strong>{formatCurrency(payment.totalAmount)}</strong><span className={`tpv-status ${String(payment.status).toLowerCase() === 'paid' ? 'success' : 'pending'}`}>{String(payment.status).toLowerCase()}</span></div>) : <div className="tpv-empty">No payments recorded.</div>}</section><section className="tp-card tpv-detail-card"><h2><Utensils size={19} /> Recent Deliveries</h2>{state.data.recentDeliveries?.length ? state.data.recentDeliveries.map((delivery) => <div className="tpv-history-row" key={delivery.id}><span>{delivery.meal} · {formatDate(delivery.date)}</span><span className="tpv-status success">{delivery.status}</span></div>) : <div className="tpv-empty">No deliveries recorded.</div>}</section></div></div>;
}

function Detail({ label, value, full }) { return <div className={`tpv-detail-field${full ? ' full' : ''}`}><small>{label}</small><strong>{value || '—'}</strong></div>; }
