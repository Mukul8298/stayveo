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
    commissionBearer: 'OWNER',
    ownerAmount: money(baseAmount - platformFee),
    studentPayable: baseAmount,
  };
}

export function calculateTiffinPayment(input: {
  baseAmount: number;
  planType: string;
  mealsPerDay: number;
  isRenewal: boolean;
}): PaymentCalculation {
  const normalizedPlan = input.planType.toLowerCase();
  const monthly = normalizedPlan === 'monthly';
  const platformFee = !monthly
    ? 0
    : input.isRenewal
      ? input.mealsPerDay === 1 ? 49 : 99
      : input.mealsPerDay === 1 ? 99 : 199;
  const commissionBearer: CommissionBearer = monthly && input.isRenewal ? 'STUDENT' : 'OWNER';
  const baseAmount = money(input.baseAmount);
  const studentPayable = money(baseAmount + (commissionBearer === 'STUDENT' ? platformFee : 0));
  return {
    productType: 'TIFFIN',
    planType: normalizedPlan,
    billingCycle: input.isRenewal ? 'RENEWAL' : 'FIRST_PAYMENT',
    baseAmount,
    platformFee,
    commissionBearer,
    ownerAmount: money(baseAmount - (commissionBearer === 'OWNER' ? platformFee : 0)),
    studentPayable,
    mealsPerDay: input.mealsPerDay,
    isRenewal: input.isRenewal,
  };
}
