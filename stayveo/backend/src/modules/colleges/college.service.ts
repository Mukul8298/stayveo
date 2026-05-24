import { collegeRepository } from './college.repository.js';
import { collegeIdParamSchema, collegeQuerySchema } from './college.schema.js';
import type { CollegeQueryInput } from './college.schema.js';

export const collegeService = {
  async list(input: CollegeQueryInput) {
    const query = collegeQuerySchema.parse(input);
    return collegeRepository.findMany(query);
  },

  async getById(id: string) {
    const params = collegeIdParamSchema.parse({ id });
    const college = await collegeRepository.findById(params.id);
    if (!college) throw { statusCode: 404, message: 'College not found' };
    return college;
  },
};
