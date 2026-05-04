// ─── Student Profile Zod Schemas ────────────────────────────────────────

import { z } from 'zod';

const prismaEnum = <T extends string>(values: Record<string, T>) => (value: unknown) => {
  if (typeof value !== 'string') return value;
  return values[value.trim().toLowerCase()] ?? value;
};

const genderEnum = prismaEnum({
  male: 'MALE',
  female: 'FEMALE',
  other: 'OTHER',
  'prefer not to say': 'PREFER_NOT_TO_SAY',
  prefer_not_to_say: 'PREFER_NOT_TO_SAY',
});

const foodEnum = prismaEnum({
  vegetarian: 'VEG',
  veg: 'VEG',
  'non-veg': 'NONVEG',
  nonveg: 'NONVEG',
  non_veg: 'NONVEG',
  jain: 'JAIN',
  vegan: 'VEGAN',
  'no preference': 'NO_PREFERENCE',
  no_preference: 'NO_PREFERENCE',
});

const sleepEnum = prismaEnum({
  'early bird': 'EARLY_BIRD',
  early_bird: 'EARLY_BIRD',
  'night owl': 'NIGHT_OWL',
  night_owl: 'NIGHT_OWL',
  flexible: 'FLEXIBLE',
});

const studyEnum = prismaEnum({
  quiet: 'QUIET',
  normal: 'NORMAL',
  flexible: 'FLEXIBLE',
});

const personalityEnum = prismaEnum({
  introvert: 'INTROVERT',
  ambivert: 'AMBIVERT',
  extrovert: 'EXTROVERT',
});

function normalizeStudentAliases(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const data = { ...(value as Record<string, unknown>) };
  if (data.studyHabits === undefined && data.studyHabit !== undefined) {
    data.studyHabits = data.studyHabit;
  }

  return data;
}

const studentProfileFields = z.object({
  fullName: z.string().min(1).max(200),
  college: z.string().min(1).max(200),
  year: z.coerce.number().int().min(1).max(6).optional(),
  gender: z.preprocess(
    genderEnum,
    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional()
  ),
  foodPreference: z.preprocess(
    foodEnum,
    z.enum(['VEG', 'NONVEG', 'JAIN', 'VEGAN', 'NO_PREFERENCE']).optional()
  ),
  sleepSchedule: z.preprocess(
    sleepEnum,
    z.enum(['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE']).optional()
  ),
  cleanlinessLevel: z.coerce.number().int().min(1).max(5).optional(),
  studyHabits: z.preprocess(
    studyEnum,
    z.enum(['QUIET', 'FLEXIBLE', 'NORMAL']).optional()
  ),
  personalityType: z.preprocess(
    personalityEnum,
    z.enum(['INTROVERT', 'EXTROVERT', 'AMBIVERT']).optional()
  ),
  locationPreference: z.string().optional(),
  budget: z.string().min(1).max(100).optional(),
  profileImageUrl: z.string().optional().or(z.literal('')),
});

export const createStudentProfileSchema = z.preprocess(
  normalizeStudentAliases,
  studentProfileFields
);

export const updateStudentProfileSchema = z.preprocess(
  normalizeStudentAliases,
  studentProfileFields.partial()
);

export type CreateStudentInput = z.infer<typeof createStudentProfileSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentProfileSchema>;
