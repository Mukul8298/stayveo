export type CommissionBearer = 'OWNER' | 'STUDENT';

export type PaymentCalculation = {
  productType: 'PG' | 'TIFFIN';
  planType?: string;
  billingCycle?: string;
  baseAmount: number;
  platformFee: number;
  commissionBearer: CommissionBearer;
  ownerAmount: number;
  studentPayable: number;
  mealsPerDay?: number;
  isRenewal?: boolean;
};

const money = (value: number) => Number(value.toFixed(2));

export function calculatePgPayment(reservationFee: number): PaymentCalculation {
  const baseAmount = money(reservationFee);
  const platformFee = 99;
  return {
    productType: 'PG',
    baseAmount,
    platformFee,
    commissionBearer: 'STUDENT',
    ownerAmount: baseAmount,
    studentPayable: money(baseAmount + platformFee),
  };
}

export function calculateTiffinPayment(input: {
  baseAmount: number;
  planType: string;
  mealsPerDay: number;
  isRenewal: boolean;
}): PaymentCalculation {
  const normalizedPlan = input.planType.toLowerCase();
  if (!['daily_1_meal', 'weekly_1_meal', 'monthly_1_meal', 'monthly_2_meals'].includes(normalizedPlan)) {
    throw { statusCode: 400, message: 'Choose a valid Tiffin meal plan' };
  }
  const platformFee = 0;
  const commissionBearer: CommissionBearer = 'OWNER';
  const baseAmount = money(input.baseAmount);
  return {
    productType: 'TIFFIN',
    planType: normalizedPlan,
    billingCycle: input.isRenewal ? 'RENEWAL' : 'FIRST_PAYMENT',
    baseAmount,
    platformFee,
    commissionBearer,
    ownerAmount: baseAmount,
    studentPayable: baseAmount,
    mealsPerDay: input.mealsPerDay,
    isRenewal: input.isRenewal,
  };
}
