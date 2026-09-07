function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePlans(value) {
  return Object.fromEntries(asArray(value).map((plan) => {
    const type = String(plan?.type || '').toLowerCase() === 'custom' ? 'daily' : String(plan?.type || '').toLowerCase();
    const label = type ? `${type[0].toUpperCase()}${type.slice(1)}` : '';
    return [type, {
      id: plan?.id || '',
      type,
      label,
      detail: plan?.description || (type === 'monthly' ? 'Monthly meal plan' : `${label} meal plan`),
      price: Number(plan?.discountPrice ?? plan?.price ?? 0),
      listPrice: Number(plan?.price || 0),
      durationDays: Number(plan?.durationDays || 0),
      totalMeals: Number(plan?.totalMeals || 0),
      unit: type === 'daily' ? '/day' : type === 'weekly' ? '/week' : '/month',
    }];
  }).filter(([key]) => key));
}

function normalizeFoodCategories(record, foodType) {
  const foodOptions = asObject(firstValue(record?.food_options, record?.foodOptions));
  const rawCategories = asArray(firstValue(record?.food_categories, record?.foodCategories, foodOptions.categories));
  if (rawCategories.length) return rawCategories.map((category) => String(category).toLowerCase());
  if (foodType === 'BOTH') return ['veg', 'nonveg'];
  if (foodType === 'NONVEG') return ['nonveg'];
  if (foodType === 'JAIN') return ['jain'];
  return ['veg'];
}

function normalizeServiceOptions(record) {
  const explicit = asArray(firstValue(record?.service_options, record?.serviceOptions));
  if (explicit.length) return explicit;

  const deliveryType = String(firstValue(record?.kitchen_delivery_type, record?.delivery_type, record?.deliveryType) || '').toLowerCase();
  const pickupAvailable = record?.pickup_available ?? record?.pickupAvailable;
  if (deliveryType === 'both' || pickupAvailable === true) return ['Home Delivery', 'Self Pickup'];
  if (deliveryType === 'pickup_only' || deliveryType === 'pickup') return ['Self Pickup'];
  return ['Home Delivery'];
}

export function normalizeTiffinProvider(record = {}) {
  const mealOptions = asArray(firstValue(record.meal_options, record.mealOptions));
  const latitudeValue = firstValue(record.live_latitude, record.latitude, record.service_latitude);
  const longitudeValue = firstValue(record.live_longitude, record.longitude, record.service_longitude);
  const foodType = String(firstValue(record.kitchen_food_type, record.food_type, record.foodType, 'VEG') || 'VEG').toUpperCase();
  const foodCategories = normalizeFoodCategories(record, foodType);
  const planRecords = asArray(record.kitchen_plans);
  const planPrice = planRecords.map((plan) => Number(plan?.discountPrice ?? plan?.price)).find((value) => Number.isFinite(value) && value > 0);
  const monthlyPrice = Number(firstValue(record.monthly_price, record.monthlyPrice, 0)) || 0;
  const price = Number(firstValue(record.price, planPrice, 0)) || 0;
  const photos = asArray(firstValue(record.photos, record.images));
  const imageUrl = firstValue(record.image, record.kitchen_logo, record.kitchenLogo, record.profile_image, photos[0], '/favicon.svg');
  const recordMenus = asObject(record.menus);
  const menus = mealOptions.length
    ? { lunch: mealOptions.slice(0, 3), dinner: mealOptions.slice(3, 6) }
    : { lunch: asArray(recordMenus.lunch), dinner: asArray(recordMenus.dinner) };

  return {
    ...record,
    id: firstValue(record.id, ''),
    name: firstValue(record.live_kitchen_name, record.kitchen_name, record.kitchenName, record.provider_name, record.name, 'Tiffin Service'),
    image: imageUrl,
    providerName: firstValue(record.kitchen_owner_name, record.provider_name, record.owner_name, record.name, 'Tiffin Provider'),
    providerPhoto: firstValue(record.provider_photo, record.providerPhoto, record.owner_photo, record.profile_image, imageUrl),
    providerSince: firstValue(record.provider_since, record.providerSince, record.kitchen_created_at),
    rating: Number(firstValue(record.rating, 0)) || 0,
    distanceKm: Number(firstValue(record.distance_km, record.distanceKm, record.delivery_range_km, 0)) || 0,
    address: firstValue(record.live_address, record.address, record.service_address, record.kitchen_address),
    latitude: latitudeValue !== null && Number.isFinite(Number(latitudeValue)) ? Number(latitudeValue) : null,
    longitude: longitudeValue !== null && Number.isFinite(Number(longitudeValue)) ? Number(longitudeValue) : null,
    foodType,
    foodCategories,
    cuisine: firstValue(record.cuisine, record.style, foodCategories.includes('nonveg') ? 'Homestyle · Multi-Cuisine' : 'Homestyle · Vegetarian'),
    serviceOptions: normalizeServiceOptions(record),
    deliveryRadiusKm: Number(firstValue(record.delivery_radius_km, record.deliveryRadiusKm, record.delivery_range_km, 0)) || 0,
    price,
    monthlyPrice,
    deliveryTiming: firstValue(record.delivery_timing, record.deliveryTiming, ''),
    deliveryAvailable: record.deliveryAvailable ?? true,
    mealType: firstValue(record.meal_type, record.mealType, ''),
    description: firstValue(record.kitchen_description, record.description, ''),
    menus,
    plans: Object.keys(asObject(record.plans)).length ? asObject(record.plans) : normalizePlans(record.kitchen_plans),
  };
}
