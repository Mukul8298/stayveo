import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Check, X, Clock, Eye, Calendar, MapPin, Loader } from 'lucide-react';
import { useProvider } from '../../context/ProviderContext';
import { getProviderBookings, updateBookingStatus, createVisitRequest } from '../../api/booking';
import './ProviderBookings.css';

const tabs = ['new', 'accepted', 'in_progress', 'completed'];
const tabLabels = { new: 'New', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed' };

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM',
];

export default function ProviderBookings() {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const providerId = provider.providerId;
  const [activeTab, setActiveTab] = useState('new');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabCounts, setTabCounts] = useState({ new: 0, accepted: 0, in_progress: 0, completed: 0 });

  // Visit modal state
  const [visitModal, setVisitModal] = useState(null); // booking object or null
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  const fetchBookings = async (status) => {
    if (!providerId) return;
    setLoading(true);
    try {
      const res = await getProviderBookings(providerId, { status, limit: 50 });
      setBookings(res.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch counts for all tabs
  useEffect(() => {
    if (!providerId) return;
    Promise.all(
      tabs.map(tab =>
        getProviderBookings(providerId, { status: tab, limit: 1 })
          .then(r => ({ tab, count: r.data?.pagination?.total || 0 }))
          .catch(() => ({ tab, count: 0 }))
      )
    ).then(results => {
      const counts = {};
      results.forEach(r => { counts[r.tab] = r.count; });
      setTabCounts(counts);
    });
  }, [providerId]);

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab, providerId]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateBookingStatus(id, newStatus);
      fetchBookings(activeTab);
      // Refresh counts
      const countRes = await getProviderBookings(providerId, { status: activeTab, limit: 1 });
      setTabCounts(prev => ({ ...prev, [activeTab]: countRes.data?.pagination?.total || 0 }));
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleVisitSubmit = async () => {
    if (!visitDate || !visitTime || !visitModal) return;
    setVisitSubmitting(true);
    try {
      await createVisitRequest(visitModal.userId, {
        booking_id: visitModal.id,
        provider_id: providerId,
        visit_date: visitDate,
        visit_time: visitTime,
        instructions: `Visit PG for review. Contact owner before arriving.`,
      });
      setVisitModal(null);
      setVisitDate('');
      setVisitTime('');
    } catch (err) {
      console.error('Visit request failed:', err);
    } finally {
      setVisitSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="pb-page" id="provider-bookings">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/provider/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Bookings</h1>
      </div>

      <div className="pb-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`pb-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
            {tabCounts[tab] > 0 && (
              <span className="pb-tab-badge">{tabCounts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="pb-list">
        {loading ? (
          <div className="empty-state">
            <Loader size={32} className="spinning" />
            <p style={{ marginTop: 12 }}>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={32} /></div>
            <h3>No {tabLabels[activeTab]} bookings</h3>
            <p>Bookings will appear here when students book your services</p>
          </div>
        ) : (
          bookings.map((booking, i) => (
            <div key={booking.id} className="pb-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="pb-card-top">
                <div className="pb-card-user">
                  <span className="pb-avatar">👤</span>
                  <div>
                    <h3>{booking.studentName || 'Student'}</h3>
                    <p>{booking.serviceType || 'Room Booking'}</p>
                  </div>
                </div>
                <span className="pb-amount">₹{Number(booking.price).toLocaleString()}</span>
              </div>

              <div className="pb-card-details">
                <span>📅 {formatDate(booking.bookingDate)}</span>
                <span>⏰ {booking.bookingTime}</span>
                {booking.roomType && <span>🏠 {booking.roomType}</span>}
              </div>

              <div className="pb-card-bottom">
                {booking.studentPhone && (
                  <a href={`tel:${booking.studentPhone}`} className="pb-call-btn">
                    <Phone size={14} /> Call
                  </a>
                )}

                <button className="pb-visit-btn" onClick={() => setVisitModal(booking)}>
                  <Eye size={14} /> Visit for Review
                </button>

                {activeTab === 'new' && (
                  <div className="pb-actions">
                    <button className="pb-reject" onClick={() => handleStatusChange(booking.id, 'rejected')}>
                      <X size={16} /> Reject
                    </button>
                    <button className="pb-accept" onClick={() => handleStatusChange(booking.id, 'accepted')}>
                      <Check size={16} /> Accept
                    </button>
                  </div>
                )}

                {activeTab === 'accepted' && (
                  <button className="pb-start" onClick={() => handleStatusChange(booking.id, 'in_progress')}>
                    Start Service →
                  </button>
                )}

                {activeTab === 'in_progress' && (
                  <button className="pb-complete" onClick={() => handleStatusChange(booking.id, 'completed')}>
                    <Check size={14} /> Mark Complete
                  </button>
                )}

                {activeTab === 'completed' && (
                  <span className="pb-done-badge">✅ Completed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Visit Request Modal ─────────────────────────────────────── */}
      {visitModal && (
        <>
          <div className="overlay" onClick={() => setVisitModal(null)} />
          <div className="pb-visit-modal">
            <div className="pb-visit-modal-header">
              <h2>📋 Schedule Visit</h2>
              <button onClick={() => setVisitModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="pb-visit-modal-info">
              <p><strong>Student:</strong> {visitModal.studentName || 'Student'}</p>
              <p><strong>Service:</strong> {visitModal.serviceType || 'Room Booking'}</p>
              {visitModal.roomType && <p><strong>Room:</strong> {visitModal.roomType}</p>}
            </div>

            <div className="pb-visit-field">
              <label><Calendar size={14} /> Select Visit Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
              />
            </div>

            <div className="pb-visit-field">
              <label><Clock size={14} /> Select Time Slot</label>
              <div className="pb-visit-time-grid">
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    className={`pb-visit-time-slot ${visitTime === slot ? 'active' : ''}`}
                    onClick={() => setVisitTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-visit-instructions">
              <h3><MapPin size={14} /> Visit Instructions</h3>
              <ul>
                <li>📍 Contact the PG owner before arriving</li>
                <li>🪪 Carry a valid ID proof</li>
                <li>⏰ Be on time for your slot</li>
                <li>📱 Keep your phone charged for directions</li>
                <li>🚫 No entry without prior confirmation</li>
              </ul>
            </div>

            <button
              className="pb-visit-submit"
              onClick={handleVisitSubmit}
              disabled={!visitDate || !visitTime || visitSubmitting}
            >
              {visitSubmitting ? 'Scheduling...' : '✅ Schedule Visit'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
