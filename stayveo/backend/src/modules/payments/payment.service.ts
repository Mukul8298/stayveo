// ─── Payment Service ────────────────────────────────────────────────────

import { paymentRepository } from './payment.repository.js';
import { createPaymentSchema } from './payment.schema.js';
import type { CreatePaymentInput } from './payment.schema.js';

export const paymentService = {
  /** Create a payment */
  async create(input: CreatePaymentInput) {
    const data = createPaymentSchema.parse(input);
    return paymentRepository.create(data);
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
