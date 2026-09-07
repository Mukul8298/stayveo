// ─── Payment Service ────────────────────────────────────────────────────

import { paymentRepository } from './payment.repository.js';
import { createPaymentSchema } from './payment.schema.js';
import type { CreatePaymentInput } from './payment.schema.js';
import { bookingService } from '../bookings/booking.service.js';
import { bookingRepository } from '../bookings/booking.repository.js';
import { receiptService } from '../bookings/receipt.service.js';
import { notificationQueue } from '../notifications/notification.queue.js';

export const paymentService = {
  /** Create a payment */
  async create(input: CreatePaymentInput, actorUserId: string) {
    const data = createPaymentSchema.parse(input);
    if (data.user_id !== actorUserId) {
      throw { statusCode: 403, message: 'Payment user does not match the authenticated student' };
    }

    const successfulStatus = ['paid', 'success', 'captured', 'completed'].includes(data.status);
    if (successfulStatus && data.type === 'reservation' && data.booking_id) {
      const result = await bookingRepository.createReservationPayment(data);
      const receipt = await receiptService.createForSuccessfulPayment(result.booking!.id, result.payment);
      notificationQueue.enqueue({ type: 'PAYMENT_SUCCESS', bookingId: result.booking!.id, reservationId: result.reservationId || undefined });
      return { ...result.payment, reservation: { booking: result.booking, receipt } };
    }

    const payment = await paymentRepository.create(data);
    if (payment.status === 'PAID' && payment.bookingId) {
      const result = await bookingService.finalizeReservationPayment(payment.bookingId, payment);
      return { ...payment, reservation: result };
    }
    return payment;
  },

  /** List payments for a provider */
  async listByProvider(providerId: string) {
    return paymentRepository.findByProvider(providerId);
  },

  /** Get earnings summary for a provider */
  async getEarnings(providerId: string) {
    return paymentRepository.getEarnings(providerId);
  },
};
