// ─── Auth Service ───────────────────────────────────────────────────────
// Business logic for phone login + student onboarding flow.
// OTP is DUMMY — any value is accepted.
// ────────────────────────────────────────────────────────────────────────

import { authRepository } from './auth.repository.js';
import { sendOtpSchema, verifyOtpSchema } from './auth.schema.js';
import type { SendOtpInput, VerifyOtpInput } from './auth.schema.js';

export const authService = {
  /**
   * STEP 1: Send OTP (Dummy)
   * - Validates phone number
   * - Creates new user if not exists (role = STUDENT)
   * - Returns isNewUser flag
   */
  async sendOtp(input: SendOtpInput) {
    const { phone_number } = sendOtpSchema.parse(input);

    // Check if user already exists
    const existingUser = await authRepository.findByPhone(phone_number);

    let isNewUser = false;

    if (!existingUser) {
      // Create new user with default STUDENT role
      await authRepository.createUser(phone_number);
      isNewUser = true;
    }

    return {
      isNewUser,
      message: 'OTP sent successfully (dummy mode)',
    };
  },

  /**
   * STEP 2: Verify OTP (Dummy — accepts any OTP)
   * - Fetches user by phone
   * - Checks if student profile exists
   * - Returns appropriate response for new vs returning user
   */
  async verifyOtp(input: VerifyOtpInput) {
    const { phone_number } = verifyOtpSchema.parse(input);

    // OTP is always accepted (dummy mode) — no validation on otp value

    // Fetch user with their student profile
    const user = await authRepository.findByPhoneWithProfile(phone_number);

    if (!user) {
      throw { statusCode: 404, message: 'User not found. Please send OTP first.' };
    }

    const hasProfile = !!user.studentProfile;

    if (hasProfile) {
      // ── CASE B: Returning user with completed profile ──────────────
      return {
        isProfileComplete: true,
        userId: user.id,
        message: `Welcome back ${user.studentProfile!.fullName} 👋`,
        data: {
          id: user.studentProfile!.id,
          fullName: user.studentProfile!.fullName,
          college: user.studentProfile!.college,
          year: user.studentProfile!.year,
          gender: user.studentProfile!.gender,
          foodPreference: user.studentProfile!.foodPreference,
          sleepSchedule: user.studentProfile!.sleepSchedule,
          cleanlinessLevel: user.studentProfile!.cleanlinessLevel,
          studyHabits: user.studentProfile!.studyHabits,
          personalityType: user.studentProfile!.personalityType,
          locationPreference: user.studentProfile!.locationPreference,
          budget: user.studentProfile!.budget,
          profileImageUrl: user.studentProfile!.profileImageUrl,
        },
      };
    } else {
      // ── CASE A: New user — needs to complete profile ───────────────
      return {
        isProfileComplete: false,
        userId: user.id,
        nextStep: 'complete_profile',
        message: 'OTP verified. Please complete your profile.',
      };
    }
  },
};
