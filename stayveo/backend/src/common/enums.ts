// ─── Re-export Prisma Enums for Convenience ─────────────────────────────
// PascalCase enum names mapped to lowercase Postgres enums via @map().
// Import these instead of directly from @prisma/client in modules.
// ────────────────────────────────────────────────────────────────────────

export {
  UserRole,
  GenderType,
  FoodPreference,
  LifestyleType,
  StudyHabit,
  SocialLevel,
  ServiceCategory,
  FoodType,
  DocType,
} from '@prisma/client';
