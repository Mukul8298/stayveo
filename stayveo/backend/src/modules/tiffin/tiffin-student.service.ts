import { MealCategory, MealLogStatus, Prisma, TiffinPaymentStatus, TiffinSubscriptionStatus } from '@prisma/client';
import prisma from '../../common/db/prisma.js';
import { getCurrentTiffinDate, getCurrentTiffinDay } from '../../common/utils/tiffin-day.js';
import { ensureTodayMealLogs, reconcilePaidTiffinReservations } from './tiffin-reservation.service.js';

type AnyRecord = Record<string, any>;
type DbClient = typeof prisma | Prisma.TransactionClient;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const MEALS = ['lunch', 'dinner'] as const;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateAtNoon(value: string) {
  // A UTC midnight is still the previous calendar day in IST. Noon keeps a
  // weekday lookup stable while all persisted meal dates remain date-only.
  return new Date(`${value}T12:00:00.000Z`);
}

function dateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateOnly(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function menuItems(value: unknown, preference: string) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  if (!value || typeof value !== 'object') return [];
  const source = value as AnyRecord;
  const preferred = source[preference] || source.veg || source.nonveg || source.jain || Object.values(source).find(Array.isArray);
  return Array.isArray(preferred) ? preferred.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}

function mealCategory(value: string) {
  return value === 'dinner' ? MealCategory.DINNER : MealCategory.LUNCH;
}

function mealName(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function assertStudent(userId: unknown) {
  const id = text(userId);
  if (!id) throw { statusCode: 401, message: 'Student authentication is required' };
  return id;
}

async function findSubscription(userId: string, subscriptionId?: string, client: DbClient = prisma) {
  const today = dateOnly(getCurrentTiffinDate());
  const where: AnyRecord = {
    customerId: userId,
    deletedAt: null,
    status: { in: [TiffinSubscriptionStatus.ACTIVE, TiffinSubscriptionStatus.PAUSED] },
    startDate: { lte: today },
    endDate: { gte: today },
  };
  if (subscriptionId) where.id = subscriptionId;
  return client.tiffinCustomerSubscription.findFirst({
    where,
    include: {
      kitchen: true,
      plan: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
      pauseLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

function serializePayment(payment: AnyRecord | null, subscription: AnyRecord) {
  const status = payment?.status || subscription.paymentStatus || TiffinPaymentStatus.PENDING;
  return {
    id: payment?.id || null,
    status: String(status).toLowerCase(),
    displayStatus: status === TiffinPaymentStatus.PAID ? 'paid' : String(status).toLowerCase(),
    amount: Number(payment?.totalAmount ?? subscription.amount ?? 0),
    currency: payment?.currency || subscription.currency || 'INR',
    gateway: payment?.paymentGateway || null,
    transactionId: payment?.transactionId || null,
    providerOrderId: payment?.providerOrderId || null,
    providerPaymentId: payment?.providerPaymentId || null,
    paidAt: payment?.paidAt || null,
  };
}

async function menuForSubscription(client: DbClient, kitchenId: string, preference: string) {
  const menus = await client.tiffinKitchenWeeklyMenu.findMany({
    where: { kitchenId },
    select: { dayOfWeek: true, mealCategory: true, items: true },
  });
  const grouped = new Map<string, AnyRecord>();
  for (const day of DAYS) grouped.set(day, { day, lunch: [], dinner: [] });
  for (const menu of menus) {
    const day = String(menu.dayOfWeek).toLowerCase();
    const meal = String(menu.mealCategory).toLowerCase();
    if (!grouped.has(day) || !MEALS.includes(meal as typeof MEALS[number])) continue;
    grouped.get(day)![meal] = menuItems(menu.items, preference);
  }
  return [...grouped.values()];
}

function serializeMeal(log: AnyRecord | null, meal: typeof MEALS[number], items: string[], date: string) {
  return {
    id: log?.id || null,
    meal,
    label: mealName(meal),
    date,
    items,
    status: log ? String(log.status).toLowerCase() : (items.length ? 'scheduled' : 'not_planned'),
    deliveredAt: log?.deliveredAt || null,
  };
}

function serializeDelivery(log: AnyRecord, address: string) {
  return {
    id: log.id,
    date: dateKey(log.mealDate),
    meal: String(log.mealCategory).toLowerCase(),
    status: String(log.status).toLowerCase(),
    address,
    deliveredAt: log.deliveredAt || null,
  };
}

async function getSpace(userId: string) {
  await reconcilePaidTiffinReservations(undefined, userId);
  const subscription = await findSubscription(userId);
  if (!subscription) return { hasTiffin: false, tiffin: null };

  const today = getCurrentTiffinDate();
  await ensureTodayMealLogs(prisma, subscription.kitchenId, today);
  const preference = String(subscription.dietPreference || 'veg').toLowerCase();
  const [weeklyMenu, todayLogs, deliveries] = await Promise.all([
    menuForSubscription(prisma, subscription.kitchenId, preference),
    prisma.tiffinMealLog.findMany({
      where: { subscriptionId: subscription.id, mealDate: dateOnly(today) },
      orderBy: { mealCategory: 'asc' },
    }),
    prisma.tiffinMealLog.findMany({
      where: {
        subscriptionId: subscription.id,
        mealDate: { lte: dateOnly(today) },
      },
      orderBy: [{ mealDate: 'desc' }, { mealCategory: 'asc' }],
      take: 30,
    }),
  ]);
  const deliveryEnd = dateOnly(today);
  deliveryEnd.setUTCDate(deliveryEnd.getUTCDate() + 7);
  const upcomingDeliveries = await prisma.tiffinMealLog.findMany({
    where: { subscriptionId: subscription.id, mealDate: { gte: dateOnly(today), lte: deliveryEnd } },
    orderBy: [{ mealDate: 'asc' }, { mealCategory: 'asc' }],
    take: 30,
  });
  const todayDay = getCurrentTiffinDay(dateAtNoon(today));
  const todayMenu = weeklyMenu.find((item) => item.day === todayDay) || { lunch: [], dinner: [] };
  const logsByMeal = new Map(todayLogs.map((log) => [String(log.mealCategory).toLowerCase(), log]));
  const latestPayment = subscription.payments[0] || null;
  const activePause = subscription.pauseLogs.find((pause: AnyRecord) => !pause.resumedEarlyAt && dateKey(pause.pauseEndDate)! >= today) || null;

  return {
    hasTiffin: true,
    tiffin: {
      subscriptionId: subscription.id,
      reservationId: subscription.subscriptionCode,
      serviceId: subscription.kitchenId,
      serviceName: subscription.kitchen.kitchenName,
      providerName: subscription.kitchen.ownerName,
      description: subscription.kitchen.description || '',
      address: subscription.kitchen.address || '',
      foodType: String(subscription.kitchen.foodType || '').toLowerCase(),
      deliveryType: String(subscription.kitchen.deliveryType || '').toLowerCase(),
      deliveryRadiusKm: Number(subscription.kitchen.deliveryRadiusKm || 0),
      foodPreference: preference,
      deliveryAddress: subscription.deliveryAddress || '',
      plan: { name: subscription.plan.planName, price: Number(subscription.amount), currency: subscription.currency, durationDays: subscription.plan.durationDays },
      status: String(subscription.status).toLowerCase(),
      startDate: dateKey(subscription.startDate),
      renewalDate: dateKey(subscription.endDate),
      payment: serializePayment(latestPayment, subscription),
      pause: activePause ? { startDate: dateKey(activePause.pauseStartDate), endDate: dateKey(activePause.pauseEndDate) } : null,
      today: {
        date: today,
        day: todayDay,
        meals: [
          serializeMeal(logsByMeal.get('lunch') || null, 'lunch', todayMenu.lunch, today),
          serializeMeal(logsByMeal.get('dinner') || null, 'dinner', todayMenu.dinner, today),
        ],
      },
      weeklyMenu,
      deliveries: upcomingDeliveries.map((log) => serializeDelivery(log, subscription.deliveryAddress || '')),
      deliveryHistory: deliveries.map((log) => serializeDelivery(log, subscription.deliveryAddress || '')),
    },
  };
}

export const tiffinStudentService = {
  async getMySpace(userId: unknown) {
    return getSpace(assertStudent(userId));
  },

  async skipMeal(userId: unknown, subscriptionId: string, input: AnyRecord = {}) {
    const customerId = assertStudent(userId);
    const meal = text(input.meal).toLowerCase();
    const mealDate = text(input.date) || getCurrentTiffinDate();
    if (!MEALS.includes(meal as typeof MEALS[number])) throw { statusCode: 400, message: 'Choose lunch or dinner' };
    if (!validDateKey(mealDate)) throw { statusCode: 400, message: 'Meal date is invalid' };

    const subscription = await findSubscription(customerId, subscriptionId);
    if (!subscription || subscription.status !== TiffinSubscriptionStatus.ACTIVE) throw { statusCode: 404, message: 'Active Tiffin subscription not found' };
    if (mealDate < dateKey(subscription.startDate)! || mealDate > dateKey(subscription.endDate)!) throw { statusCode: 400, message: 'Meal date is outside your subscription' };

    const day = getCurrentTiffinDay(dateAtNoon(mealDate));
    const menu = await prisma.tiffinKitchenWeeklyMenu.findFirst({ where: { kitchenId: subscription.kitchenId, dayOfWeek: day, mealCategory: mealCategory(meal) }, select: { items: true } });
    if (!menuItems(menu?.items, String(subscription.dietPreference).toLowerCase()).length) throw { statusCode: 400, message: `No ${meal} is planned for ${mealDate}` };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.tiffinMealLog.findUnique({ where: { subscriptionId_mealDate_mealCategory: { subscriptionId, mealDate: dateOnly(mealDate), mealCategory: mealCategory(meal) } } });
      if (existing?.status === MealLogStatus.SKIPPED) return;
      if (existing?.status === MealLogStatus.DELIVERED) throw { statusCode: 409, message: 'A delivered meal cannot be skipped' };
      if (existing?.status === MealLogStatus.CANCELLED) throw { statusCode: 409, message: 'This meal is no longer available to skip' };
      if (existing) {
        await tx.tiffinMealLog.update({ where: { id: existing.id }, data: { status: MealLogStatus.SKIPPED, skippedAt: new Date() } });
      } else {
        await tx.tiffinMealLog.create({ data: { subscriptionId, kitchenId: subscription.kitchenId, customerId, mealDate: dateOnly(mealDate), mealCategory: mealCategory(meal), status: MealLogStatus.SKIPPED, skippedAt: new Date() } });
      }
      await tx.tiffinCustomerSubscription.update({ where: { id: subscriptionId }, data: { mealsSkipped: { increment: 1 } } });
      await tx.tiffinActivityLog.create({
        data: {
          kitchenId: subscription.kitchenId,
          userId: customerId,
          action: 'MEAL_SKIPPED',
          description: `${mealName(meal)} skipped for ${mealDate}`,
          metadata: { subscriptionId, mealDate, mealCategory: meal, eventType: 'MEAL_SKIPPED' },
        },
      });
    }, { timeout: 15000 });
    return getSpace(customerId);
  },

  async pauseSubscription(userId: unknown, subscriptionId: string, input: AnyRecord = {}) {
    const customerId = assertStudent(userId);
    const startDate = text(input.startDate);
    const endDate = text(input.endDate);
    const today = getCurrentTiffinDate();
    if (!validDateKey(startDate) || !validDateKey(endDate)) throw { statusCode: 400, message: 'Choose valid pause dates' };
    if (startDate > endDate || startDate > today) throw { statusCode: 400, message: 'Pause must start today or earlier and end after it' };
    const subscription = await findSubscription(customerId, subscriptionId);
    if (!subscription || subscription.status !== TiffinSubscriptionStatus.ACTIVE) throw { statusCode: 409, message: 'Only an active Tiffin subscription can be paused' };
    if (startDate < dateKey(subscription.startDate)! || endDate > dateKey(subscription.endDate)!) throw { statusCode: 400, message: 'Pause dates must be within the subscription period' };

    await prisma.$transaction(async (tx) => {
      const overlap = await tx.tiffinSubscriptionPauseLog.findFirst({ where: { subscriptionId, resumedEarlyAt: null, pauseStartDate: { lte: dateOnly(endDate) }, pauseEndDate: { gte: dateOnly(startDate) } } });
      if (overlap) throw { statusCode: 409, message: 'These dates overlap an existing pause' };
      await tx.tiffinSubscriptionPauseLog.create({ data: { subscriptionId, pauseStartDate: dateOnly(startDate), pauseEndDate: dateOnly(endDate) } });
      await tx.tiffinMealLog.updateMany({ where: { subscriptionId, mealDate: { gte: dateOnly(startDate), lte: dateOnly(endDate) }, status: MealLogStatus.SCHEDULED }, data: { status: MealLogStatus.CANCELLED } });
      await tx.tiffinCustomerSubscription.update({ where: { id: subscriptionId }, data: { status: TiffinSubscriptionStatus.PAUSED, pausedAt: new Date() } });
      await tx.tiffinActivityLog.create({ data: { kitchenId: subscription.kitchenId, userId: customerId, action: 'SUBSCRIPTION_PAUSED', description: `Subscription paused from ${startDate} to ${endDate}`, metadata: { subscriptionId, startDate, endDate, eventType: 'SUBSCRIPTION_PAUSED' } } });
    }, { timeout: 15000 });
    return getSpace(customerId);
  },

  async resumeSubscription(userId: unknown, subscriptionId: string) {
    const customerId = assertStudent(userId);
    const subscription = await findSubscription(customerId, subscriptionId);
    if (!subscription || subscription.status !== TiffinSubscriptionStatus.PAUSED) throw { statusCode: 409, message: 'This Tiffin subscription is not paused' };
    const pause = subscription.pauseLogs.find((item: AnyRecord) => !item.resumedEarlyAt);
    if (!pause) throw { statusCode: 409, message: 'Pause details were not found' };
    const today = getCurrentTiffinDate();
    await prisma.$transaction(async (tx) => {
      await tx.tiffinSubscriptionPauseLog.update({ where: { id: pause.id }, data: { resumedEarlyAt: new Date() } });
      await tx.tiffinCustomerSubscription.update({ where: { id: subscriptionId }, data: { status: TiffinSubscriptionStatus.ACTIVE, resumedAt: new Date() } });
      await tx.tiffinMealLog.updateMany({ where: { subscriptionId, mealDate: dateOnly(today), status: MealLogStatus.CANCELLED }, data: { status: MealLogStatus.SCHEDULED } });
      await ensureTodayMealLogs(tx, subscription.kitchenId, today);
      await tx.tiffinActivityLog.create({ data: { kitchenId: subscription.kitchenId, userId: customerId, action: 'SUBSCRIPTION_RESUMED', description: `Subscription resumed from ${today}`, metadata: { subscriptionId, eventType: 'SUBSCRIPTION_RESUMED' } } });
    }, { timeout: 15000 });
    return getSpace(customerId);
  },
};
