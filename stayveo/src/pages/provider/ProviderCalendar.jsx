import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { calendarSlots } from '../../data/mockData';
import './ProviderCalendar.css';

export default function ProviderCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const types = location.state?.types || ['pg'];
  const [selectedDate, setSelectedDate] = useState(0);

  const days = calendarSlots;
  const current = days[selectedDate];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="pc-page" id="provider-calendar">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard', { state: { types } })}>
          <ArrowLeft size={20} />
        </button>
        <h1>Calendar</h1>
      </div>

      <div className="pc-date-nav">
        <button className="pc-nav-btn" onClick={() => setSelectedDate(d => Math.max(0, d - 1))}>
          <ChevronLeft size={20} />
        </button>
        <div className="pc-date-display">
          <h2>{formatDate(current.date)}</h2>
          <p>{current.slots.filter(s => s.booking).length} bookings</p>
        </div>
        <button className="pc-nav-btn" onClick={() => setSelectedDate(d => Math.min(days.length - 1, d + 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="pc-date-pills">
        {days.map((day, i) => (
          <button key={i} className={`pc-pill ${selectedDate === i ? 'active' : ''}`}
            onClick={() => setSelectedDate(i)}>
            <span className="pc-pill-day">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            <span className="pc-pill-num">{new Date(day.date).getDate()}</span>
          </button>
        ))}
      </div>

      <div className="pc-slots">
        {current.slots.map((slot, i) => (
          <div key={i} className={`pc-slot pc-slot-${slot.status}`} style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="pc-slot-time">{slot.time}</div>
            <div className="pc-slot-content">
              {slot.booking ? (
                <>
                  <h3>{slot.booking}</h3>
                  <span className={`pc-slot-badge pc-badge-${slot.status}`}>
                    {slot.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                  </span>
                </>
              ) : (
                <span className="pc-slot-available">Available</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
