import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ChevronDown } from 'lucide-react';
import { providerEarningsData } from '../../data/mockData';
import './ProviderEarnings.css';

const periods = ['Daily', 'Weekly', 'Monthly'];

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];
  const [activePeriod, setActivePeriod] = useState('Daily');
  const data = providerEarningsData;

  const periodAmount = activePeriod === 'Daily' ? data.today
    : activePeriod === 'Weekly' ? data.thisWeek : data.thisMonth;

  return (
    <div className="pe-page" id="provider-earnings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
          <ArrowLeft size={20} />
        </button>
        <h1>Earnings</h1>
      </div>

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
          vs ₹{data.lastMonth.toLocaleString()} last month
          <span className="pe-trend-up">↑ {Math.round(((data.thisMonth - data.lastMonth) / data.lastMonth) * 100)}%</span>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="pe-section">
        <h2>Breakdown</h2>
        {data.history.map((day, i) => (
          <div key={i} className="pe-day-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="pe-day-header">
              <span className="pe-day-date">{day.date}</span>
              <span className="pe-day-total">₹{day.amount.toLocaleString()}</span>
            </div>
            <div className="pe-day-meta">{day.orders} orders</div>
            <div className="pe-day-breakdown">
              {day.breakdown.map((item, j) => (
                <div key={j} className="pe-bk-row">
                  <span>{item.label}</span>
                  <span>₹{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Payment History */}
      <div className="pe-section">
        <h2>Payment History</h2>
        {data.paymentHistory.map(payment => (
          <div key={payment.id} className="pe-payment">
            <div className="pe-payment-info">
              <h3>₹{payment.amount.toLocaleString()}</h3>
              <p>{payment.date} • {payment.method}</p>
            </div>
            <span className="pe-payment-status">✅ {payment.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
