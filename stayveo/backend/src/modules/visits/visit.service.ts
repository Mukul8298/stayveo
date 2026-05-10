// ─── Visit Service ──────────────────────────────────────────────────────

import { visitRepository } from './visit.repository.js';
import { createVisitSchema, updateVisitStatusSchema } from './visit.schema.js';
import type { CreateVisitInput } from './visit.schema.js';

export const visitService = {
  /** Create a visit request */
  async create(userId: string, input: CreateVisitInput) {
    const data = createVisitSchema.parse(input);
    return visitRepository.create(userId, data);
  },

  /** Get a visit by ID */
  async getById(id: string) {
    const visit = await visitRepository.findById(id);
    if (!visit) throw { statusCode: 404, message: 'Visit request not found' };
    return visit;
  },

  /** List visits for a provider */
  async listByProvider(providerId: string) {
    return visitRepository.findByProvider(providerId);
  },

  /** List visits for a booking */
  async listByBooking(bookingId: string) {
    return visitRepository.findByBooking(bookingId);
  },

  /** Update visit status */
  async updateStatus(id: string, input: { status: string }) {
    const { status } = updateVisitStatusSchema.parse(input);
    const visit = await visitRepository.findById(id);
    if (!visit) throw { statusCode: 404, message: 'Visit request not found' };
    return visitRepository.updateStatus(id, status);
  },
};
