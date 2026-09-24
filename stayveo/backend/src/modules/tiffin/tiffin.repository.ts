// ─── Tiffin Repository ──────────────────────────────────────────────────
// Public discovery supports both the legacy tiffin_services listing and the
// current TiffinKitchen module. A linked kitchen is always the live source
// for its business/location/menu context.

import prisma from '../../common/db/prisma.js';
import { MealCategory, Prisma } from '@prisma/client';
import type { CreateTiffinInput, TiffinFilterInput } from './tiffin.schema.js';

export const tiffinRepository = {
  /** Create a new legacy Tiffin service listing. */
  async create(providerId: string, data: CreateTiffinInput) {
    return prisma.tiffinService.create({
      data: {
        provider_id: providerId,
        kitchen_name: data.kitchen_name,
        foodType: data.food_type,
        meal_options: data.meal_options ?? [],
        monthly_price: data.monthly_price,
        delivery_range_km: data.delivery_range_km,
        delivery_timing: data.delivery_timing,
      },
    });
  },

  /** Filtered public discovery with live kitchen data where available. */
  async findFiltered(filters: TiffinFilterInput) {
    const { food_type, maxPrice, latitude, longitude, radius, page, limit } = filters;
    const conditions: Prisma.Sql[] = [];

    if (food_type) {
      conditions.push(Prisma.sql`(LOWER(l."food_type") = LOWER(${food_type}) OR LOWER(l."kitchen_food_type") = LOWER(${food_type}))`);
    }
    if (maxPrice !== undefined) {
      conditions.push(Prisma.sql`l."monthly_price" <= ${maxPrice}`);
    }
    if (latitude !== undefined && longitude !== undefined) {
      const r = radius ?? 10;
      conditions.push(Prisma.sql`
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(l."latitude")) *
            cos(radians(l."longitude") - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(l."latitude"))
          ))
        )) <= ${r}
      `);
    }

    const whereClause = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    const offset = (page - 1) * limit;

    // The UNION keeps existing legacy providers discoverable while allowing
    // Tiffin-only providers, which have no row in the retired table, to use
    // their current kitchen as the public listing.
    const listingCte = Prisma.sql`
      WITH tiffin_listings AS (
        SELECT
          t."id",
          t."provider_id",
          t."kitchen_name",
          t."food_type"::text AS "food_type",
          t."meal_options",
          t."monthly_price",
          t."delivery_range_km",
          t."delivery_timing",
          t."created_at",
          COALESCE(kitchen."kitchen_name", t."kitchen_name") AS "live_kitchen_name",
          COALESCE(kitchen."owner_name", prov."business_name") AS "provider_name",
          COALESCE(kitchen."phone", prov."phone_number") AS "provider_phone",
          COALESCE(kitchen."address", prov."location") AS "address",
          COALESCE(kitchen."latitude", prov."latitude") AS "latitude",
          COALESCE(kitchen."longitude", prov."longitude") AS "longitude",
          kitchen."kitchen_logo",
          kitchen."description" AS "kitchen_description",
          kitchen."owner_name" AS "kitchen_owner_name",
          kitchen."food_options",
          kitchen."food_type"::text AS "kitchen_food_type",
          COALESCE(kitchen."extra_meal_price", 0) AS "per_meal_price",
          kitchen."delivery_type"::text AS "kitchen_delivery_type",
          kitchen."pickup_available",
          COALESCE(kitchen."delivery_radius_km", t."delivery_range_km") AS "delivery_radius_km",
          kitchen."created_at" AS "kitchen_created_at",
          COALESCE((SELECT json_agg(json_build_object(
            'id', plan."id",
            'type', lower(plan."plan_type"::text),
            'price', plan."price",
            'discountPrice', plan."discount_price",
            'durationDays', plan."duration_days",
            'totalMeals', plan."total_meals",
            'name', plan."plan_name"
          ) ORDER BY plan."duration_days")
          FROM "tiffin_subscription_plans" plan
          WHERE plan."kitchen_id" = kitchen."id" AND plan."is_active" = true), '[]'::json) AS "kitchen_plans"
        FROM "tiffin_services" t
        JOIN "providers" prov ON t."provider_id" = prov."id"
        LEFT JOIN "provider_profiles" profile ON profile."user_id" = prov."user_id"
        LEFT JOIN "tiffin_kitchens" kitchen ON kitchen."owner_id" = profile."id" AND kitchen."deleted_at" IS NULL

        UNION ALL

        SELECT
          kitchen."id",
          NULL::uuid AS "provider_id",
          kitchen."kitchen_name",
          NULL::text AS "food_type",
          COALESCE(kitchen."food_options"->'mealItems', '{}'::jsonb) AS "meal_options",
          (SELECT plan."price" FROM "tiffin_subscription_plans" plan WHERE plan."kitchen_id" = kitchen."id" AND plan."plan_type"::text = 'monthly' AND plan."is_active" = true ORDER BY plan."duration_days" DESC LIMIT 1) AS "monthly_price",
          kitchen."delivery_radius_km" AS "delivery_range_km",
          NULL::text AS "delivery_timing",
          kitchen."created_at",
          kitchen."kitchen_name" AS "live_kitchen_name",
          kitchen."owner_name" AS "provider_name",
          kitchen."phone" AS "provider_phone",
          kitchen."address",
          kitchen."latitude",
          kitchen."longitude",
          kitchen."kitchen_logo",
          kitchen."description" AS "kitchen_description",
          kitchen."owner_name" AS "kitchen_owner_name",
          kitchen."food_options",
          kitchen."food_type"::text AS "kitchen_food_type",
          COALESCE(kitchen."extra_meal_price", 0) AS "per_meal_price",
          kitchen."delivery_type"::text AS "kitchen_delivery_type",
          kitchen."pickup_available",
          kitchen."delivery_radius_km",
          kitchen."created_at" AS "kitchen_created_at",
          COALESCE((SELECT json_agg(json_build_object(
            'id', plan."id",
            'type', lower(plan."plan_type"::text),
            'price', plan."price",
            'discountPrice', plan."discount_price",
            'durationDays', plan."duration_days",
            'totalMeals', plan."total_meals",
            'name', plan."plan_name"
          ) ORDER BY plan."duration_days")
          FROM "tiffin_subscription_plans" plan
          WHERE plan."kitchen_id" = kitchen."id" AND plan."is_active" = true), '[]'::json) AS "kitchen_plans"
        FROM "tiffin_kitchens" kitchen
        WHERE kitchen."deleted_at" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "tiffin_services" legacy_t
            JOIN "providers" legacy_provider ON legacy_t."provider_id" = legacy_provider."id"
            JOIN "provider_profiles" legacy_profile ON legacy_profile."user_id" = legacy_provider."user_id"
            WHERE legacy_profile."id" = kitchen."owner_id"
          )
      )
    `;

    const rows = await prisma.$queryRaw<any[]>`${listingCte} SELECT * FROM tiffin_listings l ${whereClause} ORDER BY l."created_at" DESC LIMIT ${limit} OFFSET ${offset}`;
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`${listingCte} SELECT COUNT(*) AS count FROM tiffin_listings l ${whereClause}`;

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].count),
        totalPages: Math.ceil(Number(countResult[0].count) / limit),
      },
    };
  },

  /** Resolve either public listing id to the live Tiffin kitchen. */
  async findKitchenForService(serviceId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) return null;

    const currentKitchen = await prisma.tiffinKitchen.findFirst({
      where: { id: serviceId, deletedAt: null },
      include: {
        subscriptionPlans: { where: { isActive: true }, orderBy: { durationDays: 'asc' } },
      },
    });
    if (currentKitchen) return currentKitchen;

    const legacyService = await prisma.tiffinService.findUnique({
      where: { id: serviceId },
      select: { provider_id: true },
    });
    if (!legacyService) return null;

    const provider = await prisma.provider.findUnique({
      where: { id: legacyService.provider_id },
      select: { userId: true },
    });
    const profile = provider
      ? await prisma.providerProfile.findUnique({ where: { userId: provider.userId }, select: { id: true } })
      : null;
    return profile
      ? prisma.tiffinKitchen.findFirst({
        where: { ownerId: profile.id, deletedAt: null },
        include: {
          subscriptionPlans: { where: { isActive: true }, orderBy: { durationDays: 'asc' } },
        },
      })
      : null;
  },

  /** Resolve a public listing to its current kitchen and return one weekday. */
  async findTodayMenu(serviceId: string, dayOfWeek: string) {
    const legacyService = await prisma.tiffinService.findUnique({
      where: { id: serviceId },
      select: { provider_id: true },
    });

    let kitchen;
    if (legacyService) {
      const provider = await prisma.provider.findUnique({
        where: { id: legacyService.provider_id },
        select: { userId: true },
      });
      const profile = provider
        ? await prisma.providerProfile.findUnique({ where: { userId: provider.userId }, select: { id: true } })
        : null;
      kitchen = profile
        ? await prisma.tiffinKitchen.findFirst({
          where: { ownerId: profile.id, deletedAt: null },
          select: { weeklyMenus: { where: { dayOfWeek: dayOfWeek.toLowerCase(), mealCategory: { in: [MealCategory.LUNCH, MealCategory.DINNER] } } } },
        })
        : null;
    } else {
      kitchen = await prisma.tiffinKitchen.findFirst({
        where: { id: serviceId, deletedAt: null },
        select: { weeklyMenus: { where: { dayOfWeek: dayOfWeek.toLowerCase(), mealCategory: { in: [MealCategory.LUNCH, MealCategory.DINNER] } } } },
      });
    }

    if (!legacyService && !kitchen) return null;
    const meals = { lunch: [] as string[], dinner: [] as string[] };
    for (const menu of kitchen?.weeklyMenus || []) {
      const rawItems = menu.items;
      const itemList = Array.isArray(rawItems)
        ? rawItems
        : rawItems && typeof rawItems === 'object'
          ? ['veg', 'nonveg', 'jain']
            .map((diet) => (rawItems as Record<string, unknown>)[diet])
            .find((items) => Array.isArray(items) && items.length) || []
          : [];
      const items = Array.isArray(itemList) ? itemList.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
      if (String(menu.mealCategory).toLowerCase() === 'lunch') meals.lunch = items;
      if (String(menu.mealCategory).toLowerCase() === 'dinner') meals.dinner = items;
    }

    return { serviceId, dayOfWeek: dayOfWeek.toLowerCase(), meals };
  },
};
