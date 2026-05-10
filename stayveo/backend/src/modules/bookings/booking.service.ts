// ─── Booking Service ────────────────────────────────────────────────────

import { bookingRepository } from './booking.repository.js';
import { createBookingSchema, updateBookingStatusSchema, bookingFilterSchema } from './booking.schema.js';
import type { CreateBookingInput, BookingFilterInput } from './booking.schema.js';

export const bookingService = {
  /** Create a new booking */
  async create(userId: string, input: CreateBookingInput) {
    const data = createBookingSchema.parse(input);
    return bookingRepository.create(userId, data);
  },

  /** Get a single booking by ID */
  async getById(id: string) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    return booking;
  },

  /** List bookings for a provider */
  async listByProvider(providerId: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    return bookingRepository.findByProvider(providerId, filters);
  },

  /** List bookings for a student */
  async listByUser(userId: string, queryParams: BookingFilterInput) {
    const filters = bookingFilterSchema.parse(queryParams);
    return bookingRepository.findByUser(userId, filters);
  },

  /** Update booking status */
  async updateStatus(id: string, input: { status: string }) {
    const { status } = updateBookingStatusSchema.parse(input);
    // Verify booking exists
    const booking = await bookingRepository.findById(id);
    if (!booking) throw { statusCode: 404, message: 'Booking not found' };
    return bookingRepository.updateStatus(id, status);
  },

  /** Get booking counts for a provider (dashboard stats) */
  async getProviderStats(providerId: string) {
    return bookingRepository.countByProvider(providerId);
  },
};
