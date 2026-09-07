// ─── Student Service ────────────────────────────────────────────────────

import { studentRepository } from './student.repository.js';
import { createStudentProfileSchema, updateStudentProfileSchema } from './student.schema.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';
import { userService } from '../users/user.service.js';
import { parseYear } from '../../common/utils/year.js';

export const studentService = {
  /** Get student profile for the current user */
  async getProfile(userId: string) {
    const profile = await studentRepository.findByUserId(userId);
    if (!profile) throw { statusCode: 404, message: 'Student profile not found' };

    console.log(`\n--- Verification for GET /student/profile ---`);
    console.log(`Incoming year: N/A (GET request)`);
    console.log(`Mapped year: N/A (GET request)`);
    console.log(`Validated year: N/A (GET request)`);
    console.log(`Prisma year: N/A (GET request)`);
    console.log(`Stored database year: ${profile.year}`);
    console.log(`-------------------------------------------\n`);

    return profile;
  },

  /** Create a student profile (validates user exists first) */
  async createProfile(userId: string, input: CreateStudentInput) {
    const rawYear = input.year;
    const mappedYear = parseYear(rawYear);
    const data = createStudentProfileSchema.parse(input);
    const validatedYear = data.year;
    const prismaYear = data.year;

    // Ensure user exists
    await userService.getById(userId);

    // Check if profile already exists
    const existing = await studentRepository.findByUserId(userId);
    if (existing) throw { statusCode: 409, message: 'Student profile already exists' };

    const profile = await studentRepository.create(userId, data);
    
    // Check what is stored
    const storedDbYear = profile.year;

    console.log(`\n--- Verification for POST /student/profile ---`);
    console.log(`Incoming year: ${rawYear}`);
    console.log(`Mapped year: ${mappedYear}`);
    console.log(`Validated year: ${validatedYear}`);
    console.log(`Prisma year: ${prismaYear}`);
    console.log(`Stored database year: ${storedDbYear}`);
    console.log(`-------------------------------------------\n`);

    return profile;
  },

  /** Update student profile */
  async updateProfile(userId: string, input: UpdateStudentInput) {
    const rawYear = input.year;
    const mappedYear = parseYear(rawYear);
    const data = updateStudentProfileSchema.parse(input);
    const validatedYear = data.year;
    const prismaYear = data.year;

    // Ensure profile exists
    await studentService.getProfile(userId);

    const profile = await studentRepository.update(userId, data);
    const storedDbYear = profile.year;

    console.log(`\n--- Verification for PUT /student/profile ---`);
    console.log(`Incoming year: ${rawYear}`);
    console.log(`Mapped year: ${mappedYear}`);
    console.log(`Validated year: ${validatedYear}`);
    console.log(`Prisma year: ${prismaYear}`);
    console.log(`Stored database year: ${storedDbYear}`);
    console.log(`-------------------------------------------\n`);

    return profile;
  },
};

