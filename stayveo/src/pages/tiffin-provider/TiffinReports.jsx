import { useEffect, useState } from 'react';
import { Download, FileBarChart, TrendingUp } from 'lucide-react';
import { getTiffinReports } from '../../api/tiffinProvider';
import { useProvider } from '../../context/ProviderContext';
import { formatCurrency, formatDate } from './useTiffinProviderRequest';
import { PageHeading, PageState, Stat } from './TiffinDashboard';
import './TiffinProviderPages.css';

export default function TiffinReports() {
  const { provider } = useProvider();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => { let cancelled = false; getTiffinReports(provider).then((response) => { if (!cancelled) setState({ loading: false, error: '', data: response.data }); }).catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, data: null }); }); return () => { cancelled = true; }; }, [provider]);
  if (state.loading) return <PageState label="Loading reports…" />;
  if (state.error) return <PageState error={state.error} />;
  const data = state.data || { summary: {}, payments: [], foodPreferences: [], delivery: {}, renewals: [] };
  function downloadCsv() {
    const rows = [['Customer', 'Amount', 'Due Date', 'Status'], ...data.payments.map((payment) => [payment.customer, payment.amount, formatDate(payment.dueDate), payment.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'tiffin-payment-report.csv'; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="tpv-page"><PageHeading title="Reports" subtitle="Track your customers, payments and meal deliveries." action={<div className="tpv-heading-actions"><button type="button" className="tp-button" onClick={downloadCsv}><Download size={16} /> Download CSV</button><button type="button" className="tp-button tp-button-primary" onClick={downloadCsv}>Export Report</button></div>} /><div className="tpv-stat-grid"><Stat label="Total Customers" value={data.summary.totalCustomers} icon={FileBarChart} /><Stat label="Total Revenue" value={formatCurrency(data.summary.revenue)} icon={TrendingUp} /><Stat label="Paid Customers" value={data.summary.paidCustomers} icon={FileBarChart} /><Stat label="Pending Payments" value={data.summary.pendingPayments} icon={FileBarChart} tone="danger" /></div><div className="tpv-report-grid"><section className="tp-card tpv-table-card"><div className="tpv-card-heading"><h2>Payment Report</h2><button type="button" className="tpv-text-button" onClick={downloadCsv}>View All</button></div><div className="tpv-table-wrap"><table><thead><tr><th>Customer</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead><tbody>{data.payments.length ? data.payments.map((payment) => <tr key={payment.id}><td>{payment.customer}</td><td>{formatCurrency(payment.amount)}</td><td>{formatDate(payment.dueDate)}</td><td><span className={`tpv-status ${payment.status === 'paid' ? 'success' : 'pending'}`}>{payment.status}</span></td></tr>) : <tr><td colSpan="4" className="tpv-empty">No payment records yet.</td></tr>}</tbody></table></div></section><section className="tp-card tpv-preference-card"><h2>Food Preferences</h2>{data.foodPreferences.map((item) => <div className="tpv-preference" key={item.preference}><span>{item.preference}</span><strong>{item.count}</strong><div><i style={{ width: `${data.summary.totalCustomers ? Math.min(100, (item.count / data.summary.totalCustomers) * 100) : 0}%` }} /></div></div>)}</section><section className="tp-card tpv-delivery-overview"><h2>Delivery Overview</h2><strong>{data.delivery.percentage || 0}%</strong><p>Delivered</p><div className="tpv-progress"><i style={{ width: `${data.delivery.percentage || 0}%` }} /></div><span>{data.delivery.delivered || 0} delivered · {data.delivery.pending || 0} pending</span></section><section className="tp-card tpv-renewals"><h2>Renewals Coming Up</h2>{data.renewals.length ? data.renewals.map((item, index) => <div className="tpv-renewal" key={`${item.customer}-${index}`}><span>{item.customer}</span><small>{item.plan}</small><strong>{formatDate(item.expiryDate)}</strong></div>) : <div className="tpv-empty">No upcoming renewals.</div>}</section></div></div>;
}
