import { z } from 'zod';

const accountNumber = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, 'Bank account number must contain 9 to 18 digits');

const aadhaarNumber = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Aadhaar number must contain 12 digits');

const panNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN number is invalid');

export const updateBankDetailsSchema = z.object({
  accountHolderName: z.string().trim().min(2, 'Account holder name is required').max(200),
  accountNumber: accountNumber.optional().or(z.literal('')),
  ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC code is invalid'),
  bankName: z.string().trim().min(2, 'Bank name is required').max(200),
  aadhaarNumber: aadhaarNumber.optional().or(z.literal('')),
  panNumber: panNumber.optional().or(z.literal('')),
});

export type UpdateBankDetailsInput = z.infer<typeof updateBankDetailsSchema>;
