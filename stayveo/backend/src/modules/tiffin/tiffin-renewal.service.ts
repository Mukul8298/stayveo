import { MealCategory, TiffinPaymentStatus, TiffinSubscriptionStatus } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import { tiffinPaymentService } from './tiffin-payment.service.js';
import { paymentAuditService } from '../payments/payment-audit.service.js';
import { tiffinPaymentActionSchema } from './tiffin-payment.schema.js';
import { calculateTiffinPrice, tiffinPlanDurationDays } from './tiffin-pricing.js';

function dateKey(value: Date | null | undefined) { return value ? value.toISOString().slice(0, 10) : null; }
function addDays(value: Date, days: number) { const next = new Date(value); next.setUTCDate(next.getUTCDate() + days); return next; }
function number(value: unknown) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }
function meals(subscription: any) { return Number(subscription.optedLunch) + Number(subscription.optedDinner); }
function assertStudent(userId: unknown) {
  if (typeof userId !== 'string' || !userId.trim()) throw { statusCode: 401, message: 'Student authentication is required' };
  return userId.trim();
}

async function subscriptionForStudent(subscriptionId: string, userId: string) {
  const subscription = await prisma.tiffinCustomerSubscription.findFirst({
    where: { id: subscriptionId, customerId: userId, deletedAt: null },
    include: {
      kitchen: { include: { subscriptionPlans: { where: { isActive: true } } } },
      plan: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!subscription) throw { statusCode: 404, message: 'Tiffin subscription not found' };
  if (subscription.status !== TiffinSubscriptionStatus.ACTIVE && subscription.status !== TiffinSubscriptionStatus.EXPIRED) throw { statusCode: 409, message: 'This subscription cannot be renewed' };
  return subscription;
}

export const tiffinRenewalService = {
  async create(subscriptionId: string, userId: unknown, input: unknown = {}) {
    const customerId = assertStudent(userId);
    const data = tiffinPaymentActionSchema.parse(input);
    const subscription = await subscriptionForStudent(subscriptionId, customerId);
    const planType = String(subscription.plan.planType).toLowerCase();
    const mealCount = meals(subscription);
    const quote = calculateTiffinPrice(planType, mealCount, subscription.kitchen.subscriptionPlans);
    const baseAmount = quote.amount;
    const idempotencyKey = data.idempotencyKey || `renewal:${subscription.id}:${dateKey(subscription.endDate)}`;

    const payment = await prisma.$transaction((tx) => tiffinPaymentService.createPendingPayment(tx, {
      subscriptionId: subscription.id,
      reservationReference: subscription.subscriptionCode,
      kitchenId: subscription.kitchenId,
      customerId,
      amount: baseAmount,
      idempotencyKey,
      planType,
      mealsPerDay: mealCount,
      isRenewal: true,
    }));
    const ordered = payment.providerOrderId ? payment : await tiffinPaymentService.createGatewayOrder(payment.id, subscription.subscriptionCode);
    return { subscriptionId: subscription.id, payment: ordered, razorpay: { keyId: String(process.env.key_id || '').trim().replace(/,+$/, ''), orderId: ordered.providerOrderId, amount: Math.round(number(ordered.totalAmount) * 100), currency: ordered.currency } };
  },

  async complete(subscriptionId: string, userId: unknown, input: unknown = {}) {
    const customerId = assertStudent(userId);
    const data = tiffinPaymentActionSchema.parse(input);
    const subscription = await subscriptionForStudent(subscriptionId, customerId);
    const payment = subscription.payments[0];
    if (!payment || !payment.isRenewal) throw { statusCode: 409, message: 'A renewal payment attempt was not found' };
    if (!data.razorpayOrderId || !data.razorpayPaymentId || !data.razorpaySignature) throw { statusCode: 400, message: 'Razorpay payment details are required' };
    await tiffinPaymentService.verifyGatewayPayment(payment.id, { orderId: data.razorpayOrderId, paymentId: data.razorpayPaymentId, signature: data.razorpaySignature });

    return prisma.$transaction(async (tx) => {
      const current = await tx.tiffinCustomerSubscription.findUnique({ where: { id: subscription.id }, include: { kitchen: true, plan: true } });
      const paidPayment = await tx.tiffinPayment.findUniqueOrThrow({ where: { id: payment.id } });
      if (!current || paidPayment.status !== TiffinPaymentStatus.PAID) throw { statusCode: 409, message: 'Renewal payment is not verified' };
      const existingLog = await tx.tiffinSubscriptionRenewalLog.findFirst({ where: { paymentId: paidPayment.id } });
      if (existingLog) return { subscription: current, payment: paidPayment };

      const planDuration = tiffinPlanDurationDays(current.plan.planType);
      const lunchEnd = current.lunchEndDate || current.endDate;
      const dinnerEnd = current.dinnerEndDate || current.endDate;
      const lunchSkips = current.optedLunch ? await tx.tiffinSubscriptionSkip.count({ where: { subscriptionId: current.id, mealCategory: MealCategory.LUNCH, status: 'ACTIVE', renewalApplied: false } }) : 0;
      const dinnerSkips = current.optedDinner ? await tx.tiffinSubscriptionSkip.count({ where: { subscriptionId: current.id, mealCategory: MealCategory.DINNER, status: 'ACTIVE', renewalApplied: false } }) : 0;
      const nextLunchEnd = current.optedLunch ? addDays(lunchEnd, planDuration + lunchSkips) : null;
      const nextDinnerEnd = current.optedDinner ? addDays(dinnerEnd, planDuration + dinnerSkips) : null;
      const nextEnd = [nextLunchEnd, nextDinnerEnd].filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime()).at(-1) || current.endDate;
      const addedMeals = (current.optedLunch ? planDuration + lunchSkips : 0) + (current.optedDinner ? planDuration + dinnerSkips : 0);

      await tx.tiffinCustomerSubscription.update({ where: { id: current.id }, data: { status: TiffinSubscriptionStatus.ACTIVE, paymentStatus: TiffinPaymentStatus.PAID, endDate: nextEnd, lunchEndDate: nextLunchEnd, dinnerEndDate: nextDinnerEnd, totalEntitledDays: { increment: planDuration + Math.max(lunchSkips, dinnerSkips) }, remainingDays: { increment: planDuration + Math.max(lunchSkips, dinnerSkips) }, mealsRemaining: { increment: addedMeals } } });
      if (current.optedLunch) {
        await tx.tiffinSubscriptionRenewalLog.create({ data: { subscriptionId: current.id, oldEndDate: lunchEnd, newEndDate: nextLunchEnd!, addedMeals: planDuration + lunchSkips, mealCategory: MealCategory.LUNCH, paymentId: paidPayment.id } });
      }
      if (current.optedDinner) {
        await tx.tiffinSubscriptionRenewalLog.create({ data: { subscriptionId: current.id, oldEndDate: dinnerEnd, newEndDate: nextDinnerEnd!, addedMeals: planDuration + dinnerSkips, mealCategory: MealCategory.DINNER, paymentId: paidPayment.id } });
      }
      await tx.tiffinSubscriptionSkip.updateMany({ where: { subscriptionId: current.id, status: 'ACTIVE', renewalApplied: false }, data: { renewalApplied: true } });
      await paymentAuditService.record({ eventType: 'RENEWAL_CREATED', tiffinPaymentId: paidPayment.id, subscriptionId: current.id, baseAmount: number(paidPayment.baseAmount), platformFee: number(paidPayment.platformFee), ownerAmount: number(paidPayment.ownerAmount), studentPayable: number(paidPayment.totalAmount), metadata: { planType: String(current.plan.planType).toLowerCase(), lunchSkips, dinnerSkips, nextEnd: dateKey(nextEnd) } }, tx);
      return { subscription: await tx.tiffinCustomerSubscription.findUnique({ where: { id: current.id } }), payment: paidPayment };
    });
  },
};
