import { notificationRepository } from './notification.repository.js';

const render = (template: string, values: Record<string, unknown>) => template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => String(values[key] ?? ''));

const fallbackTemplates: Record<string, { title: string; body: string }> = {
  student_reservation_success: { title: 'Reservation confirmed', body: 'Your reservation {{reservationId}} for {{propertyName}} is confirmed. Total paid: ₹{{totalPaid}}.' },
  provider_reservation_success: { title: 'New reservation received', body: '{{studentName}} reserved {{roomType}} at {{propertyName}}. Reservation fee paid: ₹{{reservationFee}}.' },
  booking_initiated: { title: 'Booking started', body: 'Your booking request for {{propertyName}} has been received.' },
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
