import type { TiffinPaymentStatus } from '@prisma/client';

export type PaymentMode = 'mock' | 'none' | 'razorpay';

export type ProviderPaymentRecord = {
  id: string;
  paymentGateway?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  totalAmount?: unknown;
  currency?: string | null;
  status?: TiffinPaymentStatus | string;
};

export type CreateProviderOrderInput = {
  paymentId: string;
  reservationReference: string;
  amount: number;
  currency: string;
};

export type ProviderOrder = {
  provider: string;
  providerOrderId: string;
};

export type SimulatedPayment = {
  providerPaymentId: string;
  transactionId: string;
};

export type VerifyProviderPaymentInput = {
  payment: ProviderPaymentRecord;
  providerPaymentId: string;
  transactionId: string;
  expectedAmount: number;
  expectedCurrency: string;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: CreateProviderOrderInput): Promise<ProviderOrder>;
  verifyPayment(input: VerifyProviderPaymentInput): Promise<{ verified: true }>;

  /**
   * Development-only hook. A real gateway will provide its payment result
   * through checkout callbacks/webhooks instead of this method.
   */
  simulatePayment?(input: { payment: ProviderPaymentRecord; outcome: 'success' }): Promise<SimulatedPayment>;
}
