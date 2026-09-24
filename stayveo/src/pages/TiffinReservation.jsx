import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleX,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchTiffinProvider } from '../api/tiffin';
import {
  cancelTiffinMockPayment,
  completeTiffinMockPayment,
  createTiffinPayment,
  createTiffinReservation,
  failTiffinMockPayment,
  getTiffinPayment,
  getTiffinReservation,
  getTiffinReservationContext,
  processTiffinMockPayment,
} from '../api/tiffinReservation';
import { useAuth } from '../context/AuthContext';
import TiffinTopbar from '../components/tiffin/TiffinTopbar';
import './Tiffin.css';
import './TiffinReservation.css';

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() || `tiffin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const FOOD_LABELS = {
  veg: 'Vegetarian',
  nonveg: 'Non-Vegetarian',
  jain: 'Jain',
};

function normalizeFoodCategory(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (['veg', 'vegetarian'].includes(normalized)) return 'veg';
  if (['nonveg', 'nonvegetarian'].includes(normalized)) return 'nonveg';
  if (normalized === 'jain') return 'jain';
  return '';
}

function normalizeFoodCategories(value) {
  const values = Array.isArray(value) ? value : [value];
  const categories = values.flatMap((item) => String(item || '').toLowerCase() === 'both'
    ? ['veg', 'nonveg']
    : [normalizeFoodCategory(item)]);
  return [...new Set(categories.filter(Boolean))];
}

function planDurationDays(plan) {
  const type = String(plan?.type || '').toLowerCase();
  if (type === 'daily' || type === 'custom') return 1;
  if (type === 'weekly') return 7;
  if (type === 'monthly') return 30;
  return Number(plan?.durationDays) || 1;
}

function calculatedPlanAmount(plan, perMealPrice, mealCount) {
  const selectedMeals = Math.max(0, Number(mealCount) || 0);
  if (!selectedMeals) return 0;
  const price = Number(perMealPrice);
  if (Number.isFinite(price) && price > 0) {
    return Number((price * selectedMeals * planDurationDays(plan)).toFixed(2));
  }
  return Number(plan?.price || 0);
}

function reservationUrl(serviceId, reservationId) {
  return `/tiffin/${encodeURIComponent(serviceId)}/reservation?reservationId=${encodeURIComponent(reservationId)}`;
}

function successUrl(serviceId, reservationId) {
  return `/tiffin/${encodeURIComponent(serviceId)}/reservation/success?reservationId=${encodeURIComponent(reservationId)}`;
}

export default function TiffinReservation() {
  const { id, paymentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { authState } = useAuth();
  const userId = authState?.userId || undefined;
  const reservationId = searchParams.get('reservationId');
  const [context, setContext] = useState(null);
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState({
    planId: searchParams.get('planId') || '',
    deliveryAddress: '',
    deliveryLatitude: null,
    deliveryLongitude: null,
    startDate: todayInIndia(),
    dietPreference: 'veg',
    dietPreferences: ['veg'],
    customInstructions: '',
    optedLunch: true,
    optedDinner: true,
    idempotencyKey: createIdempotencyKey(),
  });
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const processingRequests = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const providerRequest = fetchTiffinProvider(id, { signal: controller.signal });
    const reservationRequest = paymentId
      ? getTiffinPayment(id, paymentId, userId)
      : reservationId
        ? getTiffinReservation(reservationId, userId, id)
        : getTiffinReservationContext(id, userId, {
          planId: searchParams.get('planId'),
          plan: searchParams.get('plan'),
          signal: controller.signal,
        });

    Promise.all([reservationRequest, providerRequest])
      .then(([reservationResponse, providerResponse]) => {
        if (cancelled) return;
        setProvider(providerResponse?.data || null);
        const data = reservationResponse?.data;
        if (paymentId || reservationId) {
          setReservation(data || null);
        } else if (data) {
          setContext(data);
          const student = data.student || {};
          const selected = data.selectedPlan || data.plans?.[0];
          setForm((current) => ({
            ...current,
            planId: selected?.id || current.planId,
            deliveryAddress: student.address || '',
            deliveryLatitude: student.latitude ?? null,
            deliveryLongitude: student.longitude ?? null,
            startDate: data.defaultStartDate || current.startDate,
            dietPreference: normalizeFoodCategories(student.foodPreferences || student.foodPreference)[0] || 'veg',
            dietPreferences: (() => {
              const supported = normalizeFoodCategories(data.service?.foodCategories || data.service?.foodType);
              const saved = normalizeFoodCategories(student.foodPreferences || student.foodPreference)
                .filter((category) => supported.includes(category));
              return saved.length ? saved : [supported[0] || 'veg'];
            })(),
          }));
          if (data.existingReservation) setReservation(data.existingReservation);
        }
      })
      .catch((loadError) => {
        if (!cancelled && !controller.signal.aborted) setError(loadError.message || 'Unable to load the reservation details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; controller.abort(); };
  }, [id, location.pathname, location.search, navigate, paymentId, reservationId, searchParams, userId]);

  useEffect(() => {
    if (reservation?.status !== 'payment_processing' || !reservation.payment?.id) return undefined;
    const key = `${reservation.id}:${reservation.payment.id}`;
    if (processingRequests.current.has(key)) return undefined;
    processingRequests.current.add(key);

    const timer = setTimeout(async () => {
      try {
        const response = await completeTiffinMockPayment(reservation.id, userId, { paymentId: reservation.payment.id });
        const updated = response?.data;
        setReservation(updated);
        navigate(successUrl(id, reservation.id), { replace: true });
      } catch (completeError) {
        processingRequests.current.delete(key);
        setError(completeError.message || 'The simulated payment could not be verified.');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [id, navigate, reservation?.id, reservation?.payment?.id, reservation?.status, userId]);

  const selectedPlan = useMemo(() => {
    if (!context) return null;
    return context.plans?.find((plan) => plan.id === form.planId) || context.selectedPlan || context.plans?.[0] || null;
  }, [context, form.planId]);

  const supportedFoodCategories = useMemo(() => {
    const categories = normalizeFoodCategories(context?.service?.foodCategories || context?.service?.foodType);
    return categories.length ? categories : ['veg'];
  }, [context]);
  const selectedMealCount = Number(form.optedLunch) + Number(form.optedDinner);
  const perMealPrice = Number(context?.service?.perMealPrice);
  const reservationAmount = calculatedPlanAmount(selectedPlan, perMealPrice, selectedMealCount);

  const paymentEnabled = Boolean(context?.payment?.enabled || reservation?.testPayment || reservation?.payment?.gateway === 'mock');

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  }

  function updateDietPreferences(category, checked) {
    setForm((current) => {
      const currentPreferences = normalizeFoodCategories(current.dietPreferences || current.dietPreference);
      let nextPreferences;
      if (category === 'jain') {
        nextPreferences = checked ? ['jain'] : [];
      } else {
        const nonJain = currentPreferences.filter((preference) => preference !== 'jain');
        nextPreferences = checked
          ? [...new Set([...nonJain, category])]
          : nonJain.filter((preference) => preference !== category);
      }
      return { ...current, dietPreferences: nextPreferences, dietPreference: nextPreferences[0] || '' };
    });
    setError('');
  }

  async function handlePaymentAction(action) {
    if (!reservation?.id || !reservation.payment?.id) {
      setError('The payment attempt could not be found. Refresh the page and try again.');
      return;
    }
    setSubmitting(true);
    setError('');
    const input = { paymentId: reservation.payment.id };
    try {
      let response;
      if (action === 'success') response = await completeTiffinMockPayment(reservation.id, userId, input);
      if (action === 'processing') response = await processTiffinMockPayment(reservation.id, userId, input);
      if (action === 'failure') response = await failTiffinMockPayment(reservation.id, userId, input);
      if (action === 'cancel') response = await cancelTiffinMockPayment(reservation.id, userId, input);
      const updated = response?.data;
      setReservation(updated);
      if (action === 'success') navigate(successUrl(id, reservation.id), { replace: true });
      if (action === 'failure' || action === 'cancel') navigate(reservationUrl(id, reservation.id), { replace: true });
    } catch (actionError) {
      setError(actionError.message || 'The payment action could not be completed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPayment() {
    if (!reservation?.id) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await createTiffinPayment(reservation.id, userId, { idempotencyKey: createIdempotencyKey() });
      const updated = response?.data;
      setReservation(updated);
      navigate(reservationUrl(id, reservation.id), { replace: true });
    } catch (retryError) {
      setError(retryError.message || 'A new payment attempt could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedPlan?.id) return setError('Choose an available meal plan.');
    if (!form.deliveryAddress.trim()) return setError('Enter a delivery address.');
    if (!form.optedLunch && !form.optedDinner) return setError('Select at least one meal.');
    if (!form.dietPreferences?.length) return setError('Select at least one food preference.');
    setSubmitting(true);
    setError('');
    try {
      const response = await createTiffinReservation(id, userId, {
        ...form,
        planId: selectedPlan.id,
        dietPreference: form.dietPreferences[0],
        dietPreferences: form.dietPreferences,
        deliveryAddress: form.deliveryAddress.trim(),
      });
      setReservation(response?.data);
    } catch (submitError) {
      setError(submitError.message || 'Unable to create the reservation.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="tiffin-page"><div className="tiffin-content"><TiffinTopbar backTo={`/tiffin/${id}`} /><div className="tiffin-state"><Loader2 size={24} className="spinning" /><span>Loading reservation...</span></div></div></main>;

  if (error && !context && !reservation) return <main className="tiffin-page"><div className="tiffin-content"><TiffinTopbar backTo={`/tiffin/${id}`} /><StateMessage error={error} onBack={() => navigate(`/tiffin/${id}`)} /></div></main>;

  if (reservation?.status === 'confirmed') {
    return <ResultShell serviceId={id} onBack={() => navigate(`/tiffin/${id}`)}><SuccessState reservation={reservation} serviceName={provider?.name || reservation.serviceName} onBack={() => navigate(`/tiffin/${id}`)} /></ResultShell>;
  }

  if (reservation?.status === 'payment_failed') {
    return <ResultShell serviceId={id} onBack={() => navigate(`/tiffin/${id}`)}><PaymentResultState type="failed" reservation={reservation} submitting={submitting} error={error} onRetry={retryPayment} onBack={() => navigate(reservationUrl(id, reservation.id))} /></ResultShell>;
  }

  if (reservation?.status === 'payment_cancelled') {
    return <ResultShell serviceId={id} onBack={() => navigate(`/tiffin/${id}`)}><PaymentResultState type="cancelled" reservation={reservation} submitting={submitting} error={error} onRetry={retryPayment} onBack={() => navigate(`/tiffin/${id}`)} /></ResultShell>;
  }

  if (reservation?.status === 'payment_processing') {
    return <ResultShell serviceId={id} onBack={() => navigate(`/tiffin/${id}`)}><ProcessingState reservation={reservation} error={error} /></ResultShell>;
  }

  if (reservation?.status === 'payment_pending') {
    return <ResultShell serviceId={id} onBack={() => navigate(`/tiffin/${id}`)}><MockPaymentCheckout reservation={reservation} enabled={paymentEnabled} submitting={submitting} error={error} onAction={handlePaymentAction} onBack={() => navigate(`/tiffin/${id}`)} /></ResultShell>;
  }

  const service = context?.service || {};
  const image = provider?.image || '/favicon.svg';
  return (
    <main className="tiffin-page tiffin-reservation-page">
      <div className="tiffin-content">
        <TiffinTopbar backTo={`/tiffin/${id}`} />
        <div className="tiffin-page-heading tiffin-reservation-heading"><h1>Reservation</h1><p>Review your Tiffin plan and delivery details before starting the development payment.</p></div>
        {error && <div className="tiffin-reservation-alert"><AlertCircle size={17} /><span>{error}</span></div>}
        <form className="tiffin-reservation-layout" onSubmit={handleSubmit}>
          <div className="tiffin-reservation-main">
            <section className="tiffin-reservation-card">
              <div className="tiffin-reservation-card-heading"><span className="tiffin-reservation-step">1</span><div><h2>Service summary</h2><p>The selected service and current plan pricing.</p></div></div>
              <div className="tiffin-reservation-service"><img src={image} alt="" /><div><h3>{service.name || provider?.name || 'Tiffin Service'}</h3><p><MapPin size={13} /> {service.address || provider?.address || 'Delivery address will be used for your order'}</p><span>{service.deliveryRadiusKm || provider?.deliveryRadiusKm || 0} km delivery coverage</span></div></div>
              <div className="tiffin-reservation-plans">
                {(context?.plans || []).map((plan) => <button type="button" key={plan.id} className={`tiffin-reservation-plan ${form.planId === plan.id ? 'is-selected' : ''}`} onClick={() => updateField('planId', plan.id)}><span><strong>{plan.name || titleCase(plan.type)}</strong><small>{plan.description || `${plan.durationDays} day meal plan`}</small></span><strong>{money(calculatedPlanAmount(plan, perMealPrice, selectedMealCount))}</strong></button>)}
              </div>
            </section>

            <section className="tiffin-reservation-card">
              <div className="tiffin-reservation-card-heading"><span className="tiffin-reservation-step">2</span><div><h2>Student & delivery details</h2><p>Your saved profile information is prefilled where available.</p></div></div>
              <div className="tiffin-reservation-fields">
                <label><span>Student name</span><input value={context?.student?.name || ''} readOnly /></label>
                <label><span>Phone number</span><input value={context?.student?.phone || ''} readOnly /></label>
                <label className="is-wide"><span>Delivery address</span><textarea value={form.deliveryAddress} onChange={(event) => updateField('deliveryAddress', event.target.value)} placeholder="Enter the address where your meals should be delivered" rows={3} maxLength={500} required /></label>
                <div className="tiffin-reservation-meals"><span>Food preference</span><div>{supportedFoodCategories.map((category) => <label key={category}><input type="checkbox" checked={form.dietPreferences?.includes(category) || false} onChange={(event) => updateDietPreferences(category, event.target.checked)} /> {FOOD_LABELS[category]}</label>)}</div></div>
                <label><span>Additional instructions <em>Optional</em></span><input value={form.customInstructions} onChange={(event) => updateField('customInstructions', event.target.value)} placeholder="Gate, floor, or delivery notes" maxLength={1000} /></label>
              </div>
            </section>

            <section className="tiffin-reservation-card">
              <div className="tiffin-reservation-card-heading"><span className="tiffin-reservation-step">3</span><div><h2>Schedule</h2><p>Choose when your subscription should begin.</p></div></div>
              <div className="tiffin-reservation-fields tiffin-reservation-schedule"><label><span>Start date</span><div className="tiffin-reservation-input-icon"><CalendarDays size={16} /><input type="date" min={context?.defaultStartDate || todayInIndia()} value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} required /></div></label><div className="tiffin-reservation-meals"><span>Meals included</span><div><label><input type="checkbox" checked={form.optedLunch} onChange={(event) => updateField('optedLunch', event.target.checked)} /> Lunch</label><label><input type="checkbox" checked={form.optedDinner} onChange={(event) => updateField('optedDinner', event.target.checked)} /> Dinner</label></div></div></div>
            </section>
          </div>

          <aside className="tiffin-reservation-summary tiffin-reservation-card">
            <div className="tiffin-reservation-card-heading"><ShieldCheck size={20} /><div><h2>Reservation summary</h2><p>All amounts are calculated by the server.</p></div></div>
            <SummaryRow label="Tiffin service" value={service.name || provider?.name || 'Tiffin Service'} />
            <SummaryRow label="Selected plan" value={selectedPlan?.name || titleCase(selectedPlan?.type)} />
            <SummaryRow label="Start date" value={form.startDate || '—'} />
            <SummaryRow label="Payment status" value={context?.payment?.enabled ? 'Development test mode' : 'Payment pending'} />
            <div className="tiffin-reservation-total"><span>Total</span><strong>{money(reservationAmount)}</strong></div>
            <button type="submit" className="tiffin-subscribe-button tiffin-reservation-submit" disabled={submitting || !selectedPlan?.id}>{submitting ? <><Loader2 size={16} className="spinning" /> Saving...</> : 'Save reservation & pay'}</button>
            <p className="tiffin-reservation-payment-note">{context?.payment?.label || 'Development payment mode — no real payment will be charged.'}</p>
          </aside>
        </form>
      </div>
    </main>
  );
}

function ResultShell({ children }) {
  return <main className="tiffin-page tiffin-reservation-page"><div className="tiffin-content"><TiffinTopbar backTo="/tiffin" />{children}</div></main>;
}

function SummaryRow({ label, value }) {
  return <div className="tiffin-reservation-summary-row"><span>{label}</span><strong>{value}</strong></div>;
}

function ResultDetails({ reservation, paymentLabel }) {
  return <div className="tiffin-reservation-result-details">
    <SummaryRow label="Reference" value={reservation.reference} />
    <SummaryRow label="Plan" value={reservation.plan?.name || 'Tiffin plan'} />
    <SummaryRow label="Amount" value={money(reservation.amount, reservation.currency)} />
    {paymentLabel && <SummaryRow label="Payment" value={paymentLabel} />}
    {reservation.payment?.providerPaymentId && <SummaryRow label="Payment ID" value={reservation.payment.providerPaymentId} />}
    {reservation.payment?.providerOrderId && <SummaryRow label="Order ID" value={reservation.payment.providerOrderId} />}
    {reservation.status === 'confirmed' && <SummaryRow label="Reservation" value="Confirmed / Active" />}
  </div>;
}

function SuccessState({ reservation, serviceName, onBack }) {
  return <section className="tiffin-reservation-result"><span className="tiffin-reservation-result-icon"><CheckCircle2 size={32} /></span><p className="tiffin-reservation-result-kicker">Reservation confirmed</p><h1>Payment successful</h1><p>Your payment was verified and your {reservation.plan?.name || 'meal plan'} is active from {reservation.startDate}. Your provider can now prepare eligible meals for your subscription.</p><ResultDetails reservation={reservation} paymentLabel="Paid" /><div className="tiffin-reservation-debug"><span><strong>Development payment</strong> · Mock provider</span><span>{serviceName || reservation.serviceName}</span></div><button type="button" className="tiffin-subscribe-button" onClick={onBack}>View reservation <span>→</span></button><small>No real payment was charged. Razorpay can be connected later through the provider adapter.</small></section>;
}

function MockPaymentCheckout({ reservation, enabled, submitting, error, onAction, onBack }) {
  return <section className="tiffin-reservation-result tiffin-mock-payment-card"><span className="tiffin-mock-payment-icon"><CreditCard size={30} /></span><p className="tiffin-reservation-result-kicker">Test payment</p><span className="tiffin-mock-payment-badge">Development mode</span><h1>{reservation.plan?.name || 'Tiffin plan'}</h1><strong className="tiffin-mock-payment-amount">{money(reservation.amount, reservation.currency)}</strong><div className="tiffin-mock-payment-reference"><span>Reservation reference</span><strong>{reservation.reference}</strong></div><div className="tiffin-mock-payment-notice"><ShieldCheck size={16} /><span>This is a simulated payment. No real money will be charged and no Razorpay checkout is being opened.</span></div>{error && <div className="tiffin-reservation-alert"><AlertCircle size={17} /><span>{error}</span></div>}{enabled ? <div className="tiffin-mock-payment-actions"><button type="button" className="tiffin-subscribe-button" onClick={() => onAction('success')} disabled={submitting}>Pay successfully</button><button type="button" className="tiffin-mock-outline-button" onClick={() => onAction('failure')} disabled={submitting}><XCircle size={16} /> Payment failed</button><button type="button" className="tiffin-mock-secondary-button" onClick={() => onAction('cancel')} disabled={submitting}><CircleX size={15} /> Cancel payment</button><button type="button" className="tiffin-mock-processing-button" onClick={() => onAction('processing')} disabled={submitting}><Loader2 size={15} /> Simulate processing</button></div> : <p className="tiffin-reservation-payment-note">Mock payment mode is not enabled on the server. The reservation is safely pending.</p>}<button type="button" className="tiffin-reservation-secondary-button" onClick={onBack}>Back to service</button></section>;
}

function ProcessingState({ reservation, error }) {
  return <section className="tiffin-reservation-result is-processing"><span className="tiffin-reservation-result-icon"><Loader2 size={32} className="spinning" /></span><p className="tiffin-reservation-result-kicker">Development mode</p><h1>Processing payment...</h1><p>Your simulated payment is being verified by the backend. This screen will update automatically.</p><ResultDetails reservation={reservation} paymentLabel="Processing" />{error && <div className="tiffin-reservation-alert"><AlertCircle size={17} /><span>{error}</span></div>}</section>;
}

function PaymentResultState({ type, reservation, submitting, error, onRetry, onBack }) {
  const failed = type === 'failed';
  return <section className={`tiffin-reservation-result is-${type}`}><span className="tiffin-reservation-result-icon">{failed ? <XCircle size={32} /> : <CircleX size={32} />}</span><p className="tiffin-reservation-result-kicker">Payment {failed ? 'failed' : 'cancelled'}</p><h1>Payment {failed ? 'failed' : 'cancelled'}</h1><p>{failed ? 'Your payment could not be completed. Your reservation has not been activated.' : 'Your reservation is saved, but payment is still required to activate it.'}</p><ResultDetails reservation={reservation} paymentLabel={failed ? 'Failed' : 'Cancelled'} />{error && <div className="tiffin-reservation-alert"><AlertCircle size={17} /><span>{error}</span></div>}<div className="tiffin-mock-result-actions"><button type="button" className="tiffin-subscribe-button" onClick={onRetry} disabled={submitting}>{submitting ? 'Creating payment...' : failed ? 'Try again' : 'Pay now'}</button><button type="button" className="tiffin-reservation-secondary-button" onClick={onBack}>Back {failed ? 'to reservation' : 'to service'}</button></div></section>;
}

function StateMessage({ error, onBack }) {
  return <section className="tiffin-reservation-result is-error"><span className="tiffin-reservation-result-icon"><AlertCircle size={32} /></span><h1>Reservation unavailable</h1><p>{error}</p><button type="button" className="tiffin-subscribe-button" onClick={onBack}>Back to service</button></section>;
}
