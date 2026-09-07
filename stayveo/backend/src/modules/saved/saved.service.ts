import { savedRepository } from './saved.repository.js';

function requireUser(userId?: string) {
  if (!userId) {
    throw { statusCode: 401, message: 'User is required' };
  }
  return userId;
}

export const savedService = {
  list(userId?: string) {
    return savedRepository.list(requireUser(userId));
  },

  ids(userId?: string) {
    return savedRepository.ids(requireUser(userId));
  },

  save(userId: string | undefined, roomId: string) {
    return savedRepository.save(requireUser(userId), roomId);
  },

  remove(userId: string | undefined, roomId: string) {
    return savedRepository.remove(requireUser(userId), roomId);
  },
};
