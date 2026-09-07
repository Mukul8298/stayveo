// ─── User Service ───────────────────────────────────────────────────────

import { userRepository } from './user.repository.js';
import { createUserSchema, updateUserProfileSchema, updateUserSchema } from './user.schema.js';
import type { CreateUserInput, UpdateUserInput, UpdateUserProfileInput } from './user.schema.js';
import { FoodPreference, GenderType, LifestyleType, SocialLevel, StudyHabit } from '../../common/enums.js';
import { parseYear } from '../../common/utils/year.js';

const GENDER_TO_ENUM: Record<UpdateUserProfileInput['gender'], GenderType> = {
  Male: GenderType.MALE,
  Female: GenderType.FEMALE,
  Other: GenderType.OTHER,
  'Prefer not to say': GenderType.PREFER_NOT_TO_SAY,
};

const FOOD_TO_ENUM: Record<UpdateUserProfileInput['foodPreference'], FoodPreference> = {
  Vegetarian: FoodPreference.VEG,
  'Non-Veg': FoodPreference.NONVEG,
  Jain: FoodPreference.JAIN,
  Vegan: FoodPreference.VEGAN,
};

const STUDY_TO_ENUM: Record<string, StudyHabit> = {
  Quiet: StudyHabit.QUIET,
  Normal: StudyHabit.NORMAL,
  Flexible: StudyHabit.FLEXIBLE,
};

const PERSONALITY_TO_ENUM: Record<string, SocialLevel> = {
  Introvert: SocialLevel.INTROVERT,
  Ambivert: SocialLevel.AMBIVERT,
  Extrovert: SocialLevel.EXTROVERT,
};

const SLEEP_TO_ENUM: Record<UpdateUserProfileInput['sleepSchedule'], LifestyleType> = {
  'Early Bird': LifestyleType.EARLY_BIRD,
  'Night Owl': LifestyleType.NIGHT_OWL,
  Flexible: LifestyleType.FLEXIBLE,
};

export const userService = {
  /** Get user by ID, throws if not found */
  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw { statusCode: 404, message: 'User not found' };
    return user;
  },

  /** Get user with their full profile (student or provider) */
  async getWithProfile(id: string) {
    const user = await userRepository.findWithProfile(id);
    if (!user) throw { statusCode: 404, message: 'User not found' };
    return user;
  },

  /** Create a new user after validation */
  async create(input: CreateUserInput) {
    const data = createUserSchema.parse(input);

    // Check for duplicate phone
    const existing = await userRepository.findByPhone(data.phone_number);
    if (existing) throw { statusCode: 409, message: 'Phone number already registered' };

    return userRepository.create(data);
  },

  /** Update user */
  async update(id: string, input: UpdateUserInput) {
    const data = updateUserSchema.parse(input);
    await userService.getById(id); // ensure exists
    return userRepository.update(id, data);
  },

  /** Update a student profile using the phone number as the stable lookup key */
  async updateProfile(input: UpdateUserProfileInput) {
    const rawYear = input.year;
    const mappedYear = parseYear(rawYear);
    const data = updateUserProfileSchema.parse(input);
    const validatedYear = data.year;
    const prismaYear = data.year;

    const existingUser = await userRepository.findWithProfileByPhone(data.phone);
    if (!existingUser) {
      throw { statusCode: 404, message: 'User not found for the provided phone number' };
    }

    const result = await userRepository.updateProfileByPhone(data.phone, {
      userId: existingUser.id,
      fullName: data.fullName.trim(),
      college: data.college.trim(),
      year: data.year,
      gender: GENDER_TO_ENUM[data.gender],
      foodPreference: FOOD_TO_ENUM[data.foodPreference],
      sleepSchedule: SLEEP_TO_ENUM[data.sleepSchedule],
      cleanlinessLevel: data.cleanlinessLevel ?? null,
      studyHabits: data.studyHabits ? STUDY_TO_ENUM[data.studyHabits] : null,
      personalityType: data.personalityType ? PERSONALITY_TO_ENUM[data.personalityType] : null,
      locationPreference: data.locationPreference?.trim() || null,
      currentAddress: data.currentAddress?.trim() || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      budget: data.budget.trim(),
      profileImageUrl: data.profileImageUrl?.trim() || null,
    });

    const storedDbYear = result.studentProfile?.year;

    console.log(`\n--- Verification for PUT /user/update-profile ---`);
    console.log(`Incoming year: ${rawYear}`);
    console.log(`Mapped year: ${mappedYear}`);
    console.log(`Validated year: ${validatedYear}`);
    console.log(`Prisma year: ${prismaYear}`);
    console.log(`Stored database year: ${storedDbYear}`);
    console.log(`-------------------------------------------\n`);

    return result;
  },
};
