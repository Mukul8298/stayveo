// ─── Profile View Controller ────────────────────────────────────────────

import { FastifyRequest, FastifyReply } from 'fastify';
import { profileViewService } from './profile-view.service.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { USER_ID_HEADER } from '../../common/constants.js';
import { invalidateProviderDashboardCache, pgProviderDashboardKey } from '../../common/cache/provider-dashboard.js';

export const profileViewController = {
  /** POST /profile-views/:providerId — Record a profile view */
  async record(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const viewerId = request.headers[USER_ID_HEADER] as string | undefined;
    const view = await profileViewService.record(request.params.providerId, viewerId);
    const profile = await request.server.prisma.providerProfile.findUnique({
      where: { id: request.params.providerId },
      select: { id: true },
    }) || await (async () => {
      const legacyProvider = await request.server.prisma.provider.findUnique({
        where: { id: request.params.providerId },
        select: { userId: true },
      });
      return legacyProvider
        ? request.server.prisma.providerProfile.findUnique({ where: { userId: legacyProvider.userId }, select: { id: true } })
        : null;
    })();
    await invalidateProviderDashboardCache(
      request.server.redis,
      pgProviderDashboardKey(profile?.id || request.params.providerId),
      request.server.log
    );
    return sendCreated(reply, view, 'Profile view recorded');
  },

  /** GET /profile-views/:providerId/count — Get view count */
  async getCount(
    request: FastifyRequest<{ Params: { providerId: string } }>,
    reply: FastifyReply
  ) {
    const [total, unique] = await Promise.all([
      profileViewService.getCount(request.params.providerId),
      profileViewService.getUniqueCount(request.params.providerId),
    ]);
    return sendSuccess(reply, { total, unique });
  },
};
