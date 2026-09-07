import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, CreditCard, Home, Loader, MapPin, PauseCircle, PlayCircle, RefreshCw, Search, ShieldCheck, Truck, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserBookings } from '../api/booking';
import { getMyTiffinSpace, pauseTiffinSubscription, resumeTiffinSubscription, skipTiffinMeal } from '../api/tiffinStudent';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './StudentDashboard.css';

const SPACE_STATUSES = new Set(['NEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'new', 'accepted', 'in_progress', 'completed']);
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function formatCurrency(value) { return `₹${Number(value || 0).toLocaleString('en-IN')}`; }
function formatDate(value) {
  if (!value) return 'Date pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function todayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).reduce((result, part) => { if (part.type !== 'literal') result[part.type] = part.value; return result; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function titleCase(value) { return String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function paymentLabel(value) { const status = String(value || '').toLowerCase(); return status === 'paid' ? 'Paid' : titleCase(status || 'pending'); }

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const userId = authState?.userId;
  const [bookings, setBookings] = useState([]);
  const [tiffinSpace, setTiffinSpace] = useState({ hasTiffin: false, tiffin: null });
  const [loading, setLoading] = useState(Boolean(userId));
  const [bookingError, setBookingError] = useState('');
  const [tiffinError, setTiffinError] = useState('');

  const loadSpace = useCallback(async () => {
    if (!userId) { setBookings([]); setTiffinSpace({ hasTiffin: false, tiffin: null }); setLoading(false); return; }
    setLoading(true); setBookingError(''); setTiffinError('');
    const [bookingResult, tiffinResult] = await Promise.allSettled([getUserBookings(userId, { page: 1, limit: 20 }), getMyTiffinSpace(userId)]);
    if (bookingResult.status === 'fulfilled') setBookings(bookingResult.value?.data?.items || []);
    else { console.error('My Space bookings load failed:', bookingResult.reason); setBookings([]); setBookingError(bookingResult.reason?.message || 'We could not load your property booking right now.'); }
    if (tiffinResult.status === 'fulfilled') setTiffinSpace(tiffinResult.value?.data || { hasTiffin: false, tiffin: null });
    else { console.error('My Space Tiffin load failed:', tiffinResult.reason); setTiffinSpace({ hasTiffin: false, tiffin: null }); setTiffinError(tiffinResult.reason?.message || 'We could not load your Tiffin subscription right now.'); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { queueMicrotask(() => void loadSpace()); }, [loadSpace]);
  const roomBooking = useMemo(() => bookings.filter((booking) => SPACE_STATUSES.has(booking.status)).find((booking) => booking.property || /pg|room/i.test(booking.serviceType || booking.service_type || '')), [bookings]);
  const hasService = Boolean(roomBooking || tiffinSpace.hasTiffin);

  return <div className="page page-padded dash-page" id="student-dashboard">
    <div className="dash-header"><div><h1>My Space</h1><p>Your reservations, payment, and visit details</p></div><span className="dash-header-pill"><ShieldCheck size={14} /> Student hub</span></div>
    {loading && <div className="dash-loading"><Loader size={22} className="spinning" /><span>Loading your space...</span></div>}
    {!loading && bookingError && <DataError title="We couldn't load your property booking right now." message={bookingError} onRetry={loadSpace} />}
    {!loading && !bookingError && roomBooking && <ReservationCard booking={roomBooking} />}
    {!loading && !tiffinError && tiffinSpace.hasTiffin && <TiffinSpace data={tiffinSpace.tiffin} userId={userId} onChanged={setTiffinSpace} />}
    {!loading && tiffinError && <DataError title="We couldn't load your Tiffin subscription." message={tiffinError} onRetry={loadSpace} />}
    {!loading && !bookingError && !tiffinError && !hasService && <EmptyMySpace onBrowseRooms={() => navigate('/search')} onBrowseTiffin={() => navigate('/tiffin')} />}
  </div>;
}

function DataError({ title, message, onRetry }) { return <section className="dash-data-state dash-data-state--error"><AlertCircle size={28} /><h2>{title}</h2><p>{message}</p><button type="button" onClick={() => void onRetry()}><RefreshCw size={16} /> Retry</button></section>; }
function EmptyMySpace({ onBrowseRooms, onBrowseTiffin }) { return <section className="dash-empty-state"><div className="dash-empty-visual"><div className="dash-empty-orbit dash-empty-orbit-one" /><div className="dash-empty-orbit dash-empty-orbit-two" /><Home size={46} /></div><h2>No active services yet</h2><p>Your confirmed property bookings and Tiffin subscriptions will appear here.</p><div className="dash-empty-actions"><button className="dash-primary-btn" type="button" onClick={onBrowseRooms}><Search size={18} /> Explore PGs</button><button className="dash-secondary-btn" type="button" onClick={onBrowseTiffin}><Utensils size={18} /> Explore Tiffin</button></div></section>; }

function ReservationCard({ booking }) {
  const property = booking.property || {};
  const room = booking.room || {};
  const paymentStatus = String(booking.paymentStatus || 'PENDING').toLowerCase();
  const isCompleted = String(booking.status || '').toUpperCase() === 'COMPLETED';
  return <section className="dash-reservation-card" aria-labelledby="space-reservation-title"><div className="dash-reservation-heading"><div><span className="dash-reservation-kicker"><CheckCircle2 size={15} /> {isCompleted ? 'Completed booking' : 'Active reservation'}</span><h2 id="space-reservation-title">{property.name || 'Reserved property'}</h2><p><MapPin size={14} /> {property.address || 'Address not available'}</p></div><span className={`dash-booking-status dash-booking-status--${String(booking.status || '').toLowerCase()}`}>{titleCase(booking.status)}</span></div><div className="dash-reservation-content"><div className="dash-reservation-image">{property.image ? <img src={property.image} alt={property.name || 'Reserved property'} /> : <Home size={34} />}</div><div className="dash-reservation-details"><div className="dash-reservation-grid"><Detail label="Reservation ID" value={booking.reservationId || 'Pending payment'} wide /><Detail label="Booking ID" value={booking.id} wide /><Detail label="Room" value={room.type || booking.roomType || 'Room'} /><Detail label="Visit Date" value={formatDate(booking.moveInDate)} /><Detail label="Payment" value={paymentStatus} /><Detail label="Amount paid" value={formatCurrency(booking.amountPaid)} /></div></div></div></section>;
}

function TiffinSpace({ data, userId, onChanged }) {
  const toast = useToast();
  const [selectedDay, setSelectedDay] = useState(data.today?.day || WEEKDAYS[0]);
  const [action, setAction] = useState('');
  const [pauseDates, setPauseDates] = useState({ startDate: data.pause?.startDate || todayKey(), endDate: data.pause?.endDate || '' });
  const selectedMenu = data.weeklyMenu?.find((item) => item.day === selectedDay) || { lunch: [], dinner: [] };
  const status = String(data.status || '').toLowerCase();
  const run = async (key, callback, successMessage) => { setAction(key); try { const response = await callback(); onChanged(response?.data || response); toast.success(successMessage); } catch (error) { toast.error(error.message || 'Unable to update your Tiffin subscription'); } finally { setAction(''); } };
  const skip = (meal) => run(`skip-${meal}`, () => skipTiffinMeal(data.subscriptionId, userId, meal, data.today.date), `${titleCase(meal)} skipped`);
  const pause = (event) => { event.preventDefault(); if (!pauseDates.startDate || !pauseDates.endDate) { toast.error('Choose start and end dates for the pause'); return; } return run('pause', () => pauseTiffinSubscription(data.subscriptionId, userId, pauseDates.startDate, pauseDates.endDate), 'Tiffin subscription paused'); };
  const resume = () => run('resume', () => resumeTiffinSubscription(data.subscriptionId, userId), 'Tiffin subscription resumed');
  return <section className="dash-tiffin-space" aria-labelledby="tiffin-space-title"><div className="dash-tiffin-heading"><div><span className="dash-reservation-kicker"><Utensils size={15} /> Active Tiffin subscription</span><h2 id="tiffin-space-title">{data.serviceName}</h2><p><span>{data.providerName || 'Provider'}</span>{data.address ? ` · ${data.address}` : ''}</p></div><span className={`dash-tiffin-status ${status}`}>{titleCase(status)}</span></div><div className="dash-tiffin-meta"><span><strong>Plan</strong>{data.plan?.name || 'Tiffin plan'} ({formatCurrency(data.plan?.price)})</span><span><strong>Start date</strong>{formatDate(data.startDate)}</span><span><strong>Renewal date</strong>{formatDate(data.renewalDate)}</span><span><strong>Payment</strong>{paymentLabel(data.payment?.status)}</span></div><div className="dash-tiffin-badges"><span>{titleCase(data.foodType || data.foodPreference || 'veg')}</span><span>{titleCase(data.deliveryType || 'home delivery')}</span><span>{data.deliveryRadiusKm || 0} km delivery coverage</span></div>
    <div className="dash-today-card"><div className="dash-subsection-heading"><h3>Today's Tiffin</h3><span>{formatDate(data.today?.date)} · {titleCase(data.today?.day)}</span></div><div className="dash-today-meals">{(data.today?.meals || []).map((meal) => <div className="dash-today-meal" key={meal.meal}><span className="dash-meal-icon">{meal.meal === 'lunch' ? '☀' : '◔'}</span><div><strong>{titleCase(meal.meal)}</strong><p>{meal.items.length ? meal.items.join(', ') : 'No menu planned yet.'}</p></div><span className={`dash-meal-status ${meal.status}`}>{titleCase(meal.status)}</span>{status === 'active' && meal.status === 'scheduled' && <button type="button" disabled={Boolean(action)} onClick={() => void skip(meal.meal)}>{action === `skip-${meal.meal}` ? 'Skipping…' : `Skip ${titleCase(meal.meal)}`}</button>}</div>)}</div></div>
    <div className="dash-tiffin-columns"><div className="dash-weekly-card"><div className="dash-subsection-heading"><h3>Weekly Menu Overview</h3><span>Live provider menu</span></div><div className="dash-weekday-tabs">{WEEKDAYS.map((day) => <button type="button" key={day} className={selectedDay === day ? 'is-active' : ''} onClick={() => setSelectedDay(day)}>{day.slice(0, 3)}</button>)}</div><div className="dash-selected-menu"><MealMenu meal="Lunch" items={selectedMenu.lunch} /><MealMenu meal="Dinner" items={selectedMenu.dinner} /></div></div><div className="dash-side-stack"><section className="dash-side-card"><h3><Truck size={17} /> Delivery Details</h3><p>{data.deliveryAddress || 'Delivery address not set'}</p></section><section className="dash-side-card"><h3><CreditCard size={17} /> Subscription & Payment</h3><div><span>{data.plan?.name || 'Plan'}</span><strong>{formatCurrency(data.plan?.price)}</strong></div><div><span>Status</span><strong className={data.payment?.status === 'paid' ? 'paid' : ''}>{paymentLabel(data.payment?.status)}</strong></div><small>Reservation ID: {data.reservationId || '—'}</small><small>Subscription ID: {data.subscriptionId || '—'}</small></section></div></div>
    <section className="dash-pause-card"><div className="dash-subsection-heading"><h3>{status === 'paused' ? 'Subscription paused' : 'Pause Subscription'}</h3><span>{status === 'paused' ? 'Resume when you are ready' : 'Pause future meal preparation'}</span></div>{status === 'paused' ? <button type="button" className="dash-primary-btn" disabled={Boolean(action)} onClick={resume}><PlayCircle size={16} /> {action === 'resume' ? 'Resuming…' : 'Resume Subscription'}</button> : <form onSubmit={pause}><div className="dash-pause-fields"><label>Start date<input type="date" value={pauseDates.startDate} onChange={(event) => setPauseDates((current) => ({ ...current, startDate: event.target.value }))} /></label><label>End date<input type="date" value={pauseDates.endDate} min={pauseDates.startDate} onChange={(event) => setPauseDates((current) => ({ ...current, endDate: event.target.value }))} /></label></div><button type="submit" className="dash-primary-btn" disabled={Boolean(action)}><PauseCircle size={16} /> {action === 'pause' ? 'Confirming…' : 'Confirm Pause'}</button></form>}</section><div className="dash-tiffin-footer"><span><CalendarDays size={15} /> {data.deliveries?.length || 0} upcoming meal deliveries</span><span>{data.payment?.transactionId ? `Payment ${data.payment.transactionId}` : `Payment ${paymentLabel(data.payment?.status)}`}</span></div>
  </section>;
}

function MealMenu({ meal, items }) { return <div className="dash-menu-meal"><strong>{meal}</strong>{items?.length ? <p>{items.join(', ')}</p> : <p className="is-muted">No menu planned yet.</p>}</div>; }
function Detail({ label, value, wide = false }) { return <div className={`dash-reservation-detail ${wide ? 'dash-reservation-detail--wide' : ''}`}><span>{label}</span><strong>{value}</strong></div>; }
