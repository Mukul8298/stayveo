import prisma from '../../common/db/prisma.js';
import { notificationService } from './notification.service.js';
import type { NotificationEvent } from './notification.types.js';

const number = (value: unknown) => Number(value || 0);

export const notificationEventHandler = {
  /** Handles emitted domain events outside the request path; failures are contained and logged. */
  async handle(event: NotificationEvent): Promise<void> {
    try {
      if (!event.bookingId) {
        if (event.userId) await notificationService.createFromTemplate(event.userId, 'system', 'student', event.payload || {}, event.type);
        return;
      }
      const booking = await prisma.booking.findUnique({ where: { id: event.bookingId }, include: { receipt: true } });
      if (!booking) return;
      const [provider, student] = await Promise.all([
        prisma.providerProfile.findUnique({ where: { id: booking.providerId } }),
        prisma.user.findUnique({ where: { id: booking.userId }, include: { studentProfile: true } }),
      ]);
      const receiptPayload = (booking.receipt?.payload || {}) as Record<string, unknown>;
      const payload = {
        ...receiptPayload, ...event.payload, reservationId: booking.reservationId || event.reservationId,
        studentName: booking.studentName || student?.studentProfile?.fullName || 'Student', studentPhone: booking.studentPhone || student?.phone_number || null,
        providerName: provider?.name || provider?.businessName || 'Provider', providerContact: provider?.contactNumber || provider?.phone || null,
        roomType: booking.roomType || 'Room', reservationFee: number(booking.reservationFee), monthlyRent: number(booking.monthlyRent),
        securityDeposit: number(booking.securityDeposit), platformFee: number(booking.platformFee), totalPaid: number(booking.reservationFee) + number(booking.platformFee),
      };
      if (event.type === 'BOOKING_INITIATED') {
        await notificationService.createFromTemplate(booking.userId, 'booking_initiated', 'student', payload, event.type);
        return;
      }
      if (event.type === 'PAYMENT_SUCCESS' || event.type === 'RESERVATION_CREATED') {
        await notificationService.createFromTemplate(booking.userId, 'student_reservation_success', 'student', payload, 'RESERVATION_CREATED');
        if (provider?.userId) await notificationService.createFromTemplate(provider.userId, 'provider_reservation_success', 'provider', payload, 'RESERVATION_CREATED');
        return;
      }
      if (event.userId) await notificationService.createFromTemplate(event.userId, 'system', 'student', payload, event.type);
    } catch (error) {
      console.error('Notification event failed', { event, error });
    }
  },
};
