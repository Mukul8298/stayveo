// ─── User Zod Schemas ───────────────────────────────────────────────────

import { z } from 'zod';

const displayYear = normalizeEnum({
  '1st year': '1st Year',
  '2nd year': '2nd Year',
  '3rd year': '3rd Year',
  '4th year': '4th Year',
});

const displayGender = normalizeEnum({
  male: 'Male',
  female: 'Female',
  other: 'Other',
  'prefer not to say': 'Prefer not to say',
  prefer_not_to_say: 'Prefer not to say',
});

const displayFood = normalizeEnum({
  vegetarian: 'Vegetarian',
  veg: 'Vegetarian',
  'non-veg': 'Non-Veg',
  nonveg: 'Non-Veg',
  non_veg: 'Non-Veg',
  jain: 'Jain',
  vegan: 'Vegan',
});

const displaySleep = normalizeEnum({
  'early bird': 'Early Bird',
  early_bird: 'Early Bird',
  'night owl': 'Night Owl',
  night_owl: 'Night Owl',
  flexible: 'Flexible',
});

const displayStudy = normalizeEnum({
  quiet: 'Quiet',
  normal: 'Normal',
  flexible: 'Flexible',
});

const displayPersonality = normalizeEnum({
  introvert: 'Introvert',
  ambivert: 'Ambivert',
  extrovert: 'Extrovert',
});

function normalizeEnum<T extends string>(values: Record<string, T>) {
  return (value: unknown) => {
    if (typeof value !== 'string') return value;
    return values[value.trim().toLowerCase()] ?? value;
  };
}

function normalizeProfileAliases(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const data = { ...(value as Record<string, unknown>) };
  if (data.studyHabits === undefined && data.studyHabit !== undefined) {
    data.studyHabits = data.studyHabit;
  }

  return data;
}

export const createUserSchema = z.object({
  phone_number: z.string().min(10).max(15),
  role: z.enum(['STUDENT', 'PROVIDER']),
});

export const updateUserSchema = createUserSchema.partial();

export const updateUserProfileSchema = z.preprocess(
  normalizeProfileAliases,
  z.object({
    phone: z.string().min(10).max(15),
    fullName: z.string().min(1).max(200),
    college: z.string().min(1).max(200),
    year: z.preprocess(
      displayYear,
      z.enum(['1st Year', '2nd Year', '3rd Year', '4th Year'])
    ),
    gender: z.preprocess(
      displayGender,
      z.enum(['Male', 'Female', 'Other', 'Prefer not to say'])
    ),
    foodPreference: z.preprocess(
      displayFood,
      z.enum(['Vegetarian', 'Non-Veg', 'Jain', 'Vegan'])
    ),
    budget: z.string().min(1).max(100),
    cleanlinessLevel: z.coerce.number().int().min(1).max(5),
    studyHabits: z.preprocess(
      displayStudy,
      z.enum(['Quiet', 'Normal', 'Flexible'])
    ),
    personalityType: z.preprocess(
      displayPersonality,
      z.enum(['Introvert', 'Ambivert', 'Extrovert'])
    ),
    locationPreference: z.string().optional(),
    sleepSchedule: z.preprocess(
      displaySleep,
      z.enum(['Early Bird', 'Night Owl', 'Flexible'])
    ),
    profileImageUrl: z.string().optional(),
  })
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
