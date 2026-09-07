import crypto from 'node:crypto';
import type {
  CreateProviderOrderInput,
  PaymentProvider,
  ProviderPaymentRecord,
  SimulatedPayment,
  VerifyProviderPaymentInput,
} from './payment-provider.js';

function mockId(prefix: string) {
  return `mock_${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function sameAmount(left: unknown, right: number) {
  const parsed = Number(left);
  return Number.isFinite(parsed) && parsed.toFixed(2) === right.toFixed(2);
}

/**
 * Local payment adapter. It creates identifiers that are intentionally
 * distinguishable from Razorpay and never accepts card or bank details.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createOrder(_input: CreateProviderOrderInput) {
    return {
      provider: this.name,
      providerOrderId: mockId('order'),
    };
  }

  async simulatePayment(_input: { payment: ProviderPaymentRecord; outcome: 'success' }): Promise<SimulatedPayment> {
    return {
      providerPaymentId: mockId('pay'),
      transactionId: mockId('txn'),
    };
  }

  async verifyPayment(input: VerifyProviderPaymentInput) {
    const { payment, providerPaymentId, transactionId, expectedAmount, expectedCurrency } = input;
    if (payment.paymentGateway !== this.name) {
      throw { statusCode: 409, message: 'Payment provider does not match the active development mode' };
    }
    if (!payment.providerOrderId?.startsWith('mock_order_')) {
      throw { statusCode: 409, message: 'Mock payment order is invalid' };
    }
    if (!providerPaymentId.startsWith('mock_pay_') || !transactionId.startsWith('mock_txn_')) {
      throw { statusCode: 400, message: 'Mock payment verification data is invalid' };
    }
    if (!sameAmount(payment.totalAmount, expectedAmount)) {
      throw { statusCode: 400, message: 'Payment amount does not match the reservation amount' };
    }
    if (String(payment.currency || '').toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw { statusCode: 400, message: 'Payment currency does not match the reservation currency' };
    }
    return { verified: true as const };
  }
}
