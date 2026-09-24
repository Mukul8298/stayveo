// ─── Booking Service ────────────────────────────────────────────────────

import { bookingRepository } from './booking.repository.js';
import { createBookingSchema, updateBookingStatusSchema, bookingFilterSchema } from './booking.schema.js';
import type { CreateBookingInput, BookingFilterInput } from './booking.schema.js';
import { createReservationId } from './reservation.util.js';
import { receiptService } from './receipt.service.js';
import { notificationQueue } from '../notifications/notification.queue.js';
import prisma from '../../common/db/prisma.js';
import { providerRepository } from '../provider/provider.repository.js';

export const bookingService = {
  async resolveProviderIds(phone: string) {
    const profile = await providerRepository.findOnboardingByPhone(phone);
    if (!profile) throw { statusCode: 404, message: 'Provider not found' };

    const legacyProvider = await prisma.provider.findUnique({
      where: { userId: profile.userId },
      select: { id: true },
    });
    return [profile.id, legacyProvider?.id].filter(Boolean) as string[];
  },

  async resolveProviderIdsByUserId(userId: string) {
    const profile = await providerRepository.findOnboardingByUserId(userId);
    if (!profile) throw { statusCode: 404, message: 'Provider not found' };

    const legacyProvider = await prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });
    return [profile.id, legacyProvider?.id].filter(Boolean) as string[];
  },

  /** Create a new booking */
  async create(userId: string, input: CreateBookingInput) {
    const data = createBookingSchema.parse(input);
    const booking = await bookingRepository.create(userId, data);
    notificationQueue.enqueue({ type: 'BOOKING_INITIATED', bookingId: booking.id });
    return booking;
  },

  /** Get a single booking by ID */
  async getById(id: string) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    return booking;
  },

  async getByIdForActor(id: string, { userId, providerPhone, providerUserId }: { userId?: string; providerPhone?: string; providerUserId?: string }) {
    const booking = await bookingService.getById(id);
    if (userId && booking.userId === userId) return booking;
    if (providerPhone) {
      const providerIds = await bookingService.resolveProviderIds(providerPhone);
      if (providerIds.includes(booking.providerId)) return booking;
    }
    if (providerUserId) {
      const providerIds = await bookingService.resolveProviderIdsByUserId(providerUserId);
      if (providerIds.includes(booking.providerId)) return booking;
    }
    throw { statusCode: 403, message: 'You are not allowed to access this booking' };
  },

  /** List bookings for a provider */
  async listByProvider(providerId: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    return bookingRepository.findByProvider(providerId, filters);
  },

  async listByProviderPhone(phone: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    const providerIds = await bookingService.resolveProviderIds(phone);
    return bookingRepository.findByProvider(providerIds, filters);
  },

  async listByProviderUserId(userId: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    const providerIds = await bookingService.resolveProviderIdsByUserId(userId);
    return bookingRepository.findByProvider(providerIds, filters);
  },

  /** List bookings for a student */
  async listByUser(userId: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    return bookingRepository.findByUser(userId, filters);
  },

  /** Update booking status */
  async updateStatus(id: string, input: { status: string }, providerPhone?: string, providerUserId?: string) {
    const { status } = updateBookingStatusSchema.parse(input);
    // Verify booking exists
    const booking = await bookingRepository.findById(id);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    if (providerPhone) {
      const providerIds = await bookingService.resolveProviderIds(providerPhone);
      if (!providerIds.includes(booking.providerId)) {
        throw { statusCode: 403, message: 'You do not own this booking' };
      }
    }
    if (providerUserId) {
      const providerIds = await bookingService.resolveProviderIdsByUserId(providerUserId);
      if (!providerIds.includes(booking.providerId)) {
        throw { statusCode: 403, message: 'You do not own this booking' };
      }
    }
    const updated = await bookingRepository.updateStatus(id, status);
    const type = status === 'accepted' ? 'BOOKING_CONFIRMED' : status === 'rejected' ? 'BOOKING_REJECTED' : undefined;
    if (type) notificationQueue.enqueue({ type, bookingId: id });
    return updated;
  },

  /** Completes the reservation-only post-payment work without blocking notification delivery. */
  async finalizeReservationPayment(bookingId: string, payment: { id: string; amount: unknown; status: string; paymentMethod?: string | null; transactionId?: string | null }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    let reservationId = booking.reservationId;
    if (!booking.reservationId) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const updated = await bookingRepository.assignReservationId(booking.id, createReservationId(booking.roomId || booking.id, booking.bookingDate));
          reservationId = updated.reservationId;
          break;
        } catch (error: any) {
          if (error?.code !== 'P2002' || attempt === 4) throw error;
        }
      }
    }
    const receipt = await receiptService.createForSuccessfulPayment(booking.id, payment);
    notificationQueue.enqueue({ type: 'PAYMENT_SUCCESS', bookingId: booking.id, reservationId: reservationId || undefined });
    return { booking: await bookingRepository.findById(booking.id), receipt };
  },

  async getSummary(id: string) {
    const booking = await bookingService.getById(id);
    const monthly = [booking.monthlyRent, booking.foodCharges, booking.electricityCharges, booking.waterCharges, booking.maintenanceCharges, booking.parkingCharges, booking.otherCharges].reduce((sum, amount) => sum + Number(amount || 0), 0);
    return {
      booking,
      summary: {
        monthlyRent: Number(booking.monthlyRent), securityDeposit: Number(booking.securityDeposit), reservationFee: Number(booking.reservationFee), platformFee: Number(booking.platformFee), minimumStayMonths: booking.minimumStayMonths, numberOfBeds: booking.numberOfBeds,
        foodCharges: Number(booking.foodCharges), electricityCharges: Number(booking.electricityCharges), waterCharges: Number(booking.waterCharges), maintenanceCharges: Number(booking.maintenanceCharges), parkingCharges: Number(booking.parkingCharges), otherCharges: Number(booking.otherCharges), totalMonthlyCost: monthly, totalPayable: Number(booking.reservationFee) + Number(booking.platformFee),
      },
    };
  },

  /** Get booking counts for a provider (dashboard stats) */
  async getProviderStats(providerId: string) {
    return bookingRepository.countByProvider(providerId);
  },
};
