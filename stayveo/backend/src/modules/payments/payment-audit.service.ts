import type { Prisma } from '@prisma/client';
import prisma from '../../common/db/prisma.js';

type AuditInput = {
  eventType: string;
  actorUserId?: string;
  actorProviderId?: string;
  paymentId?: string;
  tiffinPaymentId?: string;
  bookingId?: string;
  subscriptionId?: string;
  renewalId?: string;
  requestId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  baseAmount?: number;
  platformFee?: number;
  ownerAmount?: number;
  studentPayable?: number;
  metadata?: Prisma.InputJsonValue;
};

export const paymentAuditService = {
  async record(input: AuditInput, client: typeof prisma | Prisma.TransactionClient = prisma) {
    return client.paymentAuditLog.create({
      data: {
        eventType: input.eventType,
        actorUserId: input.actorUserId,
        actorProviderId: input.actorProviderId,
        paymentId: input.paymentId,
        tiffinPaymentId: input.tiffinPaymentId,
        bookingId: input.bookingId,
        subscriptionId: input.subscriptionId,
        renewalId: input.renewalId,
        requestId: input.requestId,
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.gatewayPaymentId,
        baseAmount: input.baseAmount,
        platformFee: input.platformFee,
        ownerAmount: input.ownerAmount,
        studentPayable: input.studentPayable,
        metadata: input.metadata,
      },
    });
  },
};
