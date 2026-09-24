// Tiffin provider operations. This module is deliberately separate from the
// existing PG provider services. Onboarding resolves ownership from the
// authenticated email-login user identity; legacy dashboard methods retain
// their existing compatibility arguments until they are migrated separately.

import prisma from '../../common/db/prisma.js';
import type Redis from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import {
  readProviderDashboardCache,
  tiffinProviderDashboardKey,
  writeProviderDashboardCache,
} from '../../common/cache/provider-dashboard.js';
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
  ServiceType,
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

function providerPhone(profile: AnyRecord) {
  const profileValue = text(profile.phone);
  const userValue = text(profile.user?.phone_number);
  return /^tmp[a-f0-9]{12}$/.test(profileValue) ? userValue : profileValue || userValue;
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

function requiredNumber(value: unknown, message: string, min: number, max: number) {
  const parsed = numberOrNull(value);
  if (parsed === null || parsed < min || parsed > max) throw { statusCode: 400, message };
  return parsed;
}

function optionalPhone(value: unknown) {
  const phone = text(value);
  if (phone && !/^\d{10,15}$/.test(phone)) {
    throw { statusCode: 400, message: 'Phone number must contain 10 to 15 digits' };
  }
  return phone;
}

function optionalEmail(value: unknown) {
  const email = text(value).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { statusCode: 400, message: 'Invalid email address' };
  }
  return email;
}

function optionalPincode(value: unknown) {
  const pincode = text(value);
  if (pincode && !/^\d{6}$/.test(pincode)) {
    throw { statusCode: 400, message: 'Invalid pincode' };
  }
  return pincode;
}

function ownedServiceImage(value: unknown, providerId: string, fieldName: string) {
  const imageUrl = text(value);
  if (!imageUrl) return null;

  let path = '';
  try {
    const parsed = new URL(imageUrl);
    const marker = '/storage/v1/object/public/pg-images/';
    if (parsed.pathname.includes(marker)) path = parsed.pathname.split(marker)[1] || '';
  } catch {
    // The existing storage helper returns absolute public URLs.
  }

  const safeProviderId = providerId.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!path.startsWith(`provider-${safeProviderId}/tiffin/`)) {
    throw { statusCode: 400, message: `${fieldName} must be uploaded through the Tiffin provider storage path` };
  }

  return imageUrl;
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

async function resolveOwner(phone: unknown, userId?: unknown, options: { requireOtpVerified?: boolean } = {}) {
  const providerPhone = text(phone);
  const uid = text(userId);

  let profile: AnyRecord | null = null;
  if (uid) {
    profile = await prisma.providerProfile.findUnique({
      where: { userId: uid },
      include: { user: { select: { id: true, email: true, phone_number: true, role: true } } },
    });
  }
  if (!profile && providerPhone) {
    profile = await prisma.providerProfile.findFirst({
      where: {
        OR: [
          { phone: providerPhone },
          { email: providerPhone },
          { user: { email: providerPhone } },
        ],
      },
    });
  }

  if (!profile) throw { statusCode: 404, message: 'Provider profile not found' };
  // This flag is now set by the email OTP provider-auth flow. Keep the
  // existing guard for legacy provider operations without reintroducing a
  // phone-OTP dependency on the session-authenticated onboarding routes.
  if (options.requireOtpVerified !== false && !profile.otpVerified) {
    throw { statusCode: 403, message: 'OTP verification required' };
  }
  const kitchen = await prisma.tiffinKitchen.findUnique({
    where: { ownerId: profile.id },
    include: { mealTimings: true, subscriptionPlans: true, weeklyMenus: true },
  });
  return { profile, kitchen };
}

type PrismaExecutor = typeof prisma | Prisma.TransactionClient;

async function ensureKitchen(db: PrismaExecutor, profile: AnyRecord, data: AnyRecord) {
  const name = text(data.name) || text(profile.businessName) || text(profile.name) || 'Tiffin Service';
  const ownerName = text(data.ownerName) || text(profile.name) || 'Provider';
  const profileEmail = text(profile.email) || text(profile.user?.email);
  const profilePhone = providerPhone(profile);
  return db.tiffinKitchen.upsert({
    where: { ownerId: profile.id },
    create: {
      ownerId: profile.id,
      kitchenName: name,
      ownerName,
      phone: profilePhone,
      email: text(data.email) || profileEmail || null,
      address: text(data.address) || null,
      foodType: TiffinFoodType.VEG,
      deliveryType: TiffinDeliveryType.SELF_DELIVERY,
    },
    update: {},
    include: { mealTimings: true, subscriptionPlans: true, weeklyMenus: true },
  });
}

async function updatePlans(db: PrismaExecutor, kitchenId: string, plans: unknown) {
  if (!Array.isArray(plans)) return;
  for (const rawPlan of plans) {
    const plan = jsonObject(rawPlan);
    const type = text(plan.type).toLowerCase();
    const price = numberOrNull(plan.price);
    if (!price || price < 0 || !['daily', 'weekly', 'monthly'].includes(type)) continue;
    const planType = planEnum(type);
    const existing = await db.tiffinSubscriptionPlan.findFirst({ where: { kitchenId, planType } });
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
    if (existing) await db.tiffinSubscriptionPlan.update({ where: { id: existing.id }, data: values });
    else await db.tiffinSubscriptionPlan.create({ data: { kitchenId, ...values } });
  }
}

async function updateTimings(db: PrismaExecutor, kitchenId: string, timing: AnyRecord) {
  for (const meal of MEAL_TYPES) {
    const value = jsonObject(timing[meal]);
    if (value.enabled === false) {
      await db.tiffinKitchenMealTiming.deleteMany({ where: { kitchenId, mealCategory: mealEnum(meal) } });
      continue;
    }
    if (!compareTimes(value.start, value.end)) {
      throw { statusCode: 400, message: `${meal} start time must be before end time` };
    }
    await db.tiffinKitchenMealTiming.upsert({
      where: { kitchenId_mealCategory: { kitchenId, mealCategory: mealEnum(meal) } },
      create: { kitchenId, mealCategory: mealEnum(meal), startTime: text(value.start), endTime: text(value.end) },
      update: { startTime: text(value.start), endTime: text(value.end) },
    });
  }
}

function isOnboardingComplete(kitchen: AnyRecord | null, verifications: AnyRecord[]) {
  if (!kitchen) return false;
  const hasPlans = kitchen.subscriptionPlans?.some((plan: AnyRecord) => plan.isActive) === true;
  const hasAadhaar = verifications.some((item) => item.idType === 'AADHAR');
  const hasPan = verifications.some((item) => item.idType === 'PAN');
  return Boolean(
    kitchen.kitchenName &&
    kitchen.ownerName &&
    kitchen.address &&
    kitchen.latitude !== null &&
    kitchen.longitude !== null &&
    hasPlans &&
    kitchen.mealTimings?.length &&
    kitchen.coverImage &&
    hasAadhaar &&
    hasPan
  );
}

/** Resolve the existing Tiffin completion state for provider login routing. */
export async function getTiffinOnboardingStatus(providerId: string) {
  const [kitchen, verifications] = await Promise.all([
    prisma.tiffinKitchen.findUnique({
      where: { ownerId: providerId },
      include: { mealTimings: true, subscriptionPlans: true },
    }),
    prisma.providerVerification.findMany({
      where: { providerId, idType: { in: ['AADHAR', 'PAN'] } },
      select: { idType: true, idNumber: true },
    }),
  ]);
  return { exists: Boolean(kitchen), completed: isOnboardingComplete(kitchen, verifications) };
}

export const tiffinProviderService = {
  async getOnboarding(phone: unknown, userId?: unknown, requireOtpVerified = true) {
    const { profile, kitchen } = await resolveOwner(phone, userId, { requireOtpVerified });
    const verifications = await prisma.providerVerification.findMany({
      where: { providerId: profile.id, idType: { in: ['AADHAR', 'PAN'] } },
      select: { idType: true, idNumber: true },
    });
    const email = text(profile.email) || text(profile.user?.email);
    const phoneNumber = providerPhone(profile);
    return {
      identity: {
        providerId: profile.id,
        userId: profile.userId,
        name: profile.name || '',
        email,
        phone: phoneNumber,
      },
      profile: { name: profile.name || '', email, phone: phoneNumber },
      exists: Boolean(kitchen),
      completed: isOnboardingComplete(kitchen, verifications),
      data: serializeKitchen(kitchen, verifications),
    };
  },

  async saveOnboarding(phone: unknown, userId: unknown, step: string, data: AnyRecord) {
    const { profile } = await resolveOwner(phone, userId, { requireOtpVerified: false });
    await prisma.$transaction(async (tx) => {
      const kitchen = await ensureKitchen(tx, profile, data);
      const currentOptions = jsonObject(kitchen.foodOptions);
      const update: AnyRecord = {};

      switch (step) {
        case 'business': {
          if (!text(data.name) || !text(data.ownerName)) throw { statusCode: 400, message: 'Service name and owner name are required' };
          if (text(data.description).length > 1000) throw { statusCode: 400, message: 'Service description must be 1000 characters or fewer' };
          const phoneNumber = optionalPhone(data.phone) || providerPhone(profile);
          const email = optionalEmail(data.email) || text(profile.email) || text(profile.user?.email);
          const profilePhoto = ownedServiceImage(data.profilePhoto, profile.id, 'Profile photo');
          Object.assign(update, {
            kitchenName: text(data.name), ownerName: text(data.ownerName), phone: phoneNumber,
            email: email || null, address: text(data.address) || null, description: text(data.description) || null,
            kitchenLogo: profilePhoto,
          });
          await tx.providerService.upsert({
            where: { providerId_type: { providerId: profile.id, type: ServiceType.TIFFIN } },
            create: { providerId: profile.id, type: ServiceType.TIFFIN },
            update: {},
          });
          await tx.providerProfile.update({
            where: { id: profile.id },
            data: {
              name: text(data.ownerName) || profile.name || null,
              email: email || null,
              ...(phoneNumber && /^\d{10,15}$/.test(phoneNumber) ? { phone: phoneNumber } : {}),
            },
          });
          if (phoneNumber && /^\d{10,15}$/.test(phoneNumber)) {
            await tx.user.update({ where: { id: profile.userId }, data: { phone_number: phoneNumber } });
          }
          break;
        }
        case 'location': {
          if (!text(data.address)) throw { statusCode: 400, message: 'Address is required' };
          const latitude = requiredNumber(data.latitude, 'Latitude must be between -90 and 90', -90, 90);
          const longitude = requiredNumber(data.longitude, 'Longitude must be between -180 and 180', -180, 180);
          const deliveryRadiusKm = requiredNumber(data.deliveryRadiusKm ?? 5, 'Delivery radius must be between 0 and 100 km', 0, 100);
          Object.assign(update, {
            address: text(data.address), latitude, longitude,
            pincode: optionalPincode(data.pincode) || null, city: text(data.city) || null, state: text(data.state) || null,
            deliveryRadiusKm,
          });
          break;
        }
        case 'pricing': {
          const dailyPlan = Array.isArray(data.plans)
            ? data.plans.find((item: AnyRecord) => ['daily', 'custom'].includes(text(item?.type).toLowerCase()))
            : null;
          const dailyPlanPrice = numberOrNull(dailyPlan?.price);
          const perMeal = data.perMeal === '' || data.perMeal === undefined || data.perMeal === null
            ? dailyPlanPrice ?? Number(kitchen.extraMealPrice)
            : requiredNumber(data.perMeal, 'Per meal price must be between 0 and 100000', 0, 100000);
          if (!Number.isFinite(perMeal) || perMeal <= 0) throw { statusCode: 400, message: 'Set a valid daily per-meal price' };
          Object.assign(update, { extraMealPrice: perMeal });
          break;
        }
        case 'food': {
          const rawCategories = Array.isArray(data.categories) ? data.categories.map((item) => text(item).toLowerCase()) : [];
          const categories = rawCategories.filter((item) => FOOD_TYPES.includes(item as any));
          if (!categories.length || categories.length !== rawCategories.length) throw { statusCode: 400, message: 'Select valid food categories' };
          update.foodType = foodEnum(categories);
          update.allowsJain = categories.includes('jain');
          update.foodOptions = { ...currentOptions, categories, mealItems: data.mealItems || currentOptions.mealItems || { lunch: [], dinner: [] } };
          break;
        }
        case 'timing':
          await updateTimings(tx, kitchen.id, jsonObject(data));
          break;
        case 'delivery':
          if (!['self_delivery', 'pickup_only', 'both', 'delivery_partner'].includes(text(data.type).toLowerCase())) {
            throw { statusCode: 400, message: 'Choose a valid delivery option' };
          }
          update.deliveryType = deliveryEnum(data.type);
          update.pickupAvailable = text(data.type).toLowerCase() === 'both' || text(data.type).toLowerCase().includes('pickup');
          break;
        case 'displayImage':
        case 'coverImage': {
          const imageUrl = ownedServiceImage(data.imageUrl || data.coverImage, profile.id, 'Display image');
          if (!imageUrl) throw { statusCode: 400, message: 'Upload a display image before continuing' };
          update.coverImage = imageUrl;
          break;
        }
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
          const aadhaarNumber = text(data.aadhaarNumber);
          const panNumber = text(data.panNumber).toUpperCase();
          if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) throw { statusCode: 400, message: 'Aadhaar number must contain 12 digits' };
          if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber)) throw { statusCode: 400, message: 'Invalid PAN number' };
          const identityValues = [['AADHAR', aadhaarNumber], ['PAN', panNumber]];
          for (const [idType, idNumber] of identityValues) {
            if (!idNumber) continue;
            await tx.providerVerification.upsert({
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
        await tx.tiffinKitchen.update({ where: { id: kitchen.id }, data: update });
      }
      if (step === 'pricing') await updatePlans(tx, kitchen.id, data.plans);
    });

    return this.getOnboarding(phone, userId, false);
  },

  async submitOnboarding(phone: unknown, userId?: unknown, requireOtpVerified = true) {
    const { profile, kitchen } = await resolveOwner(phone, userId, { requireOtpVerified });
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

  async createKycUploadUrl(phone: unknown, userId: unknown, documentType: unknown, contentType: unknown, requireOtpVerified = true) {
    const { profile } = await resolveOwner(phone, userId, { requireOtpVerified });
    const path = createKycPath(profile.id, text(documentType), text(contentType));
    return createSupabaseSignedUpload(path);
  },

  async getDashboard(phone: unknown, userId?: unknown, redis?: Redis, logger?: FastifyBaseLogger) {
    const { profile, kitchen } = await resolveOwner(phone, userId);
    if (!kitchen) return { kitchen: null, metrics: { activeStudents: 0, todaysMeals: 0, pendingDeliveries: 0, deliveredMeals: 0 }, kitchenSummary: { totalMeals: 0, lunch: 0, dinner: 0, skipped: 0, pausedStudents: 0 }, deliveries: [], foodSummary: [] };
    await reconcilePaidTiffinReservations(kitchen.id);
    const today = getCurrentTiffinDate();
    await ensureTodayMealLogs(prisma, kitchen.id, today);
    const { start, end } = dayBounds();
    const businessDate = new Date(`${today}T00:00:00.000Z`);
    const mealWhere = { kitchenId: kitchen.id, mealDate: { gte: start, lte: end } };
    const cacheKey = tiffinProviderDashboardKey(profile.id);
    const cached = redis && logger
      ? await readProviderDashboardCache<{
          kitchen: { name: string | null; verificationStatus: string; status: string };
          metrics: { activeStudents: number; todaysMeals: number; pendingDeliveries: number; deliveredMeals: number };
          kitchenSummary: { totalMeals: number; lunch: number; dinner: number; skipped: number; pausedStudents: number };
          foodSummary: Array<{ preference: string; count: number }>;
          providerId: string;
        }>(redis, cacheKey, logger)
      : null;
    const logs = await prisma.tiffinMealLog.findMany({ where: mealWhere, orderBy: [{ mealCategory: 'asc' }, { createdAt: 'asc' }], take: 100 });
    const users = await prisma.user.findMany({ where: { id: { in: logs.map((log) => log.customerId) } }, include: { studentProfile: true } });
    const byId = new Map(users.map((user) => [user.id, user]));
    let summary = cached && cached.metrics && cached.kitchenSummary && Array.isArray(cached.foodSummary)
      ? cached
      : null;
    if (!summary) {
      const [activeStudents, pausedStudents, foodSummary] = await Promise.all([
        prisma.tiffinCustomerSubscription.count({ where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.ACTIVE, deletedAt: null, endDate: { gte: businessDate } } }),
        prisma.tiffinCustomerSubscription.count({ where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.PAUSED, deletedAt: null, endDate: { gte: businessDate } } }),
        prisma.tiffinCustomerSubscription.groupBy({ by: ['dietPreference'], where: { kitchenId: kitchen.id, status: TiffinSubscriptionStatus.ACTIVE, deletedAt: null, endDate: { gte: businessDate } }, _count: { _all: true } }),
      ]);
      const todaysMeals = logs.filter((log) => ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
      const pendingDeliveries = logs.filter((log) => log.status === MealLogStatus.SCHEDULED).length;
      const deliveredMeals = logs.filter((log) => log.status === MealLogStatus.DELIVERED).length;
      const skipped = logs.filter((log) => log.status === MealLogStatus.SKIPPED).length;
      const lunch = logs.filter((log) => log.mealCategory === MealCategory.LUNCH && ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
      const dinner = logs.filter((log) => log.mealCategory === MealCategory.DINNER && ([MealLogStatus.SCHEDULED, MealLogStatus.DELIVERED] as MealLogStatus[]).includes(log.status)).length;
      summary = {
        kitchen: { name: kitchen.kitchenName, verificationStatus: kitchen.verificationStatus, status: kitchen.status },
        metrics: { activeStudents, todaysMeals, pendingDeliveries, deliveredMeals },
        kitchenSummary: { totalMeals: todaysMeals, lunch, dinner, skipped, pausedStudents },
        foodSummary: foodSummary.map((item) => ({ preference: String(item.dietPreference).toLowerCase(), count: item._count._all })),
        providerId: profile.id,
      };
      if (redis && logger) await writeProviderDashboardCache(redis, cacheKey, summary, logger);
    }
    return {
      kitchen: summary.kitchen,
      metrics: summary.metrics,
      kitchenSummary: summary.kitchenSummary,
      foodSummary: summary.foodSummary,
      deliveries: logs.map((log) => serializeMealLog(log, byId.get(log.customerId))),
      providerId: summary.providerId,
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
