// Tiffin provider operations. This module is deliberately separate from the
// existing PG provider services and resolves ownership from the authenticated
// provider phone/user headers on every request.

import prisma from '../../common/db/prisma.js';
import {
  KitchenVerificationStatus,
  KitchenStatus,
  MealCategory,
  MealLogStatus,
  TiffinDeliveryType,
  TiffinFoodType,
  TiffinPaymentStatus,
  TiffinPlanType,
  TiffinSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { getCurrentTiffinDate } from '../../common/utils/tiffin-day.js';
import { ensureTodayMealLogs, reconcilePaidTiffinReservations } from './tiffin-reservation.service.js';

const FOOD_TYPES = ['veg', 'nonveg', 'jain'] as const;
const MEAL_TYPES = ['lunch', 'dinner'] as const;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DIETS = ['veg', 'nonveg', 'jain'] as const;
const MAX_MENU_ITEM_LENGTH = 120;
const DEFAULT_TIFFIN_KYC_BUCKET = 'provider-kyc-documents';
const KYC_DOCUMENTS = {
  aadhaarFront: { directory: 'aadhaar', fileName: 'front' },
  aadhaarBack: { directory: 'aadhaar', fileName: 'back' },
  pan: { directory: 'pan', fileName: 'card' },
} as const;
const KYC_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
} as const;

type AnyRecord = Record<string, any>;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getSupabaseUrl() {
  return text(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
}

function getKycBucket() {
  return text(process.env.SUPABASE_KYC_BUCKET) || DEFAULT_TIFFIN_KYC_BUCKET;
}

function createKycPath(providerId: string, documentType: string, contentType: string) {
  const document = KYC_DOCUMENTS[documentType as keyof typeof KYC_DOCUMENTS];
  const extension = KYC_CONTENT_TYPES[contentType as keyof typeof KYC_CONTENT_TYPES];
  if (!document || !extension) throw { statusCode: 400, message: 'Upload a JPEG, PNG, or PDF document' };
  return `${providerId}/${document.directory}/${document.fileName}.${extension}`;
}

function validateKycDocumentPath(providerId: string, documentType: string, value: unknown) {
  const path = typeof value === 'string' ? value : text(jsonObject(value).path);
  const document = KYC_DOCUMENTS[documentType as keyof typeof KYC_DOCUMENTS];
  if (!document || !path) throw { statusCode: 400, message: `Upload the ${documentType} document before continuing` };
  const prefix = `${providerId}/${document.directory}/${document.fileName}.`;
  const extension = path.slice(prefix.length).toLowerCase();
  if (!path.startsWith(prefix) || !['jpg', 'jpeg', 'png', 'pdf'].includes(extension)) {
    throw { statusCode: 400, message: 'KYC documents must use the provider-owned storage path' };
  }
  return typeof value === 'string' ? { path } : { ...jsonObject(value), path };
}

async function createSupabaseSignedUpload(path: string) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = text(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    throw { statusCode: 503, message: 'Secure KYC storage is not configured on the server' };
  }

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const bucket = getKycBucket();
  const endpoint = `${supabaseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodedPath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.url) {
    throw { statusCode: 502, message: payload?.message || 'Supabase could not create a KYC upload URL' };
  }

  const signedUrl = payload.url.startsWith('http') ? payload.url : `${supabaseUrl}/storage/v1${payload.url}`;
  const token = new URL(signedUrl).searchParams.get('token');
  if (!token) throw { statusCode: 502, message: 'Supabase returned an invalid KYC upload URL' };
  return { bucket, path, token, signedUrl };
}

function numberOrNull(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonObject(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function menuItems(value: unknown) {
  if (Array.isArray(value)) {
    if (value.some((item) => typeof item !== 'string')) {
      throw { statusCode: 400, message: 'Menu items must be text values' };
    }
    return value.map((item) => text(item)).map((item) => {
      if (!item) throw { statusCode: 400, message: 'Menu items cannot be empty' };
      if (item.length > MAX_MENU_ITEM_LENGTH) throw { statusCode: 400, message: `Menu items must be ${MAX_MENU_ITEM_LENGTH} characters or fewer` };
      return item;
    });
  }

  const source = jsonObject(value);
  const result: AnyRecord = {};
  for (const diet of DIETS) {
    if (source[diet] === undefined) continue;
    result[diet] = menuItems(source[diet]);
  }
  if (!Object.keys(result).length) throw { statusCode: 400, message: 'Menu items are required' };
  return result;
}

function foodEnum(categories: unknown) {
  const values = Array.isArray(categories)
    ? categories.map((item) => text(item).toLowerCase()).filter((item) => FOOD_TYPES.includes(item as any))
    : [];
  if (values.length > 1) return TiffinFoodType.BOTH;
  if (values[0] === 'nonveg') return TiffinFoodType.NONVEG;
  if (values[0] === 'jain') return TiffinFoodType.JAIN;
  return TiffinFoodType.VEG;
}

function deliveryEnum(value: unknown) {
  switch (text(value).toLowerCase()) {
    case 'pickup':
    case 'customer_pickup':
    case 'pickup_only':
      return TiffinDeliveryType.PICKUP_ONLY;
    case 'both':
      return TiffinDeliveryType.BOTH;
    case 'delivery_partner':
      return TiffinDeliveryType.DELIVERY_PARTNER;
    default:
      return TiffinDeliveryType.SELF_DELIVERY;
  }
}

function mealEnum(value: string) {
  return value === 'dinner' ? MealCategory.DINNER : MealCategory.LUNCH;
}

function planEnum(value: string) {
  if (value === 'weekly') return TiffinPlanType.WEEKLY;
  if (value === 'monthly') return TiffinPlanType.MONTHLY;
  return TiffinPlanType.CUSTOM;
}

function compareTimes(start: unknown, end: unknown) {
  const startText = text(start);
  const endText = text(end);
  if (!/^\d{2}:\d{2}$/.test(startText) || !/^\d{2}:\d{2}$/.test(endText)) return false;
  return startText < endText;
}

function isoDate(date: Date) {
  return getCurrentTiffinDate(date);
}

function dayBounds(date = new Date()) {
  const start = new Date(`${isoDate(date)}T00:00:00.000Z`);
  const end = new Date(`${isoDate(date)}T23:59:59.999Z`);
  return { start, end };
}

function mask(value: unknown) {
  const raw = text(value);
  if (!raw) return '';
  return raw.length <= 4 ? '••••' : `${'•'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
}

function serializePlan(plan: AnyRecord) {
  const planType = String(plan.planType || '').toLowerCase();
  return {
    id: plan.id,
    type: planType === 'custom' ? 'daily' : planType,
    price: Number(plan.price || 0),
    discountPrice: plan.discountPrice === null ? null : Number(plan.discountPrice || 0),
    durationDays: plan.durationDays,
    totalMeals: plan.totalMeals,
    name: plan.planName,
  };
}

function serializeKitchen(kitchen: AnyRecord | null, verifications: AnyRecord[] = []) {
  if (!kitchen) return null;
  const foodOptions = jsonObject(kitchen.foodOptions);
  const categories = Array.isArray(foodOptions.categories) && foodOptions.categories.length
    ? foodOptions.categories
    : [String(kitchen.foodType || 'veg').toLowerCase()];

  return {
    id: kitchen.id,
    status: kitchen.status,
    verificationStatus: kitchen.verificationStatus,
    business: {
      name: kitchen.kitchenName,
      ownerName: kitchen.ownerName,
      phone: kitchen.phone,
      email: kitchen.email || '',
      description: kitchen.description || '',
      profilePhoto: kitchen.kitchenLogo || '',
      address: kitchen.address || '',
    },
    location: {
      address: kitchen.address || '',
      latitude: kitchen.latitude === null ? null : Number(kitchen.latitude),
      longitude: kitchen.longitude === null ? null : Number(kitchen.longitude),
      pincode: kitchen.pincode || '',
      city: kitchen.city || '',
      state: kitchen.state || '',
      deliveryRadiusKm: Number(kitchen.deliveryRadiusKm || 5),
    },
    pricing: (kitchen.subscriptionPlans || []).map(serializePlan),
    food: {
      categories,
      mealItems: foodOptions.mealItems || { lunch: [], dinner: [] },
      allowsJain: Boolean(kitchen.allowsJain),
    },
    timing: (kitchen.mealTimings || []).reduce((result: AnyRecord, timing: AnyRecord) => {
      result[String(timing.mealCategory).toLowerCase()] = {
        enabled: true,
        start: timing.startTime,
        end: timing.endTime,
      };
      return result;
    }, {}),
    delivery: {
      type: String(kitchen.deliveryType || '').toLowerCase(),
      pickupAvailable: kitchen.pickupAvailable,
    },
    kyc: {
      aadhaarNumber: verifications.find((item) => item.idType === 'AADHAR')?.idNumber || '',
      panNumber: verifications.find((item) => item.idType === 'PAN')?.idNumber || '',
      aadhaar: verifications.find((item) => item.idType === 'AADHAR')?.idNumber ? mask(verifications.find((item) => item.idType === 'AADHAR')?.idNumber) : '',
      pan: verifications.find((item) => item.idType === 'PAN')?.idNumber ? mask(verifications.find((item) => item.idType === 'PAN')?.idNumber) : '',
      aadhaarUploaded: Boolean(jsonObject(foodOptions.kycDocuments).aadhaarFront && jsonObject(foodOptions.kycDocuments).aadhaarBack),
      panUploaded: Boolean(jsonObject(foodOptions.kycDocuments).pan),
    },
    displayImage: {
      imageUrl: kitchen.coverImage || '',
    },
    coverImage: kitchen.coverImage || '',
    timings: kitchen.mealTimings || [],
    plans: (kitchen.subscriptionPlans || []).map(serializePlan),
  };
}

async function resolveOwner(phone: unknown, userId?: unknown) {
  const providerPhone = text(phone);
  if (!providerPhone) throw { statusCode: 400, message: 'x-provider-phone header is required' };

  const profile = await prisma.providerProfile.findUnique({ where: { phone: providerPhone } });
  if (!profile) throw { statusCode: 404, message: 'Provider profile not found' };
  if (!profile.otpVerified) throw { statusCode: 403, message: 'OTP verification required' };
  if (userId && text(userId) !== profile.userId) {
    throw { statusCode: 403, message: 'Provider identity does not match this session' };
  }

  const kitchen = await prisma.tiffinKitchen.findUnique({
    where: { ownerId: profile.id },
    include: { mealTimings: true, subscriptionPlans: true, weeklyMenus: true },
  });
  return { profile, kitchen };
}

async function ensureKitchen(profile: AnyRecord, data: AnyRecord) {
  const name = text(data.name) || text(profile.businessName) || text(profile.name) || 'Tiffin Service';
  const ownerName = text(data.ownerName) || text(profile.name) || 'Provider';
  return prisma.tiffinKitchen.upsert({
    where: { ownerId: profile.id },
    create: {
      ownerId: profile.id,
      kitchenName: name,
      ownerName,
      phone: profile.phone,
      email: text(data.email) || text(profile.email) || null,
      address: text(data.address) || null,
      foodType: TiffinFoodType.VEG,
      deliveryType: TiffinDeliveryType.SELF_DELIVERY,
    },
    update: {},
    include: { mealTimings: true, subscriptionPlans: true, weeklyMenus: true },
  });
}

async function updatePlans(kitchenId: string, plans: unknown) {
  if (!Array.isArray(plans)) return;
  for (const rawPlan of plans) {
    const plan = jsonObject(rawPlan);
    const type = text(plan.type).toLowerCase();
    const price = numberOrNull(plan.price);
    if (!price || price < 0 || !['daily', 'weekly', 'monthly'].includes(type)) continue;
    const planType = planEnum(type);
    const existing = await prisma.tiffinSubscriptionPlan.findFirst({ where: { kitchenId, planType } });
    const values = {
      planName: type === 'daily' ? 'Per Meal' : `${type[0].toUpperCase()}${type.slice(1)} Plan`,
      planType,
      durationDays: type === 'daily' ? 1 : type === 'weekly' ? 7 : 30,
      totalMeals: type === 'daily' ? 2 : type === 'weekly' ? 14 : 60,
      price,
      discountPrice: numberOrNull(plan.discountPrice),
      description: text(plan.description) || null,
      isActive: true,
    };
    if (existing) await prisma.tiffinSubscriptionPlan.update({ where: { id: existing.id }, data: values });
    else await prisma.tiffinSubscriptionPlan.create({ data: { kitchenId, ...values } });
  }
}

async function updateTimings(kitchenId: string, timing: AnyRecord) {
  for (const meal of MEAL_TYPES) {
    const value = jsonObject(timing[meal]);
    if (value.enabled === false) {
      await prisma.tiffinKitchenMealTiming.deleteMany({ where: { kitchenId, mealCategory: mealEnum(meal) } });
      continue;
    }
    if (!compareTimes(value.start, value.end)) {
      throw { statusCode: 400, message: `${meal} start time must be before end time` };
    }
    await prisma.tiffinKitchenMealTiming.upsert({
      where: { kitchenId_mealCategory: { kitchenId, mealCategory: mealEnum(meal) } },
      create: { kitchenId, mealCategory: mealEnum(meal), startTime: text(value.start), endTime: text(value.end) },
      update: { startTime: text(value.start), endTime: text(value.end) },
    });
  }
}

export const tiffinProviderService = {
  async getOnboarding(phone: unknown, userId?: unknown) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    const verifications = await prisma.providerVerification.findMany({
      where: { providerId: profile.id, idType: { in: ['AADHAR', 'PAN'] } },
      select: { idType: true, idNumber: true },
    });
    return { profile: { name: profile.name || '', email: profile.email || '', phone: profile.phone }, data: serializeKitchen(kitchen, verifications) };
  },

  async saveOnboarding(phone: unknown, userId: unknown, step: string, data: AnyRecord) {
    const { profile } = await resolveOwner(phone, userId);
    const kitchen = await ensureKitchen(profile, data);
    const currentOptions = jsonObject(kitchen.foodOptions);
    const update: AnyRecord = {};

    switch (step) {
      case 'business':
        if (!text(data.name) || !text(data.ownerName)) throw { statusCode: 400, message: 'Service name and owner name are required' };
        if (text(data.description).length > 1000) throw { statusCode: 400, message: 'Service description must be 1000 characters or fewer' };
        Object.assign(update, {
          kitchenName: text(data.name), ownerName: text(data.ownerName), email: text(data.email) || null,
          address: text(data.address) || null, description: text(data.description) || null,
          kitchenLogo: text(data.profilePhoto) || null,
        });
        break;
      case 'location':
        if (!text(data.address) || numberOrNull(data.latitude) === null || numberOrNull(data.longitude) === null) {
          throw { statusCode: 400, message: 'Address, latitude, and longitude are required' };
        }
        Object.assign(update, {
          address: text(data.address), latitude: numberOrNull(data.latitude), longitude: numberOrNull(data.longitude),
          pincode: text(data.pincode) || null, city: text(data.city) || null, state: text(data.state) || null,
          deliveryRadiusKm: numberOrNull(data.deliveryRadiusKm) ?? 5,
        });
        break;
      case 'pricing':
        Object.assign(update, { extraMealPrice: numberOrNull(data.perMeal) ?? kitchen.extraMealPrice });
        break;
      case 'food': {
        const categories = Array.isArray(data.categories) ? data.categories.map((item) => text(item).toLowerCase()).filter((item) => FOOD_TYPES.includes(item as any)) : [];
        if (!categories.length) throw { statusCode: 400, message: 'Select at least one food category' };
        update.foodType = foodEnum(categories);
        update.allowsJain = categories.includes('jain');
        update.foodOptions = { ...currentOptions, categories, mealItems: data.mealItems || currentOptions.mealItems || { lunch: [], dinner: [] } };
        break;
      }
      case 'timing':
        await updateTimings(kitchen.id, jsonObject(data));
        break;
      case 'delivery':
        update.deliveryType = deliveryEnum(data.type);
        update.pickupAvailable = text(data.type).toLowerCase() === 'both' || text(data.type).toLowerCase().includes('pickup');
        break;
      case 'displayImage':
      case 'coverImage':
        update.coverImage = text(data.imageUrl) || text(data.coverImage) || null;
        break;
      case 'kyc': {
        if (data.documents) {
          const incomingDocuments = jsonObject(data.documents);
          const documents = { ...jsonObject(currentOptions.kycDocuments) };
          for (const documentType of Object.keys(KYC_DOCUMENTS)) {
            if (incomingDocuments[documentType] !== undefined) {
              documents[documentType] = validateKycDocumentPath(profile.id, documentType, incomingDocuments[documentType]);
            }
          }
          update.foodOptions = { ...currentOptions, kycDocuments: documents };
        }
        const identityValues = [
          ['AADHAR', text(data.aadhaarNumber)],
          ['PAN', text(data.panNumber)],
        ];
        for (const [idType, idNumber] of identityValues) {
          if (!idNumber) continue;
          await prisma.providerVerification.upsert({
            where: { providerId_idType: { providerId: profile.id, idType } },
            create: { providerId: profile.id, idType, idNumber, isVerified: false },
            update: { idNumber, isVerified: false },
          });
        }
        break;
      }
      default:
        throw { statusCode: 400, message: 'Unknown Tiffin onboarding step' };
    }

    if (Object.keys(update).length) {
      await prisma.tiffinKitchen.update({ where: { id: kitchen.id }, data: update });
    }
    if (step === 'pricing') await updatePlans(kitchen.id, data.plans);

    return this.getOnboarding(phone, userId);
  },

  async submitOnboarding(phone: unknown, userId?: unknown) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 400, message: 'Complete business details before submitting' };
    const verifications = await prisma.providerVerification.findMany({ where: { providerId: profile.id, idType: { in: ['AADHAR', 'PAN'] } } });
    const hasPlans = kitchen.subscriptionPlans.some((plan: AnyRecord) => plan.isActive);
    if (!kitchen.kitchenName || !kitchen.ownerName || !kitchen.address || kitchen.latitude === null || kitchen.longitude === null || !hasPlans || kitchen.mealTimings.length < 1 || verifications.length < 2 || !kitchen.coverImage) {
      throw { statusCode: 400, message: 'Complete all required Tiffin onboarding sections before submitting' };
    }
    await prisma.tiffinKitchen.update({ where: { id: kitchen.id }, data: { verificationStatus: KitchenVerificationStatus.PENDING } });
    await prisma.tiffinActivityLog.create({ data: { kitchenId: kitchen.id, userId: profile.userId, action: 'onboarding_submitted', description: 'Tiffin service submitted for verification' } });
    return { submitted: true, verificationStatus: KitchenVerificationStatus.PENDING };
  },

  async createKycUploadUrl(phone: unknown, userId: unknown, documentType: unknown, contentType: unknown) {
    const { profile } = await resolveOwner(phone, userId);
    const path = createKycPath(profile.id, text(documentType), text(contentType));
    return createSupabaseSignedUpload(path);
  },

  async getDashboard(phone: unknown, userId?: unknown) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { kitchen: null, metrics: { activeStudents: 0, todaysMeals: 0, pendingDeliveries: 0, deliveredMeals: 0 }, kitchenSummary: { totalMeals: 0, lunch: 0, dinner: 0, skipped: 0, pausedStudents: 0 }, deliveries: [], foodSummary: [] };
    await reconcilePaidTiffinReservations(kitchen.id);
    const today = getCurrentTiffinDate();
    await ensureTodayMealLogs(prisma, kitchen.id, today);
    const { start, end } = dayBounds();
    const businessDate = new Date(`${today}T00:00:00.000Z`);
    const mealWhere = { kitchenId: kitchen.id, mealDate: { gte: start, lte: end } };
    const [activeStudents, pausedStudents, logs] = await Promise.all([
      prisma.tiffinCustomerSubscription.count({ where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.ACTIVE, deletedAt: null, endDate: { gte: businessDate } } }),
      prisma.tiffinCustomerSubscription.count({ where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.PAUSED, deletedAt: null, endDate: { gte: businessDate } } }),
      prisma.tiffinMealLog.findMany({ where: mealWhere, orderBy: [{ mealCategory: 'asc' }, { createdAt: 'asc' }], take: 100 }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: logs.map((log) => log.customerId) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    const foodSummary = await prisma.tiffinCustomerSubscription.groupBy({ by: ['dietPreference'], where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.ACTIVE, deletedAt: null, endDate: { gte: businessDate } }, _count: { _all: true } });
    const todaysMeals = logs.filter((log) => ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
    const pendingDeliveries = logs.filter((log) => log.status === MealLogStatus.SCHEDULED).length;
    const deliveredMeals = logs.filter((log) => log.status === MealLogStatus.DELIVERED).length;
    const skipped = logs.filter((log) => log.status === MealLogStatus.SKIPPED).length;
    const lunch = logs.filter((log) => log.mealCategory === MealCategory.LUNCH && ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
    const dinner = logs.filter((log) => log.mealCategory === MealCategory.DINNER && ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
    return {
      kitchen: { name: kitchen.kitchenName, verificationStatus: kitchen.verificationStatus, status: kitchen.status },
      metrics: { activeStudents, todaysMeals, pendingDeliveries, deliveredMeals },
      kitchenSummary: { totalMeals: todaysMeals, lunch, dinner, skipped, pausedStudents },
      foodSummary: foodSummary.map((item) => ({ preference: String(item.dietPreference).toLowerCase(), count: item._count._all })),
      deliveries: logs.map((log) => serializeMealLog(log, byId.get(log.customerId))),
      providerId: profile.id,
    };
  },

  async getMealChanges(phone: unknown, userId?: unknown, query: AnyRecord = {}) {
    const { kitchen } = await resolveOwner(phone, userId);
    const empty = { items: [], counts: { all: 0, skipped: 0, paused: 0, resumed: 0 } };
    if (!kitchen) return empty;
    const actions = ['MEAL_SKIPPED', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION_RESUMED'];
    const logs = await prisma.tiffinActivityLog.findMany({ where: { kitchenId: kitchen.id, action: { in: actions } }, orderBy: { createdAt: 'desc' } });
    const users = await prisma.user.findMany({ where: { id: { in: logs.map((log) => log.userId).filter((id): id is string => Boolean(id)) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    const typeFor = (action: string) => action === 'MEAL_SKIPPED' ? 'skipped' : action === 'SUBSCRIPTION_PAUSED' ? 'paused' : 'resumed';
    const allItems = logs.map((log) => {
      const metadata = log.metadata && typeof log.metadata === 'object' ? log.metadata as AnyRecord : {};
      const type = typeFor(log.action);
      return {
        id: log.id,
        eventType: type,
        action: log.action,
        student: byId.get(log.userId || '')?.studentProfile?.fullName || byId.get(log.userId || '')?.phone_number || 'Student',
        description: log.description,
        meal: metadata.mealCategory || null,
        mealDate: metadata.mealDate || null,
        startDate: metadata.startDate || null,
        endDate: metadata.endDate || null,
        subscriptionId: metadata.subscriptionId || null,
        createdAt: log.createdAt,
      };
    });
    const counts = {
      all: allItems.length,
      skipped: allItems.filter((item) => item.eventType === 'skipped').length,
      paused: allItems.filter((item) => item.eventType === 'paused').length,
      resumed: allItems.filter((item) => item.eventType === 'resumed').length,
    };
    const filter = text(query.filter).toLowerCase();
    return { items: filter && ['skipped', 'paused', 'resumed'].includes(filter) ? allItems.filter((item) => item.eventType === filter) : allItems, counts };
  },

  async listCustomers(phone: unknown, userId?: unknown, query: AnyRecord = {}) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { items: [], plans: [], summary: { total: 0, active: 0, renewalsThisWeek: 0, pendingPayments: 0 } };
    await reconcilePaidTiffinReservations(kitchen.id);
    const search = text(query.search).toLowerCase();
    const subscriptions = await prisma.tiffinCustomerSubscription.findMany({ where: { kitchenId: kitchen.id, deletedAt: null }, include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
    const users = await prisma.user.findMany({ where: { id: { in: subscriptions.map((item) => item.customerId) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    const customerSubscriptions = subscriptions.filter((subscription) => subscription.status === TiffinSubscriptionStatus.ACTIVE || subscription.status === TiffinSubscriptionStatus.PAUSED);
    const items = customerSubscriptions.map((subscription) => serializeCustomerSubscription(subscription, byId.get(subscription.customerId))).filter((item) => {
      const haystack = `${item.name} ${item.college}`.toLowerCase();
      return (!search || haystack.includes(search)) && (!query.status || item.status === String(query.status).toLowerCase()) && (!query.food || item.foodPreference === String(query.food).toLowerCase());
    });
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      items,
      plans: kitchen.subscriptionPlans.filter((plan: AnyRecord) => plan.isActive).map(serializePlan),
      summary: {
        total: customerSubscriptions.length,
        active: customerSubscriptions.filter((item) => item.status === TiffinSubscriptionStatus.ACTIVE && item.endDate >= new Date()).length,
        renewalsThisWeek: subscriptions.filter((item) => item.endDate <= weekEnd && item.endDate >= new Date()).length,
        pendingPayments: subscriptions.filter((item) => String(item.payments?.[0]?.status || item.paymentStatus) === TiffinPaymentStatus.PENDING).length,
      },
    };
  },

  async addCustomer(phone: unknown, userId: unknown, data: AnyRecord) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    const customerPhone = text(data.phone);
    if (!customerPhone) throw { statusCode: 400, message: 'Customer phone is required' };
    const customer = await prisma.user.findUnique({ where: { phone_number: customerPhone } });
    if (!customer) throw { statusCode: 404, message: 'No StayVeo student account was found for that phone number' };
    const plan = await prisma.tiffinSubscriptionPlan.findFirst({ where: { id: text(data.planId) || undefined, kitchenId: kitchen.id, isActive: true } });
    if (!plan) throw { statusCode: 400, message: 'Choose an active Tiffin plan' };
    const existing = await prisma.tiffinCustomerSubscription.findFirst({ where: { kitchenId: kitchen.id, customerId: customer.id, status: { in: [TiffinSubscriptionStatus.ACTIVE, TiffinSubscriptionStatus.PENDING] } } });
    if (existing) throw { statusCode: 409, message: 'This student already has an active subscription' };
    const startDate = data.startDate ? new Date(String(data.startDate)) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays - 1);
    const diet = text(data.foodPreference).toLowerCase();
    const subscription = await prisma.tiffinCustomerSubscription.create({
      data: {
        subscriptionCode: `TIF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        kitchenId: kitchen.id,
        customerId: customer.id,
        planId: plan.id,
        dietPreference: foodEnum([diet]),
        deliveryAddress: text(data.deliveryAddress) || null,
        startDate,
        endDate,
        totalMealsAllocated: plan.totalMeals,
        mealsRemaining: plan.totalMeals,
        totalEntitledDays: plan.durationDays,
        remainingDays: plan.durationDays,
        status: TiffinSubscriptionStatus.ACTIVE,
        paymentStatus: TiffinPaymentStatus.PENDING,
      },
    });
    return { id: subscription.id, customerId: customer.id };
  },

  async getCustomer(phone: unknown, userId: unknown, customerId: string) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    const subscriptions = await prisma.tiffinCustomerSubscription.findMany({ where: { kitchenId: kitchen.id, customerId, deletedAt: null }, include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 10 }, mealLogs: { orderBy: { mealDate: 'desc' }, take: 10 } } });
    if (!subscriptions.length) throw { statusCode: 404, message: 'Tiffin customer not found' };
    const user = await prisma.user.findUnique({ where: { id: customerId }, include: { studentProfile: true } });
    return { customer: serializeCustomerSubscription(subscriptions[0], user), subscriptions, payments: subscriptions[0].payments, recentDeliveries: subscriptions.flatMap((item) => item.mealLogs).map((log) => ({ id: log.id, meal: String(log.mealCategory).toLowerCase(), date: log.mealDate, status: String(log.status).toLowerCase() })) };
  },

  async listDeliveries(phone: unknown, userId: unknown, query: AnyRecord = {}) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { kitchen: null, items: [], summary: { total: 0, pending: 0, delivered: 0, dinnerRemaining: 0 } };
    const requestedDate = query.date ? isoDate(new Date(String(query.date))) : getCurrentTiffinDate();
    await ensureTodayMealLogs(prisma, kitchen.id, requestedDate);
    const { start, end } = dayBounds(new Date(`${requestedDate}T00:00:00.000Z`));
    const where: AnyRecord = { kitchenId: kitchen.id, mealDate: { gte: start, lte: end } };
    if (query.meal === 'lunch' || query.meal === 'dinner') where.mealCategory = mealEnum(query.meal);
    if (query.status === 'pending') where.status = MealLogStatus.SCHEDULED;
    if (query.status === 'delivered') where.status = MealLogStatus.DELIVERED;
    const [logs, dinnerRemaining] = await Promise.all([
      prisma.tiffinMealLog.findMany({ where, orderBy: [{ mealCategory: 'asc' }, { createdAt: 'asc' }] }),
      prisma.tiffinMealLog.count({ where: { kitchenId: kitchen.id, mealDate: { gte: start, lte: end }, mealCategory: MealCategory.DINNER, status: MealLogStatus.SCHEDULED } }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: logs.map((log) => log.customerId) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    return {
      kitchen: { status: kitchen.status, verificationStatus: kitchen.verificationStatus },
      items: logs.map((log) => serializeMealLog(log, byId.get(log.customerId))),
      summary: { total: logs.length, pending: logs.filter((log) => log.status === MealLogStatus.SCHEDULED).length, delivered: logs.filter((log) => log.status === MealLogStatus.DELIVERED).length, dinnerRemaining },
    };
  },

  async updateDelivery(phone: unknown, userId: unknown, id: string, delivered: boolean) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    const log = await prisma.tiffinMealLog.findFirst({ where: { id, kitchenId: kitchen.id } });
    if (!log) throw { statusCode: 404, message: 'Delivery not found' };
    if (delivered && ([MealLogStatus.SKIPPED, MealLogStatus.CANCELLED] as MealLogStatus[]).includes(log.status)) throw { statusCode: 409, message: 'Skipped or cancelled meals cannot be delivered' };
    return prisma.tiffinMealLog.update({ where: { id }, data: delivered ? { status: MealLogStatus.DELIVERED, deliveredAt: new Date(), deliveredByProviderId: profile.id } : { status: MealLogStatus.SCHEDULED, deliveredAt: null, deliveredByProviderId: null } });
  },

  async markAllDeliveries(phone: unknown, userId: unknown, ids: string[]) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen || !ids.length) return { count: 0 };
    const result = await prisma.tiffinMealLog.updateMany({ where: { id: { in: ids }, kitchenId: kitchen.id, status: MealLogStatus.SCHEDULED }, data: { status: MealLogStatus.DELIVERED, deliveredAt: new Date(), deliveredByProviderId: profile.id } });
    return { count: result.count };
  },

  async getMenu(phone: unknown, userId?: unknown) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { items: [] };
    return { items: kitchen.weeklyMenus.map((item: AnyRecord) => ({ id: item.id, day: item.dayOfWeek, meal: String(item.mealCategory).toLowerCase(), items: item.items || [] })) };
  },

  async saveMenu(phone: unknown, userId: unknown, menus: unknown) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    if (!Array.isArray(menus)) throw { statusCode: 400, message: 'Menu items are required' };

    const prepared = menus.map((raw) => {
      const item = jsonObject(raw);
      const day = text(item.day).toLowerCase();
      const meal = text(item.meal).toLowerCase();
      if (!DAYS.includes(day) || !MEAL_TYPES.includes(meal as any)) {
        throw { statusCode: 400, message: 'Each menu entry must include a valid day and meal' };
      }
      return { day, meal, items: menuItems(item.items) };
    });

    const keys = new Set(prepared.map((item) => `${item.day}:${item.meal}`));
    if (keys.size !== prepared.length) throw { statusCode: 400, message: 'Each day and meal can only appear once' };

    // Pre-fetch all existing weekly menus for this kitchen in a single query
    // outside the transaction to avoid holding the transaction open during reads.
    const existingMenus = await prisma.tiffinKitchenWeeklyMenu.findMany({
      where: { kitchenId: kitchen.id },
    });
    const existingByKey = new Map(
      existingMenus.map((m) => [`${m.dayOfWeek}:${m.mealCategory}`, m])
    );

    await prisma.$transaction(async (tx) => {
      for (const item of prepared) {
        const mealCategory = mealEnum(item.meal);
        const existing = existingByKey.get(`${item.day}:${mealCategory}`);
        const nextItems = item.items as Prisma.InputJsonValue;
        const changed = !existing || JSON.stringify(existing.items) !== JSON.stringify(item.items);
        if (existing && changed) {
          await tx.tiffinKitchenMenuHistory.create({
            data: { weeklyMenuId: existing.id, previousItems: existing.items as Prisma.InputJsonValue, updatedBy: profile.id },
          });
        }
        if (existing) {
          if (changed) await tx.tiffinKitchenWeeklyMenu.update({ where: { id: existing.id }, data: { items: nextItems } });
        } else {
          await tx.tiffinKitchenWeeklyMenu.create({ data: { kitchenId: kitchen.id, dayOfWeek: item.day, mealCategory, items: nextItems } });
        }
      }
    });
    return this.getMenu(phone, userId);
  },

  async getReports(phone: unknown, userId?: unknown) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { summary: { totalCustomers: 0, revenue: 0, paidCustomers: 0, pendingPayments: 0 }, payments: [], foodPreferences: [], delivery: { delivered: 0, pending: 0, percentage: 0 }, renewals: [] };
    await reconcilePaidTiffinReservations(kitchen.id);
    const [subscriptions, payments, mealLogs] = await Promise.all([
      prisma.tiffinCustomerSubscription.findMany({ where: { kitchenId: kitchen.id, deletedAt: null }, include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
      prisma.tiffinPayment.findMany({ where: { kitchenId: kitchen.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.tiffinMealLog.findMany({ where: { kitchenId: kitchen.id }, select: { status: true } }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: subscriptions.map((item) => item.customerId) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    const customerSubscriptions = subscriptions.filter((item) => item.status === TiffinSubscriptionStatus.ACTIVE || item.status === TiffinSubscriptionStatus.PAUSED);
    const delivered = mealLogs.filter((item) => item.status === MealLogStatus.DELIVERED).length;
    const paidCustomers = new Set(customerSubscriptions.filter((item) => String(item.payments?.[0]?.status || item.paymentStatus) === TiffinPaymentStatus.PAID).map((item) => item.customerId)).size;
    return {
      summary: { totalCustomers: customerSubscriptions.length, revenue: payments.filter((item) => item.status === TiffinPaymentStatus.PAID).reduce((sum, item) => sum + Number(item.totalAmount), 0), paidCustomers, pendingPayments: subscriptions.filter((item) => String(item.payments?.[0]?.status || item.paymentStatus) === TiffinPaymentStatus.PENDING).length },
      payments: payments.map((payment) => ({ id: payment.id, customer: byId.get(payment.customerId)?.studentProfile?.fullName || byId.get(payment.customerId)?.phone_number || 'Customer', amount: Number(payment.totalAmount), dueDate: payment.createdAt, status: String(payment.status).toLowerCase() })),
      foodPreferences: ['veg', 'nonveg', 'jain'].map((preference) => ({ preference, count: customerSubscriptions.filter((item) => String(item.dietPreference).toLowerCase() === preference).length })),
      delivery: { delivered, pending: mealLogs.length - delivered, percentage: mealLogs.length ? Math.round((delivered / mealLogs.length) * 100) : 0 },
      renewals: customerSubscriptions.filter((item) => item.endDate >= new Date()).sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).slice(0, 8).map((item) => ({ customer: byId.get(item.customerId)?.studentProfile?.fullName || 'Customer', plan: item.plan.planName, expiryDate: item.endDate })),
    };
  },

  async getSettings(phone: unknown, userId?: unknown) {
    return this.getOnboarding(phone, userId);
  },

  async getBusinessDetails(phone: unknown, userId?: unknown) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    return {
      name: kitchen.ownerName || profile.name || '',
      businessName: kitchen.kitchenName || '',
      email: kitchen.email || profile.email || '',
      address: kitchen.address || '',
      contactNumber: kitchen.phone || profile.phone,
      description: kitchen.description || '',
    };
  },

  async updateBusinessDetails(phone: unknown, userId: unknown, data: AnyRecord) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };

    const ownerName = text(data.name);
    const businessName = text(data.businessName);
    const email = text(data.email);
    const address = text(data.address);
    const contactNumber = text(data.contactNumber);
    const description = text(data.description);
    const compactContactNumber = contactNumber.replace(/[\s-]/g, '');

    if (!ownerName || !businessName) throw { statusCode: 400, message: 'Your name and business name are required' };
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw { statusCode: 400, message: 'Enter a valid email address' };
    if (contactNumber && (!/^[+\d][\d\s-]{9,19}$/.test(contactNumber) || compactContactNumber.length > 15)) throw { statusCode: 400, message: 'Enter a valid contact number' };
    if (address.length > 500 || description.length > 1000) throw { statusCode: 400, message: 'Business details exceed the allowed length' };

    await prisma.tiffinKitchen.update({
      where: { id: kitchen.id },
      data: {
        ownerName,
        kitchenName: businessName,
        email: email || null,
        address: address || null,
        phone: compactContactNumber || kitchen.phone,
        description: description || null,
      },
    });
    return this.getBusinessDetails(phone, userId);
  },

  async updateSettings(phone: unknown, userId: unknown, data: AnyRecord) {
    const { kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) throw { statusCode: 404, message: 'Tiffin kitchen not found' };
    const name = text(data.name);
    const description = data.description === null ? null : text(data.description);
    const radius = numberOrNull(data.deliveryRadiusKm);
    const status = text(data.status).toLowerCase();
    if (!name) throw { statusCode: 400, message: 'Service name is required' };
    if (radius === null || radius < 0 || radius > 50) throw { statusCode: 400, message: 'Delivery radius must be between 0 and 50 km' };
    const kitchenStatus = status === 'closed'
      ? KitchenStatus.CLOSED
      : status === 'temporarily_closed'
        ? KitchenStatus.TEMPORARILY_CLOSED
        : KitchenStatus.OPEN;
    await prisma.tiffinKitchen.update({ where: { id: kitchen.id }, data: {
      kitchenName: name,
      description,
      deliveryRadiusKm: radius,
      status: kitchenStatus,
    } });
    return this.getOnboarding(phone, userId);
  },
};

function serializeMealLog(log: AnyRecord, user: AnyRecord | null | undefined) {
  return {
    id: log.id,
    student: user?.studentProfile?.fullName || user?.phone_number || 'Customer',
    phone: user?.phone_number || '',
    room: user?.studentProfile?.currentAddress || '—',
    college: user?.studentProfile?.college || '—',
    preference: String(log.mealCategory || '').toLowerCase(),
    meal: String(log.mealCategory || '').toLowerCase(),
    status: String(log.status || '').toLowerCase(),
    mealDate: log.mealDate,
    deliveredAt: log.deliveredAt,
  };
}

function serializeCustomerSubscription(subscription: AnyRecord, user: AnyRecord | null | undefined) {
  return {
    id: subscription.customerId,
    subscriptionId: subscription.id,
    name: user?.studentProfile?.fullName || user?.phone_number || 'Customer',
    phone: user?.phone_number || '',
    college: user?.studentProfile?.college || '—',
    address: subscription.deliveryAddress || user?.studentProfile?.currentAddress || '—',
    foodPreference: String(subscription.dietPreference || '').toLowerCase(),
    subscription: subscription.plan?.planName || 'Tiffin plan',
    renewalDate: subscription.endDate,
    status: String(subscription.status || '').toLowerCase(),
    paymentStatus: String(subscription.payments?.[0]?.status || subscription.paymentStatus || '').toLowerCase(),
  };
}
