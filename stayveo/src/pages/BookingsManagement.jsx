import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import './BookingsManagement.css';

const mockBookings = [
  { id: 1, student: 'Aarav Mehta', room: 'Sunshine PG Room 3', date: 'Jun 1, 2026', status: 'pending', avatar: '👨‍🎓' },
  { id: 2, student: 'Sneha Reddy', room: 'Sunshine PG Room 5', date: 'Jun 15, 2026', status: 'pending', avatar: '👩‍🎓' },
  { id: 3, student: 'Rahul Sharma', room: 'Green Valley Room 2', date: 'May 20, 2026', status: 'confirmed', avatar: '🧑‍🎓' },
  { id: 4, student: 'Priya Singh', room: 'Sunshine PG Room 1', date: 'May 10, 2026', status: 'rejected', avatar: '👩‍💻' },
];

export default function BookingsManagement() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState(mockBookings);

  const updateStatus = (id, status) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  return (
    <div className="page" id="bookings-management">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1>Bookings</h1>
      </div>
      <div className="bm-list">
        {bookings.map(b => (
          <div key={b.id} className={`bm-item bm-${b.status}`}>
            <div className="bm-avatar">{b.avatar}</div>
            <div className="bm-info">
              <h3>{b.student}</h3>
              <p>{b.room}</p>
              <span className="bm-date">{b.date}</span>
            </div>
            {b.status === 'pending' ? (
              <div className="bm-actions">
                <button className="bm-accept" onClick={() => updateStatus(b.id, 'confirmed')}><Check size={16} /></button>
                <button className="bm-reject" onClick={() => updateStatus(b.id, 'rejected')}><X size={16} /></button>
              </div>
            ) : (
              <span className={`bm-status bm-status-${b.status}`}>
                {b.status === 'confirmed' ? 'Confirmed' : 'Rejected'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
