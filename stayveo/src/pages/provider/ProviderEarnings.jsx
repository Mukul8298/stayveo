import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Loader } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { getProviderEarnings } from '../../api/booking';
import './ProviderEarnings.css';

const periods = ['Daily', 'Weekly', 'Monthly'];

const TYPE_LABELS = {
  RENT: '🏠 Room Rent',
  LAUNDRY: '🧺 Laundry',
  CLEANING: '🧹 Cleaning',
  TIFFIN: '🍱 Tiffin',
};

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const providerId = provider.providerId;
  const [activePeriod, setActivePeriod] = useState('Monthly');
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) { setLoading(false); return; }
    getProviderEarnings(providerId)
      .then(res => setEarnings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [providerId]);

  const periodAmount = !earnings ? 0 :
    activePeriod === 'Daily' ? earnings.today :
    activePeriod === 'Weekly' ? earnings.thisWeek : earnings.thisMonth;

  const periodOrders = !earnings ? 0 :
    activePeriod === 'Daily' ? earnings.todayOrders :
    activePeriod === 'Weekly' ? earnings.thisWeekOrders : earnings.thisMonthOrders;

  const lastMonth = earnings?.lastMonth || 0;
  const thisMonth = earnings?.thisMonth || 0;
  const percentChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  return (
    <div className="pe-page" id="provider-earnings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Earnings</h1>
      </div>

      {loading ? (
        <div className="empty-state">
          <Loader size={32} className="spinning" />
          <p style={{ marginTop: 12 }}>Loading earnings...</p>
        </div>
      ) : (
        <>
          {/* Period Tabs */}
          <div className="pe-periods">
            {periods.map(p => (
              <button key={p} className={`pe-period ${activePeriod === p ? 'active' : ''}`}
                onClick={() => setActivePeriod(p)}>{p}</button>
            ))}
          </div>

          {/* Total Amount */}
          <div className="pe-total-card">
            <div className="pe-total-label"><TrendingUp size={16} /> {activePeriod} Earnings</div>
            <div className="pe-total-amount">₹{periodAmount.toLocaleString()}</div>
            <div className="pe-compare">
              {periodOrders} order{periodOrders !== 1 ? 's' : ''}
              {activePeriod === 'Monthly' && lastMonth > 0 && (
                <span className={percentChange >= 0 ? 'pe-trend-up' : 'pe-trend-down'}>
                  {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange)}% vs last month
                </span>
              )}
            </div>
          </div>

          {/* Breakdown by Type */}
          {earnings?.byType?.length > 0 && (
            <div className="pe-section">
              <h2>Breakdown by Service</h2>
              {earnings.byType.map((item, i) => (
                <div key={i} className="pe-day-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="pe-day-header">
                    <span className="pe-day-date">{TYPE_LABELS[item.type] || item.type}</span>
                    <span className="pe-day-total">₹{item.total.toLocaleString()}</span>
                  </div>
                  <div className="pe-day-meta">{item.count} payment{item.count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Cards */}
          <div className="pe-section">
            <h2>Summary</h2>
            <div className="pe-day-card">
              <div className="pe-day-header">
                <span className="pe-day-date">Total Earnings (All Time)</span>
                <span className="pe-day-total">₹{(earnings?.total || 0).toLocaleString()}</span>
              </div>
              <div className="pe-day-meta">{earnings?.totalOrders || 0} total orders</div>
            </div>
            <div className="pe-day-card" style={{ animationDelay: '0.05s' }}>
              <div className="pe-day-header">
                <span className="pe-day-date">This Month</span>
                <span className="pe-day-total">₹{thisMonth.toLocaleString()}</span>
              </div>
              <div className="pe-day-meta">{earnings?.thisMonthOrders || 0} orders</div>
            </div>
            <div className="pe-day-card" style={{ animationDelay: '0.1s' }}>
              <div className="pe-day-header">
                <span className="pe-day-date">Last Month</span>
                <span className="pe-day-total">₹{lastMonth.toLocaleString()}</span>
              </div>
              <div className="pe-day-meta">{earnings?.lastMonthOrders || 0} orders</div>
            </div>
          </div>

          {/* Recent Payments */}
          {earnings?.recentPayments?.length > 0 && (
            <div className="pe-section">
              <h2>Recent Payments</h2>
              {earnings.recentPayments.map(payment => (
                <div key={payment.id} className="pe-payment">
                  <div className="pe-payment-info">
                    <h3>₹{Number(payment.amount).toLocaleString()}</h3>
                    <p>
                      {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' • '}{TYPE_LABELS[payment.type] || payment.type}
                    </p>
                  </div>
                  <span className="pe-payment-status">
                    {payment.status === 'PAID' ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!earnings?.totalOrders && (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>No earnings yet</h3>
              <p>Earnings will appear here when students make payments for your services</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
