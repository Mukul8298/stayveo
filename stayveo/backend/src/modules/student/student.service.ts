// ─── Student Service ────────────────────────────────────────────────────

import { studentRepository } from './student.repository.js';
import { createStudentProfileSchema, updateStudentProfileSchema } from './student.schema.js';
import type { CreateStudentInput, UpdateStudentInput } from './student.schema.js';
import { userService } from '../users/user.service.js';

export const studentService = {
  /** Get student profile for the current user */
  async getProfile(userId: string) {
    const profile = await studentRepository.findByUserId(userId);
    if (!profile) throw { statusCode: 404, message: 'Student profile not found' };
    return profile;
  },

  /** Create a student profile (validates user exists first) */
  async createProfile(userId: string, input: CreateStudentInput) {
    const data = createStudentProfileSchema.parse(input);

    // Ensure user exists
    await userService.getById(userId);

    // Check if profile already exists
    const existing = await studentRepository.findByUserId(userId);
    if (existing) throw { statusCode: 409, message: 'Student profile already exists' };

    return studentRepository.create(userId, data);
  },

  /** Update student profile */
  async updateProfile(userId: string, input: UpdateStudentInput) {
    const data = updateStudentProfileSchema.parse(input);

    // Ensure profile exists
    await studentService.getProfile(userId);

    return studentRepository.update(userId, data);
  },
};
