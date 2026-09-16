import { notificationRepository } from './notification.repository.js';

const render = (template: string, values: Record<string, unknown>) => template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => String(values[key] ?? ''));

const fallbackTemplates: Record<string, { title: string; body: string }> = {
  student_reservation_success: { title: 'Reservation confirmed', body: 'Your reservation {{reservationId}} for {{propertyName}} is confirmed. Total paid: ₹{{totalPaid}}.' },
  provider_reservation_success: { title: 'New reservation received', body: '{{studentName}} reserved {{roomType}} at {{propertyName}}. Reservation fee paid: ₹{{reservationFee}}.' },
  booking_initiated: { title: 'Booking started', body: 'Your booking request for {{propertyName}} has been received.' },
  booking_confirmed: { title: 'Booking confirmed', body: 'Your booking at {{propertyName}} has been confirmed. Move-in date: {{moveInDate}}.' },
  booking_rejected: { title: 'Booking update', body: 'Your booking request for {{propertyName}} could not be confirmed. {{reason}}' },
  booking_cancelled: { title: 'Booking cancelled', body: 'Your booking at {{propertyName}} has been cancelled. {{reason}}' },
  payment_success: { title: 'Payment received', body: 'Payment of ₹{{amount}} for {{propertyName}} was successful. Transaction ID: {{transactionId}}.' },
  payment_failed: { title: 'Payment failed', body: 'Payment of ₹{{amount}} for {{propertyName}} could not be processed. Please try again.' },
  refund_initiated: { title: 'Refund initiated', body: 'A refund of ₹{{amount}} has been initiated. It will be credited within 5-7 business days.' },
  refund_completed: { title: 'Refund completed', body: 'Your refund of ₹{{amount}} has been credited to your account.' },
  tiffin_subscription_created: { title: 'Tiffin subscription started', body: 'Your tiffin subscription with {{kitchenName}} starts on {{startDate}}. Enjoy your meals!' },
  tiffin_delivery_completed: { title: 'Meal delivered', body: 'Your {{mealCategory}} meal has been delivered. Bon appétit!' },
  tiffin_subscription_expiring: { title: 'Subscription expiring soon', body: 'Your tiffin subscription expires in {{daysRemaining}} days. Renew to continue uninterrupted meals.' },
  visit_approved: { title: 'Visit approved', body: 'Your visit to {{propertyName}} on {{visitDate}} has been approved. {{address}}' },
  visit_completed: { title: 'Visit completed', body: 'Your visit to {{propertyName}} is complete. Ready to book? Reserve your room now!' },
  system: { title: 'StayVeo update', body: '{{message}}' },
};

export const notificationTemplateService = {
  async render(key: string, audience: string, payload: Record<string, unknown>) {
    const template = await notificationRepository.getTemplate(key, audience);
    const fallback = fallbackTemplates[key] || fallbackTemplates.system;
    return {
      templateId: template?.id,
      title: render(template?.titleTemplate || fallback.title, payload),
      message: render(template?.bodyTemplate || fallback.body, payload),
    };
  },
};
