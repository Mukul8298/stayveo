import { TiffinPlanType } from '@prisma/client';

type TiffinPricePlan = {
  id: string;
  planType: TiffinPlanType | string;
  price: number | { toString(): string };
  isActive?: boolean;
};

const MEAL_PLAN_TYPES = {
  daily: TiffinPlanType.DAILY_1_MEAL,
  weekly: TiffinPlanType.WEEKLY_1_MEAL,
  monthlyOne: TiffinPlanType.MONTHLY_1_MEAL,
  monthlyTwo: TiffinPlanType.MONTHLY_2_MEALS,
} as const;

export function tiffinPlanDurationDays(planType: TiffinPlanType | string) {
  switch (String(planType).toLowerCase()) {
    case 'daily_1_meal': return 1;
    case 'weekly_1_meal': return 7;
    case 'monthly_1_meal':
    case 'monthly_2_meals': return 30;
    default: throw { statusCode: 400, message: 'Choose a valid Tiffin meal plan' };
  }
}

export function calculateTiffinPrice(
  requestedPlanType: TiffinPlanType | string,
  selectedMealCount: number,
  plans: TiffinPricePlan[],
) {
  if (selectedMealCount !== 1 && selectedMealCount !== 2) {
    throw { statusCode: 400, message: 'Select one or two meals per day' };
  }

  const requestedType = String(requestedPlanType).toLowerCase();
  let priceType: TiffinPlanType;
  if (requestedType === MEAL_PLAN_TYPES.daily.toLowerCase()) {
    priceType = MEAL_PLAN_TYPES.daily;
  } else if (requestedType === MEAL_PLAN_TYPES.weekly.toLowerCase()) {
    priceType = MEAL_PLAN_TYPES.weekly;
  } else if (requestedType === 'monthly_1_meal' || requestedType === 'monthly_2_meals') {
    priceType = selectedMealCount === 1 ? MEAL_PLAN_TYPES.monthlyOne : MEAL_PLAN_TYPES.monthlyTwo;
  } else {
    throw { statusCode: 400, message: 'Choose a valid Tiffin meal plan' };
  }

  const plan = plans.find((item) => String(item.planType).toLowerCase() === priceType.toLowerCase() && item.isActive !== false);
  if (!plan) throw { statusCode: 400, message: `This provider has not configured the ${priceType.toLowerCase().replaceAll('_', ' ')} price` };

  const configuredPrice = Number(plan.price);
  if (!Number.isFinite(configuredPrice) || configuredPrice <= 0) {
    throw { statusCode: 400, message: `This provider has not configured a valid ${priceType.toLowerCase().replaceAll('_', ' ')} price` };
  }

  const amount = priceType === MEAL_PLAN_TYPES.monthlyOne || priceType === MEAL_PLAN_TYPES.monthlyTwo
    ? configuredPrice
    : configuredPrice * selectedMealCount;

  return { plan, amount: Number(amount.toFixed(2)) };
}

export function serializeTiffinPrices(plans: TiffinPricePlan[]) {
  const priceFor = (planType: TiffinPlanType) => {
    const plan = plans.find((item) => String(item.planType).toLowerCase() === planType.toLowerCase() && item.isActive !== false);
    return plan ? Number(plan.price) : null;
  };
  return {
    dailyOneMealPrice: priceFor(MEAL_PLAN_TYPES.daily),
    weeklyOneMealPrice: priceFor(MEAL_PLAN_TYPES.weekly),
    monthlyOneMealPrice: priceFor(MEAL_PLAN_TYPES.monthlyOne),
    monthlyTwoMealPrice: priceFor(MEAL_PLAN_TYPES.monthlyTwo),
  };
}
