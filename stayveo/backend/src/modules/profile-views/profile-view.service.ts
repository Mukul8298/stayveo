// ─── Profile View Service ───────────────────────────────────────────────

import { profileViewRepository } from './profile-view.repository.js';

export const profileViewService = {
  /** Record a profile view */
  async record(providerId: string, viewerId?: string) {
    return profileViewRepository.record(providerId, viewerId);
  },

  /** Get profile view count */
  async getCount(providerId: string) {
    return profileViewRepository.countByProvider(providerId);
  },

  /** Get unique viewer count */
  async getUniqueCount(providerId: string) {
    return profileViewRepository.countUniqueViewers(providerId);
  },
};
