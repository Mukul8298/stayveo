import { Prisma, TiffinPaymentMethod, TiffinPaymentStatus } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import { MockPaymentProvider } from './mock-payment-provider.js';
import type { PaymentMode, PaymentProvider, ProviderPaymentRecord } from './payment-provider.js';

type DbClient = typeof prisma | Prisma.TransactionClient;

const mockProvider = new MockPaymentProvider();

function configuredMode(): PaymentMode {
  const configured = String(
    process.env.PAYMENT_MODE || process.env.TIFFIN_PAYMENT_MODE ||
      (process.env.NODE_ENV !== 'production' ? 'mock' : 'none')
  ).trim().toLowerCase();

  if (['mock', 'test', 'development'].includes(configured)) {
    return process.env.NODE_ENV === 'production' ? 'none' : 'mock';
  }
  if (configured === 'razorpay') return 'razorpay';
  return 'none';
}

function providerForMode(): PaymentProvider {
  const mode = configuredMode();
  if (mode === 'mock') return mockProvider;
  if (mode === 'razorpay') {
    // TODO: Replace this branch with RazorpayPaymentProvider once Razorpay
    // order creation, signature verification, and webhooks are configured.
    throw { statusCode: 503, message: 'Razorpay payment provider is not implemented yet' };
  }
  throw { statusCode: 503, message: 'Payment integration is not enabled. The reservation remains pending.' };
}

function sameAmount(left: unknown, right: number) {
  const parsed = Number(left);
  return Number.isFinite(parsed) && parsed.toFixed(2) === right.toFixed(2);
}

function assertMockMode() {
  if (configuredMode() !== 'mock') {
    throw { statusCode: 503, message: 'Development mock payment controls are disabled' };
  }
}

export function getTiffinPaymentConfig() {
  const mode = configuredMode();
  return {
    mode,
    provider: mode,
    enabled: mode === 'mock',
    testOnly: mode === 'mock',
    label: mode === 'mock'
      ? 'Development mode — this is a simulated payment. No real money will be charged.'
      : mode === 'razorpay'
        ? 'Razorpay provider is not configured yet.'
        : 'Payment integration is not enabled.',
  };
}

export const tiffinPaymentService = {
  /** Create the first payment attempt for a reservation. */
  async createPendingPayment(client: DbClient, input: {
    subscriptionId: string;
    reservationReference: string;
    kitchenId: string;
    customerId: string;
    amount: number;
    idempotencyKey: string;
  }) {
    const existing = await client.tiffinPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (
        existing.subscriptionId !== input.subscriptionId ||
        existing.kitchenId !== input.kitchenId ||
        existing.customerId !== input.customerId ||
        !sameAmount(existing.totalAmount, input.amount)
      ) {
        throw { statusCode: 409, message: 'This payment request does not match the reservation' };
      }
      return existing;
    }

    const mode = configuredMode();
    const payment = await client.tiffinPayment.create({
      data: {
        subscriptionId: input.subscriptionId,
        kitchenId: input.kitchenId,
        customerId: input.customerId,
        idempotencyKey: input.idempotencyKey,
        paymentGateway: mode === 'mock' ? 'mock' : null,
        paymentMethod: TiffinPaymentMethod.UPI,
        status: TiffinPaymentStatus.PENDING,
        baseAmount: input.amount,
        totalAmount: input.amount,
        currency: 'INR',
      },
    });

    if (mode !== 'mock') return payment;

    const provider = providerForMode();
    const order = await provider.createOrder({
      paymentId: payment.id,
      reservationReference: input.reservationReference,
      amount: input.amount,
      currency: 'INR',
    });

    return client.tiffinPayment.update({
      where: { id: payment.id },
      data: {
        paymentGateway: order.provider,
        providerOrderId: order.providerOrderId,
      },
    });
  },

  /** Move a payment into processing; no reservation activation happens here. */
  async markProcessing(client: DbClient, payment: ProviderPaymentRecord) {
    assertMockMode();
    if (payment.status === TiffinPaymentStatus.PAID) return payment;
    if (payment.status === TiffinPaymentStatus.PROCESSING) return payment;
    if (payment.status !== TiffinPaymentStatus.PENDING) {
      throw { statusCode: 409, message: 'Only a pending payment can be processed' };
    }

    const result = await client.tiffinPayment.updateMany({
      where: { id: payment.id, status: TiffinPaymentStatus.PENDING },
      data: { status: TiffinPaymentStatus.PROCESSING },
    });
    if (!result.count) {
      const current = await client.tiffinPayment.findUnique({ where: { id: payment.id } });
      if (current?.status === TiffinPaymentStatus.PROCESSING || current?.status === TiffinPaymentStatus.PAID) return current;
      throw { statusCode: 409, message: 'Payment status changed before processing could begin' };
    }
    return client.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
  },

  /**
   * Provider-neutral verification. In mock mode the provider creates a
   * clearly fake payment result; a real provider will later supply these
   * identifiers from checkout/webhook data.
   */
  async verifyPayment(client: DbClient, payment: ProviderPaymentRecord, input: {
    expectedAmount: number;
    expectedCurrency: string;
  }) {
    if (payment.status === TiffinPaymentStatus.PAID) return payment;
    if (!([TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
      throw { statusCode: 409, message: 'This payment attempt cannot be verified' };
    }
    if (!sameAmount(payment.totalAmount, input.expectedAmount)) {
      throw { statusCode: 400, message: 'Payment amount does not match the reservation amount' };
    }
    if (String(payment.currency || '').toUpperCase() !== input.expectedCurrency.toUpperCase()) {
      throw { statusCode: 400, message: 'Payment currency does not match the reservation currency' };
    }

    const provider = providerForMode();
    let providerPaymentId = payment.providerPaymentId || '';
    let transactionId = '';
    if (!providerPaymentId) {
      if (!provider.simulatePayment) {
        throw { statusCode: 400, message: 'Payment provider result is required before verification' };
      }
      const simulated = await provider.simulatePayment({ payment, outcome: 'success' });
      providerPaymentId = simulated.providerPaymentId;
      transactionId = simulated.transactionId;
    } else {
      transactionId = `mock_txn_${payment.id}`;
    }

    await provider.verifyPayment({
      payment,
      providerPaymentId,
      transactionId,
      expectedAmount: input.expectedAmount,
      expectedCurrency: input.expectedCurrency,
    });

    const result = await client.tiffinPayment.updateMany({
      where: {
        id: payment.id,
        status: { in: [TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] },
      },
      data: {
        status: TiffinPaymentStatus.PAID,
        paymentGateway: provider.name,
        providerPaymentId,
        transactionId,
        paidAt: new Date(),
      },
    });
    if (!result.count) {
      const current = await client.tiffinPayment.findUnique({ where: { id: payment.id } });
      if (current?.status === TiffinPaymentStatus.PAID) return current;
      throw { statusCode: 409, message: 'Payment status changed before verification completed' };
    }
    return client.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
  },

  async markFailed(client: DbClient, payment: ProviderPaymentRecord) {
    assertMockMode();
    if (payment.status === TiffinPaymentStatus.FAILED) return payment;
    if (payment.status === TiffinPaymentStatus.PAID) {
      throw { statusCode: 409, message: 'A successful payment cannot be marked failed' };
    }
    if (!([TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
      throw { statusCode: 409, message: 'This payment attempt cannot be failed' };
    }

    const result = await client.tiffinPayment.updateMany({
      where: { id: payment.id, status: { in: [TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] } },
      data: { status: TiffinPaymentStatus.FAILED },
    });
    if (!result.count) {
      const current = await client.tiffinPayment.findUnique({ where: { id: payment.id } });
      if (current?.status === TiffinPaymentStatus.FAILED) return current;
      throw { statusCode: 409, message: 'Payment status changed before failure could be recorded' };
    }
    return client.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
  },

  async markCancelled(client: DbClient, payment: ProviderPaymentRecord) {
    assertMockMode();
    if (payment.status === TiffinPaymentStatus.CANCELLED) return payment;
    if (payment.status === TiffinPaymentStatus.PAID) {
      throw { statusCode: 409, message: 'A successful payment cannot be cancelled' };
    }
    if (!([TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
      throw { statusCode: 409, message: 'This payment attempt cannot be cancelled' };
    }

    const result = await client.tiffinPayment.updateMany({
      where: { id: payment.id, status: { in: [TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] } },
      data: { status: TiffinPaymentStatus.CANCELLED },
    });
    if (!result.count) {
      const current = await client.tiffinPayment.findUnique({ where: { id: payment.id } });
      if (current?.status === TiffinPaymentStatus.CANCELLED) return current;
      throw { statusCode: 409, message: 'Payment status changed before cancellation could be recorded' };
    }
    return client.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
  },

  /** Future provider webhooks will enter through this provider-neutral hook. */
  async handlePaymentWebhook(_client: DbClient, _payload: unknown) {
    // TODO: Verify the Razorpay webhook signature and map captured/failed/
    // refunded events to the same payment state transitions above.
    throw { statusCode: 501, message: 'Payment webhooks are not implemented in mock mode' };
  },
};
