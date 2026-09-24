import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarCheck2,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Info,
  Loader,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { fetchPGListings, FALLBACK_IMAGE } from '../api/supabaseApi';
import { createBooking, createPayment } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDistanceFromCollege } from '../hooks/useDistanceFromCollege';
import './BookingFlow.css';

const DEFAULT_PLATFORM_FEE = 299;

const formatCurrency = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const firstNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
};

function PricingRow({ label, value, muted = false, strong = false }) {
  return (
    <div className={`booking-price-row ${muted ? 'is-muted' : ''} ${strong ? 'is-strong' : ''}`}>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? formatCurrency(value) : value}</strong>
    </div>
  );
}

function BookingCard({ children, className = '' }) {
  return <section className={`booking-card ${className}`}>{children}</section>;
}

export default function BookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authState, displayName } = useAuth();
  const toast = useToast();

  const [room, setRoom] = useState(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [reserved, setReserved] = useState(false);
  const [step, setStep] = useState('visit');
  const [visitDate, setVisitDate] = useState('');
  const [visitDateError, setVisitDateError] = useState('');
  const { itemsWithDistance } = useDistanceFromCollege(room ? [room] : []);
  const roomWithDistance = itemsWithDistance[0] || room;

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data, aborted } = await fetchPGListings({ signal: controller.signal });
        if (aborted) return;
        const found = (data || []).find(listing => String(listing.id) === String(id));
        setRoom(found || null);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('BookingFlow: fetch error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setRoomLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  const pricing = useMemo(() => {
    const monthlyRent = firstNumber(room?.price);
    const securityDeposit = firstNumber(room?.securityDeposit) ?? 0;
    const foodCharges = firstNumber(room?.foodCharges) ?? 0;
    const electricityCharges = firstNumber(room?.electricityCharges) ?? 0;
    const waterCharges = firstNumber(room?.waterCharges) ?? 0;
    const maintenanceCharges = firstNumber(room?.maintenanceCharges) ?? 0;
    const parkingCharges = firstNumber(room?.parkingCharges) ?? 0;
    const otherCharges = firstNumber(room?.otherCharges) ?? 0;
    const reservationFee = firstNumber(room?.reservationFee) ?? 0;
    const platformFee = firstNumber(room?.platformFee) ?? DEFAULT_PLATFORM_FEE;
    const totalPayableNow = reservationFee + platformFee;
    const totalMonthlyCost = monthlyRent + foodCharges + electricityCharges + waterCharges + maintenanceCharges + parkingCharges + otherCharges;

    return {
      monthlyRent,
      securityDeposit,
      foodCharges,
      electricityCharges,
      waterCharges,
      maintenanceCharges,
      parkingCharges,
      otherCharges,
      reservationFee,
      platformFee,
      totalPayableNow,
      totalMonthlyCost,
    };
  }, [room]);

  const roomTypeLabel = room?.roomType || room?.type || 'Single Room';
  const amenityLabel = room?.amenities?.includes('AC') ? 'AC' : room?.amenities?.[0] || 'Verified amenities';
  const distanceLabel = roomWithDistance?.distanceLabel || 'Distance unavailable';
  const availabilityText = Number(room?.availableBeds) > 0
    ? `Only ${room.availableBeds} slot${Number(room.availableBeds) === 1 ? '' : 's'} remaining`
    : 'High demand near your campus';
  const imgSrc = room?.images?.[0] || FALLBACK_IMAGE;

  const handleVisitDateContinue = () => {
    const today = getLocalDateString();
    if (!visitDate) {
      setVisitDateError('Please select a visit date.');
      return;
    }
    if (visitDate < today) {
      setVisitDateError('Please select a valid visit date.');
      return;
    }
    setVisitDateError('');
    setStep('reservation');
  };

  const handleReserveSlot = async () => {
    const today = getLocalDateString();
    if (!visitDate) {
      setStep('visit');
      setVisitDateError('Please select a visit date.');
      return;
    }
    if (visitDate < today) {
      setStep('visit');
      setVisitDateError('Please select a valid visit date.');
      return;
    }
    if (!authState?.userId) {
      toast.error('Please login first');
      navigate('/');
      return;
    }

    setSubmitting(true);
    try {
      if (!room?.providerId || !room?.roomId) {
        throw new Error('This property is not available for online reservation right now.');
      }
      const today = new Date().toISOString().split('T')[0];
      const res = await createBooking(authState.userId, {
        provider_id: room.providerId,
        room_id: room.roomId,
        service_type: 'PG Room',
        room_type: roomTypeLabel,
        booking_date: today,
        booking_time: '10:00 AM',
        price: pricing.totalPayableNow,
        move_in_date: visitDate,
        monthly_rent: pricing.monthlyRent,
        security_deposit: pricing.securityDeposit,
        reservation_fee: pricing.reservationFee,
        platform_fee: pricing.platformFee,
        minimum_stay_months: Number(room?.minimumStayMonths) || 1,
        number_of_beds: 1,
        food_charges: pricing.foodCharges,
        electricity_charges: pricing.electricityCharges,
        water_charges: pricing.waterCharges,
        maintenance_charges: pricing.maintenanceCharges,
        parking_charges: pricing.parkingCharges,
        other_charges: pricing.otherCharges,
        student_name: displayName || authState?.name || 'Student',
        student_phone: authState?.phone || '',
        notes: `Slot reservation for ${room?.title || 'PG Room'}; monthly rent ${formatCurrency(pricing.monthlyRent)} paid directly to owner.`,
      });
      const payment = await createPayment({
        booking_id: res.data.id,
        user_id: authState.userId,
        provider_id: room?.providerId,
        amount: pricing.totalPayableNow,
        type: 'reservation',
        status: 'paid',
        payment_method: 'UPI',
        transaction_id: `SV-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      }, authState.userId);
      setBookingId(payment?.data?.reservation?.booking?.reservationId || res?.data?.reservationId || 'Processing');
      toast.success('Slot reserved successfully');
      setReserved(true);
    } catch (err) {
      console.error('Booking failed:', err);
      toast.error(err?.message || 'Failed to reserve slot. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallOwner = () => {
    if (!room?.providerPhone) {
      toast.info('Owner phone number will be shared shortly.');
      return;
    }
    window.location.href = `tel:${room.providerPhone}`;
  };

  const handleBack = () => {
    if (step === 'reservation') {
      setStep('visit');
      return;
    }
    navigate(-1);
  };

  if (roomLoading) {
    return (
      <div className="booking-page booking-loading" id="booking-flow">
        <Loader size={24} className="spinning" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="booking-page" id="booking-flow">
        <div className="page-header booking-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={22} /></button>
          <h1>Reserve Your Slot</h1>
        </div>
        <div className="booking-empty">
          <div className="booking-empty-icon"><BedDouble size={36} /></div>
          <h3>Room not found</h3>
          <p>This listing may have been removed.</p>
        </div>
      </div>
    );
  }

  if (!reserved && step === 'visit') {
    const today = getLocalDateString();
    return (
      <div className="booking-page" id="booking-visit-date">
        <div className="page-header booking-header">
          <button className="back-btn" onClick={handleBack} aria-label="Go back"><ArrowLeft size={22} /></button>
          <h1>Visit Date</h1>
        </div>

        <main className="booking-content">
          <BookingCard className="booking-property-card">
            <img
              className="booking-property-image"
              src={imgSrc}
              alt={room?.title || 'Room'}
              onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
            />
            <div className="booking-property-info">
              <div className="booking-property-title-row"><h2>{room?.title || 'PG Room'}</h2></div>
              <p><BedDouble size={15} /> {roomTypeLabel}</p>
              <strong>{formatCurrency(pricing.monthlyRent)}<span>/month</span></strong>
            </div>
          </BookingCard>

          <BookingCard className="booking-visit-date-card">
            <div className="booking-card-heading">
              <div>
                <h2>Visit Date</h2>
                <p>Select the date you want to visit this property.</p>
              </div>
              <CalendarCheck2 size={22} />
            </div>
            <label className="booking-date-field">
              <span>Visit Date</span>
              <input
                type="date"
                value={visitDate}
                min={today}
                onChange={(event) => {
                  setVisitDate(event.target.value);
                  setVisitDateError('');
                }}
              />
            </label>
            {visitDateError && <p className="booking-date-error" role="alert">{visitDateError}</p>}
          </BookingCard>

          <div className="booking-sticky-cta">
            <button className="booking-primary-action" type="button" onClick={handleVisitDateContinue}>
              Continue
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (reserved) {
    return (
      <div className="booking-page booking-success-page" id="booking-confirmed">
        <div className="page-header booking-header">
          <button className="back-btn" onClick={() => navigate('/home')} aria-label="Go back"><ArrowLeft size={22} /></button>
          <h1>Reserve Your Slot</h1>
        </div>

        <main className="booking-success-content">
          <div className="booking-success-badge">
            <Check size={56} strokeWidth={2.5} />
          </div>
          <h2>Slot Reserved Successfully</h2>
          <p>The property owner will contact you shortly. Your reservation has been confirmed.</p>

          <BookingCard className="booking-success-card">
            <div className="booking-success-room">
              <img
                src={imgSrc}
                alt={room?.title || 'Room'}
                onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
              />
              <div>
                <h3>{room?.title || 'PG Room'}</h3>
                <span><BedDouble size={16} /> {roomTypeLabel} <b>•</b> {amenityLabel}</span>
              </div>
            </div>
            <div className="booking-success-divider" />
            <div className="booking-success-paid-row">
              <div>
                <span>Amount Paid</span>
                <strong>{formatCurrency(pricing.totalPayableNow)}</strong>
                {bookingId && <small>Reservation ID #{bookingId}</small>}
              </div>
              <span className="booking-paid-pill">Paid via UPI</span>
            </div>
            <div className="booking-receipt-note">
              <Info size={20} />
              <p>A copy of this receipt has been sent to your registered email.</p>
            </div>
          </BookingCard>

          <div className="booking-success-actions">
            <button className="booking-primary-action" onClick={handleCallOwner}>
              <Phone size={21} /> Call Owner
            </button>
            <button className="booking-outline-action" onClick={() => navigate('/dashboard')}>
              <ReceiptText size={22} /> View Booking
            </button>
            <button className="booking-link-action" onClick={() => navigate('/home')}>Continue Browsing</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="booking-page" id="booking-flow">
      <div className="page-header booking-header">
        <button className="back-btn" onClick={handleBack} aria-label="Go back"><ArrowLeft size={22} /></button>
        <h1>Reserve Your Slot</h1>
      </div>

      <main className="booking-content">
        <BookingCard className="booking-property-card">
          <img
            className="booking-property-image"
            src={imgSrc}
            alt={room?.title || 'Room'}
            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
          />
          <div className="booking-property-info">
            <div className="booking-property-title-row">
              <h2>{room?.title || 'PG Room'}</h2>
              {room?.verified && <span className="booking-verified"><BadgeCheck size={14} /> Verified</span>}
            </div>
            <p><BedDouble size={15} /> {roomTypeLabel} <b>•</b> {amenityLabel}</p>
            <p><MapPin size={15} /> {distanceLabel}</p>
            <strong>{formatCurrency(pricing.monthlyRent)}<span>/month</span></strong>
          </div>
        </BookingCard>

        <BookingCard>
          <div className="booking-card-heading">
            <div>
              <h2>Property Charges</h2>
              <p>Pay directly to the property owner after confirmation.</p>
            </div>
            <FileText size={22} />
          </div>
          <div className="booking-price-list">
            <PricingRow label="Monthly Rent" value={pricing.monthlyRent} />
            <PricingRow label="Security Deposit" value={pricing.securityDeposit} />
            <PricingRow label="Minimum Stay" value={`${Number(room?.minimumStayMonths) || 1} month${Number(room?.minimumStayMonths) === 1 ? '' : 's'}`} />
            <PricingRow label="Number of Beds" value={Number(room?.numberOfBeds) || 1} />
            <PricingRow label="Food Charges" value={pricing.foodCharges} muted />
            <PricingRow label="Electricity Charges" value={pricing.electricityCharges} muted />
            <PricingRow label="Water Charges" value={pricing.waterCharges} muted />
            <PricingRow label="Maintenance Charges" value={pricing.maintenanceCharges} muted />
            <PricingRow label="Parking Charges" value={pricing.parkingCharges} muted />
            <PricingRow label="Other Charges" value={pricing.otherCharges} muted />
            <div className="booking-divider" />
            <PricingRow label="Total Monthly Cost" value={pricing.totalMonthlyCost} strong />
          </div>
          <div className="booking-info-note">
            <Info size={18} />
            <p>Rent and Security Deposit are payable directly during move-in.</p>
          </div>
        </BookingCard>

        <BookingCard className="booking-reservation-card">
          <div className="booking-card-heading">
            <div>
              <h2>StayVeo Reservation Charges</h2>
              <p>Reserve your slot and connect with the property owner instantly.</p>
            </div>
            <CreditCard size={22} />
          </div>
          <div className="booking-price-list">
            <PricingRow label="Reservation Fee" value={pricing.reservationFee} />
            <PricingRow label="Platform Fee" value={pricing.platformFee} />
            <div className="booking-divider" />
            <PricingRow label="Total Payable" value={pricing.totalPayableNow} strong />
          </div>
        </BookingCard>

        <section className="booking-trust-grid" aria-label="Trust and safety">
          <div><ShieldCheck size={18} /> Verified Property</div>
          <div><Phone size={18} /> Direct owner connection</div>
          <div><CalendarCheck2 size={18} /> Secure reservation</div>
          <div><CheckCircle2 size={18} /> Refund policy available</div>
        </section>

        <section className="booking-urgency">
          <div><Zap size={18} /></div>
          <span>{availabilityText}</span>
          <small><Users size={14} /> 3 students viewed this today</small>
        </section>

        <p className="booking-terms">
          By reserving, you agree that property rent and deposit are handled directly with the owner. StayVeo collects only the reservation and platform fee now.
        </p>
      </main>

      <div className="booking-sticky-cta">
        <button className="booking-primary-action" onClick={handleReserveSlot} disabled={submitting}>
          {submitting ? <><Loader2 size={18} className="spin" /> Reserving...</> : <><Sparkles size={18} /> Reserve Slot for {formatCurrency(pricing.totalPayableNow)}</>}
        </button>
      </div>
    </div>
  );
}
