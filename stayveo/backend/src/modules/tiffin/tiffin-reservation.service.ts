import { MealCategory, MealLogStatus, Prisma, TiffinFoodType, TiffinPaymentStatus, TiffinSubscriptionStatus } from '@prisma/client';
import crypto from 'node:crypto';
import prisma from '../../common/db/prisma.js';
import { getCurrentTiffinDate, getCurrentTiffinDay } from '../../common/utils/tiffin-day.js';
import { tiffinRepository } from './tiffin.repository.js';
import { createTiffinReservationSchema } from './tiffin-reservation.schema.js';
import { getTiffinPaymentConfig, tiffinPaymentService } from './tiffin-payment.service.js';
import { tiffinPaymentActionSchema } from './tiffin-payment.schema.js';

type AnyRecord = Record<string, any>;
type DbClient = typeof prisma | Prisma.TransactionClient;
const DEV_GUEST_STUDENT_ID = '00000000-0000-4000-8000-000000000001';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function datePart(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function amountForPlan(plan: AnyRecord) {
  return Number(plan.discountPrice ?? plan.price ?? 0);
}

function serializePlan(plan: AnyRecord) {
  return {
    id: plan.id,
    type: String(plan.planType || '').toLowerCase(),
    name: plan.planName,
    price: amountForPlan(plan),
    listPrice: Number(plan.price || 0),
    discountPrice: plan.discountPrice === null ? null : Number(plan.discountPrice || 0),
    durationDays: plan.durationDays,
    totalMeals: plan.totalMeals,
    description: plan.description || '',
  };
}

function serializeStudent(user: AnyRecord) {
  const profile = user.studentProfile;
  return {
    id: user.id,
    name: profile?.fullName || '',
    phone: user.phone_number || '',
    address: profile?.currentAddress || '',
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    foodPreference: String(profile?.foodPreference || 'veg').toLowerCase(),
    college: profile?.college || '',
  };
}

function reservationStatus(subscription: AnyRecord, payment: AnyRecord | null) {
  if (subscription.status === TiffinSubscriptionStatus.ACTIVE) return 'confirmed';
  if (subscription.status === TiffinSubscriptionStatus.CANCELLED) return 'cancelled';
  if (subscription.status === TiffinSubscriptionStatus.EXPIRED) return 'expired';
  if (payment?.status === TiffinPaymentStatus.PROCESSING) return 'payment_processing';
  if (payment?.status === TiffinPaymentStatus.FAILED) return 'payment_failed';
  if (payment?.status === TiffinPaymentStatus.CANCELLED) return 'payment_cancelled';
  return 'payment_pending';
}

function serializeReservation(subscription: AnyRecord, kitchen: AnyRecord, payment: AnyRecord | null) {
  return {
    id: subscription.id,
    reference: subscription.subscriptionCode,
    serviceId: kitchen.id,
    serviceName: kitchen.kitchenName,
    providerName: kitchen.ownerName,
    plan: subscription.plan ? serializePlan(subscription.plan) : null,
    status: reservationStatus(subscription, payment),
    subscriptionStatus: String(subscription.status || '').toLowerCase(),
    paymentStatus: String(payment?.status || subscription.paymentStatus || 'pending').toLowerCase(),
    paymentGateway: payment?.paymentGateway || null,
    testPayment: ['mock', 'test'].includes(String(payment?.paymentGateway || '').toLowerCase()),
    payment: payment ? {
      id: payment.id,
      status: String(payment.status || '').toLowerCase(),
      amount: Number(payment.totalAmount || subscription.amount || 0),
      currency: payment.currency || subscription.currency || 'INR',
      gateway: payment.paymentGateway || null,
      provider: payment.paymentGateway || null,
      providerOrderId: payment.providerOrderId || null,
      providerPaymentId: payment.providerPaymentId || null,
      transactionId: payment.transactionId || null,
      paidAt: payment.paidAt || null,
    } : null,
    amount: Number(subscription.amount ?? payment?.totalAmount ?? 0),
    currency: subscription.currency || payment?.currency || 'INR',
    startDate: datePart(subscription.startDate),
    endDate: datePart(subscription.endDate),
    deliveryAddress: subscription.deliveryAddress || '',
    dietPreference: String(subscription.dietPreference || '').toLowerCase(),
    createdAt: subscription.createdAt,
    confirmedAt: subscription.confirmedAt,
  };
}

function dietEnum(value: string) {
  if (value === 'nonveg') return TiffinFoodType.NONVEG;
  if (value === 'jain') return TiffinFoodType.JAIN;
  return TiffinFoodType.VEG;
}

function hasMenuItems(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => typeof item === 'string' && item.trim());
  if (value && typeof value === 'object') return Object.values(value).some((items) => hasMenuItems(items));
  return false;
}

/** Materialize only today's eligible meals from active subscriptions and the live weekly menu. */
export async function ensureTodayMealLogs(client: DbClient, kitchenId: string, dateKey = getCurrentTiffinDate()) {
  const date = dateOnly(dateKey);
  // Date-only values are persisted at UTC midnight. Resolve their weekday at
  // noon so IST does not shift Sunday/Monday across a calendar boundary.
  const dayOfWeek = getCurrentTiffinDay(new Date(`${dateKey}T12:00:00.000Z`));
  const menus = await client.tiffinKitchenWeeklyMenu.findMany({
    where: { kitchenId, dayOfWeek, mealCategory: { in: [MealCategory.LUNCH, MealCategory.DINNER] } },
    select: { mealCategory: true, items: true },
  });
  const availableMeals = new Set(menus.filter((menu) => hasMenuItems(menu.items)).map((menu) => menu.mealCategory));
  if (!availableMeals.size) return;

  const subscriptions = await client.tiffinCustomerSubscription.findMany({
    where: {
      kitchenId,
      status: TiffinSubscriptionStatus.ACTIVE,
      deletedAt: null,
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: {
      id: true,
      customerId: true,
      optedLunch: true,
      optedDinner: true,
    },
  });

  const data = subscriptions.flatMap((subscription) => {
    const meals: MealCategory[] = [];
    if (subscription.optedLunch && availableMeals.has(MealCategory.LUNCH)) meals.push(MealCategory.LUNCH);
    if (subscription.optedDinner && availableMeals.has(MealCategory.DINNER)) meals.push(MealCategory.DINNER);
    return meals.map((mealCategory) => ({
      subscriptionId: subscription.id,
      kitchenId,
      customerId: subscription.customerId,
      mealDate: date,
      mealCategory,
      status: MealLogStatus.SCHEDULED,
    }));
  });

  if (data.length) await client.tiffinMealLog.createMany({ data, skipDuplicates: true });
}

/**
 * Repairs the only safe stale-payment state: a payment row is already PAID,
 * but an older confirmation request stopped before activating its pending
 * reservation. The payment row remains authoritative; activation is done
 * atomically and is idempotent.
 */
export async function reconcilePaidTiffinReservations(kitchenId?: string, customerId?: string) {
  const candidates = await prisma.tiffinCustomerSubscription.findMany({
    where: {
      kitchenId: kitchenId || undefined,
      customerId: customerId || undefined,
      deletedAt: null,
      status: TiffinSubscriptionStatus.PENDING,
      payments: { some: { status: TiffinPaymentStatus.PAID } },
    },
    include: { payments: { where: { status: TiffinPaymentStatus.PAID }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  for (const candidate of candidates) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.tiffinCustomerSubscription.findUnique({ where: { id: candidate.id } });
      if (!current || current.status !== TiffinSubscriptionStatus.PENDING) return;
      const payment = candidate.payments[0];
      const confirmed = await tx.tiffinCustomerSubscription.update({ where: { id: candidate.id }, data: { status: TiffinSubscriptionStatus.ACTIVE, paymentStatus: TiffinPaymentStatus.PAID, confirmedAt: current.confirmedAt || new Date() } });
      await tx.tiffinActivityLog.create({ data: { kitchenId: confirmed.kitchenId, userId: confirmed.customerId, action: 'SUBSCRIPTION_CONFIRMED', description: `Tiffin reservation ${confirmed.subscriptionCode} confirmed from payment`, metadata: { subscriptionId: confirmed.id, paymentId: payment?.id || null, source: 'payment_reconciliation' } } });
    }, { timeout: 15000 });
  }
}

async function getStudent(userId: unknown) {
  const id = text(userId);
  if (!id && getTiffinPaymentConfig().enabled) {
    // Development checkout deliberately works without authentication. This
    // synthetic identity is never enabled in production and is only used to
    // keep the existing UUID-based reservation schema intact.
    return {
      id: DEV_GUEST_STUDENT_ID,
      role: 'STUDENT',
      phone_number: '0000000000',
      studentProfile: {
        fullName: 'Development Student',
        college: 'Development Mode',
        foodPreference: 'veg',
        currentAddress: '',
        latitude: null,
        longitude: null,
      },
    };
  }
  if (!id) throw { statusCode: 401, message: 'Student authentication is required' };
  const user = await prisma.user.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!user) throw { statusCode: 401, message: 'Student session is invalid' };
  if (String(user.role) !== 'STUDENT') throw { statusCode: 403, message: 'Only students can create Tiffin reservations' };
  if (!user.studentProfile) throw { statusCode: 400, message: 'Complete your student profile before reserving a Tiffin plan' };
  return user;
}

async function getKitchenAndPlan(serviceId: string, planId?: string, planType?: string) {
  const kitchen = await tiffinRepository.findKitchenForService(serviceId);
  if (!kitchen) throw { statusCode: 404, message: 'Tiffin service not found' };
  const plan = planId
    ? kitchen.subscriptionPlans.find((item: AnyRecord) => item.id === planId)
    : kitchen.subscriptionPlans.find((item: AnyRecord) => String(item.planType).toLowerCase() === text(planType).toLowerCase()) || kitchen.subscriptionPlans[0];
  if (!plan) throw { statusCode: 400, message: 'This Tiffin service has no active meal plan' };
  return { kitchen, plan };
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sameAmount(left: unknown, right: number) {
  const parsed = Number(left);
  return Number.isFinite(parsed) && parsed.toFixed(2) === right.toFixed(2);
}

async function getReservationById(client: DbClient, reservationId: string, customerId: string) {
  if (!isUuid(reservationId)) throw { statusCode: 404, message: 'Reservation not found' };
  const subscription = await client.tiffinCustomerSubscription.findFirst({
    where: { id: reservationId, customerId, deletedAt: null },
    include: { kitchen: true, plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!subscription) throw { statusCode: 404, message: 'Reservation not found' };
  return subscription;
}

async function findReservationWithPayment(client: DbClient, reservationId: string, customerId: string, paymentId?: string) {
  const subscription = await getReservationById(client, reservationId, customerId);
  if (!paymentId) return { subscription, payment: subscription.payments[0] || null };
  if (!isUuid(paymentId)) throw { statusCode: 404, message: 'Payment not found' };
  const payment = await client.tiffinPayment.findFirst({ where: { id: paymentId, subscriptionId: subscription.id } });
  if (!payment) throw { statusCode: 404, message: 'Payment does not belong to this reservation' };
  return { subscription, payment };
}

async function assertServiceMatches(serviceId: string, kitchenId: string) {
  const kitchen = await tiffinRepository.findKitchenForService(serviceId);
  if (!kitchen || kitchen.id !== kitchenId) throw { statusCode: 404, message: 'Reservation is not part of this Tiffin service' };
}

function assertPaymentRequest(subscription: AnyRecord, payment: AnyRecord, input: AnyRecord) {
  const expectedAmount = Number(subscription.amount);
  const expectedCurrency = String(subscription.currency || 'INR').toUpperCase();
  if (!Number.isFinite(expectedAmount) || expectedAmount < 0) {
    throw { statusCode: 409, message: 'Reservation has an invalid payment amount' };
  }
  if (!sameAmount(payment.totalAmount, expectedAmount)) {
    throw { statusCode: 400, message: 'Payment amount does not match the reservation amount' };
  }
  if (String(payment.currency || '').toUpperCase() !== expectedCurrency) {
    throw { statusCode: 400, message: 'Payment currency does not match the reservation currency' };
  }
  if (input.amount !== undefined && !sameAmount(input.amount, expectedAmount)) {
    throw { statusCode: 400, message: 'Payment amount does not match the reservation amount' };
  }
  if (input.currency !== undefined && String(input.currency).toUpperCase() !== expectedCurrency) {
    throw { statusCode: 400, message: 'Payment currency does not match the reservation currency' };
  }
}

async function activatePaidReservation(client: DbClient, subscription: AnyRecord, payment: AnyRecord, userId: string) {
  const result = await client.tiffinCustomerSubscription.updateMany({
    where: { id: subscription.id, status: TiffinSubscriptionStatus.PENDING, deletedAt: null },
    data: {
      status: TiffinSubscriptionStatus.ACTIVE,
      paymentStatus: TiffinPaymentStatus.PAID,
      confirmedAt: new Date(),
    },
  });

  if (!result.count) {
    const current = await getReservationById(client, subscription.id, userId);
    const currentPayment = current.payments[0] || payment;
    if (current.status === TiffinSubscriptionStatus.ACTIVE && currentPayment.status === TiffinPaymentStatus.PAID) {
      return serializeReservation(current, current.kitchen, currentPayment);
    }
    throw { statusCode: 409, message: 'Reservation status changed before activation completed' };
  }

  const confirmed = await getReservationById(client, subscription.id, userId);
  const today = getCurrentTiffinDate();
  if (datePart(confirmed.startDate)! <= today && datePart(confirmed.endDate)! >= today) {
    await ensureTodayMealLogs(client, confirmed.kitchenId, today);
  }
  await client.tiffinActivityLog.create({
    data: {
      kitchenId: confirmed.kitchenId,
      userId,
      action: 'subscription_confirmed',
      description: `Tiffin reservation ${confirmed.subscriptionCode} confirmed`,
      metadata: { subscriptionId: confirmed.id, paymentId: payment.id, paymentGateway: payment.paymentGateway || null },
    },
  });
  return serializeReservation(confirmed, confirmed.kitchen, payment);
}

export const tiffinReservationService = {
  async getContext(serviceId: string, userId: unknown, planId?: string, planType?: string) {
    const user = await getStudent(userId);
    await reconcilePaidTiffinReservations(undefined, user.id);
    const { kitchen, plan } = await getKitchenAndPlan(serviceId, planId, planType);
    const existing = await prisma.tiffinCustomerSubscription.findFirst({
      where: {
        kitchenId: kitchen.id,
        customerId: user.id,
        deletedAt: null,
        status: { in: [TiffinSubscriptionStatus.ACTIVE, TiffinSubscriptionStatus.PENDING] },
      },
      include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      service: {
        id: serviceId,
        kitchenId: kitchen.id,
        name: kitchen.kitchenName,
        providerName: kitchen.ownerName,
        address: kitchen.address || '',
        deliveryRadiusKm: Number(kitchen.deliveryRadiusKm || 0),
        foodType: String(kitchen.foodType || '').toLowerCase(),
        deliveryType: String(kitchen.deliveryType || '').toLowerCase(),
      },
      plans: kitchen.subscriptionPlans.map(serializePlan),
      selectedPlan: serializePlan(plan),
      student: serializeStudent(user),
      existingReservation: existing ? serializeReservation(existing, kitchen, existing.payments[0] || null) : null,
      payment: getTiffinPaymentConfig(),
      defaultStartDate: getCurrentTiffinDate(),
    };
  },

  async create(serviceId: string, userId: unknown, input: unknown) {
    const data = createTiffinReservationSchema.parse(input);
    const user = await getStudent(userId);
    const { kitchen, plan } = await getKitchenAndPlan(serviceId, data.planId);
    const today = getCurrentTiffinDate();
    const startDateKey = data.startDate || today;
    if (startDateKey < today) throw { statusCode: 400, message: 'Start date cannot be in the past' };
    if (!data.optedLunch && !data.optedDinner) throw { statusCode: 400, message: 'Select at least one meal' };

    const amount = amountForPlan(plan);
    if (!Number.isFinite(amount) || amount < 0) throw { statusCode: 400, message: 'The selected meal plan has an invalid price' };
    const idempotencyKey = data.idempotencyKey || crypto.randomUUID();

    const existingPayment = await prisma.tiffinPayment.findUnique({ where: { idempotencyKey } });
    if (existingPayment) {
      const existing = await prisma.tiffinCustomerSubscription.findUnique({ where: { id: existingPayment.subscriptionId }, include: { plan: true } });
      if (existing && existing.customerId === user.id && existing.kitchenId === kitchen.id) {
        return serializeReservation(existing, kitchen, existingPayment);
      }
      throw { statusCode: 409, message: 'This reservation request has already been used' };
    }

    const duplicate = await prisma.tiffinCustomerSubscription.findFirst({
      where: {
        kitchenId: kitchen.id,
        customerId: user.id,
        deletedAt: null,
        status: { in: [TiffinSubscriptionStatus.ACTIVE, TiffinSubscriptionStatus.PENDING] },
      },
      include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    if (duplicate) {
      if (duplicate.status === TiffinSubscriptionStatus.ACTIVE) throw { statusCode: 409, message: 'You already have an active Tiffin subscription for this service' };
      return serializeReservation(duplicate, kitchen, duplicate.payments[0] || null);
    }

    const startDate = dateOnly(startDateKey);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + plan.durationDays - 1);
    const subscriptionCode = `TIF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const subscription = await prisma.$transaction(async (tx) => {
      const created = await tx.tiffinCustomerSubscription.create({
        data: {
          subscriptionCode,
          kitchenId: kitchen.id,
          customerId: user.id,
          planId: plan.id,
          dietPreference: dietEnum(data.dietPreference),
          customInstructions: text(data.customInstructions) || null,
          optedLunch: data.optedLunch,
          optedDinner: data.optedDinner,
          optedBreakfast: false,
          deliveryAddress: data.deliveryAddress,
          deliveryLatitude: data.deliveryLatitude ?? user.studentProfile?.latitude ?? null,
          deliveryLongitude: data.deliveryLongitude ?? user.studentProfile?.longitude ?? null,
          amount,
          currency: 'INR',
          startDate,
          endDate,
          totalMealsAllocated: plan.totalMeals,
          mealsRemaining: plan.totalMeals,
          totalEntitledDays: plan.durationDays,
          remainingDays: plan.durationDays,
          paymentStatus: TiffinPaymentStatus.PENDING,
          status: TiffinSubscriptionStatus.PENDING,
        },
        include: { plan: true },
      });
      await tiffinPaymentService.createPendingPayment(tx, {
        subscriptionId: created.id,
        reservationReference: created.subscriptionCode,
        kitchenId: kitchen.id,
        customerId: user.id,
        amount,
        idempotencyKey,
      });
      return created;
    });
    const payment = await prisma.tiffinPayment.findFirst({ where: { subscriptionId: subscription.id }, orderBy: { createdAt: 'desc' } });
    return serializeReservation(subscription, kitchen, payment);
  },

  async createPayment(reservationId: string, userId: unknown, input: unknown = {}) {
    const data = tiffinPaymentActionSchema.parse(input);
    const user = await getStudent(userId);
    if (!getTiffinPaymentConfig().enabled) throw { statusCode: 503, message: 'Development mock payment controls are disabled' };

    return prisma.$transaction(async (tx) => {
      const { subscription, payment } = await findReservationWithPayment(tx, reservationId, user.id);
      if (!payment) throw { statusCode: 409, message: 'Reservation payment record is missing' };
      if (payment.status === TiffinPaymentStatus.PAID && subscription.status === TiffinSubscriptionStatus.ACTIVE) {
        return serializeReservation(subscription, subscription.kitchen, payment);
      }
      if (([TiffinPaymentStatus.PENDING, TiffinPaymentStatus.PROCESSING] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
        return serializeReservation(subscription, subscription.kitchen, payment);
      }
      if (!([TiffinPaymentStatus.FAILED, TiffinPaymentStatus.CANCELLED] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
        throw { statusCode: 409, message: 'This reservation is not available for another payment attempt' };
      }

      const amount = Number(subscription.amount);
      const idempotencyKey = data.idempotencyKey || `retry-${subscription.id}-${crypto.randomUUID()}`;
      const nextPayment = await tiffinPaymentService.createPendingPayment(tx, {
        subscriptionId: subscription.id,
        reservationReference: subscription.subscriptionCode,
        kitchenId: subscription.kitchenId,
        customerId: subscription.customerId,
        amount,
        idempotencyKey,
      });
      if (nextPayment.status !== TiffinPaymentStatus.PENDING) {
        throw { statusCode: 409, message: 'This payment retry request has already been used' };
      }
      const reset = await tx.tiffinCustomerSubscription.update({
        where: { id: subscription.id },
        data: { paymentStatus: TiffinPaymentStatus.PENDING },
        include: { kitchen: true, plan: true },
      });
      return serializeReservation(reset, reset.kitchen, nextPayment);
    }, { timeout: 15000 });
  },

  async processPayment(reservationId: string, userId: unknown, input: unknown = {}) {
    const data = tiffinPaymentActionSchema.parse(input);
    const user = await getStudent(userId);
    return prisma.$transaction(async (tx) => {
      const { subscription, payment } = await findReservationWithPayment(tx, reservationId, user.id, data.paymentId);
      if (!payment) throw { statusCode: 409, message: 'Reservation payment record is missing' };
      assertPaymentRequest(subscription, payment, data);
      if (subscription.status !== TiffinSubscriptionStatus.PENDING) {
        if (payment.status === TiffinPaymentStatus.PAID) return serializeReservation(subscription, subscription.kitchen, payment);
        throw { statusCode: 409, message: 'This reservation is no longer awaiting payment' };
      }
      const processing = await tiffinPaymentService.markProcessing(tx, payment);
      const updated = await tx.tiffinCustomerSubscription.update({
        where: { id: subscription.id },
        data: { paymentStatus: TiffinPaymentStatus.PROCESSING },
        include: { kitchen: true, plan: true },
      });
      return serializeReservation(updated, updated.kitchen, processing);
    }, { timeout: 15000 });
  },

  async completePayment(reservationId: string, userId: unknown, input: unknown = {}) {
    const data = tiffinPaymentActionSchema.parse(input);
    const user = await getStudent(userId);
    return prisma.$transaction(async (tx) => {
      const { subscription, payment } = await findReservationWithPayment(tx, reservationId, user.id, data.paymentId);
      if (!payment) throw { statusCode: 409, message: 'Reservation payment record is missing' };
      assertPaymentRequest(subscription, payment, data);

      if (payment.status === TiffinPaymentStatus.PAID) {
        if (subscription.status === TiffinSubscriptionStatus.ACTIVE) return serializeReservation(subscription, subscription.kitchen, payment);
        if (subscription.status !== TiffinSubscriptionStatus.PENDING) throw { statusCode: 409, message: 'This reservation can no longer be activated' };
        return activatePaidReservation(tx, subscription, payment, user.id);
      }
      if (subscription.status !== TiffinSubscriptionStatus.PENDING) throw { statusCode: 409, message: 'This reservation can no longer be confirmed' };
      if (([TiffinPaymentStatus.FAILED, TiffinPaymentStatus.CANCELLED, TiffinPaymentStatus.REFUNDED] as TiffinPaymentStatus[]).includes(payment.status as TiffinPaymentStatus)) {
        throw { statusCode: 409, message: 'This payment attempt is closed. Start a new payment attempt to retry.' };
      }

      const verifiedPayment = await tiffinPaymentService.verifyPayment(tx, payment, {
        expectedAmount: Number(subscription.amount),
        expectedCurrency: subscription.currency || 'INR',
      });
      return activatePaidReservation(tx, subscription, verifiedPayment, user.id);
    }, { timeout: 15000 });
  },

  async failPayment(reservationId: string, userId: unknown, input: unknown = {}) {
    const data = tiffinPaymentActionSchema.parse(input);
    const user = await getStudent(userId);
    return prisma.$transaction(async (tx) => {
      const { subscription, payment } = await findReservationWithPayment(tx, reservationId, user.id, data.paymentId);
      if (!payment) throw { statusCode: 409, message: 'Reservation payment record is missing' };
      assertPaymentRequest(subscription, payment, data);
      const failed = await tiffinPaymentService.markFailed(tx, payment);
      await tx.tiffinCustomerSubscription.updateMany({
        where: { id: subscription.id, status: TiffinSubscriptionStatus.PENDING },
        data: { paymentStatus: TiffinPaymentStatus.FAILED },
      });
      const current = await getReservationById(tx, subscription.id, user.id);
      return serializeReservation(current, current.kitchen, failed);
    }, { timeout: 15000 });
  },

  async cancelPayment(reservationId: string, userId: unknown, input: unknown = {}) {
    const data = tiffinPaymentActionSchema.parse(input);
    const user = await getStudent(userId);
    return prisma.$transaction(async (tx) => {
      const { subscription, payment } = await findReservationWithPayment(tx, reservationId, user.id, data.paymentId);
      if (!payment) throw { statusCode: 409, message: 'Reservation payment record is missing' };
      assertPaymentRequest(subscription, payment, data);
      const cancelled = await tiffinPaymentService.markCancelled(tx, payment);
      await tx.tiffinCustomerSubscription.updateMany({
        where: { id: subscription.id, status: TiffinSubscriptionStatus.PENDING },
        data: { paymentStatus: TiffinPaymentStatus.CANCELLED },
      });
      const current = await getReservationById(tx, subscription.id, user.id);
      return serializeReservation(current, current.kitchen, cancelled);
    }, { timeout: 15000 });
  },

  /** Kept for clients from the previous development flow; it now uses the same verified path. */
  async confirm(reservationId: string, userId: unknown) {
    return this.completePayment(reservationId, userId);
  },

  async get(reservationId: string, userId: unknown, serviceId?: string) {
    const user = await getStudent(userId);
    const subscription = await getReservationById(prisma, reservationId, user.id);
    if (serviceId) await assertServiceMatches(serviceId, subscription.kitchenId);
    return serializeReservation(subscription, subscription.kitchen, subscription.payments[0] || null);
  },

  async getPayment(serviceId: string, paymentId: string, userId: unknown) {
    const user = await getStudent(userId);
    if (!isUuid(paymentId)) throw { statusCode: 404, message: 'Payment not found' };
    const payment = await prisma.tiffinPayment.findFirst({
      where: { id: paymentId, customerId: user.id },
      include: { subscription: { include: { kitchen: true, plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    if (!payment || payment.subscription.deletedAt) throw { statusCode: 404, message: 'Payment not found' };
    await assertServiceMatches(serviceId, payment.subscription.kitchenId);
    return serializeReservation(payment.subscription, payment.subscription.kitchen, payment);
  },

  async listMine(userId: unknown) {
    const user = await getStudent(userId);
    await reconcilePaidTiffinReservations(undefined, user.id);
    const subscriptions = await prisma.tiffinCustomerSubscription.findMany({
      where: { customerId: user.id, deletedAt: null },
      include: { kitchen: true, plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    return subscriptions.map((subscription) => serializeReservation(subscription, subscription.kitchen, subscription.payments[0] || null));
  },
};
