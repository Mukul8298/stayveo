// ─── Service Selection Service ──────────────────────────────────────────

import { serviceRepository } from './service.repository.js';
import { addServicesSchema } from './service.schema.js';
import type { AddServicesInput } from './service.schema.js';
import { providerService } from '../provider/provider.service.js';
import { ServiceCategory } from '../../common/enums.js';

export const serviceSelectionService = {
  /** Add service types to a provider */
  async addServices(userId: string, input: AddServicesInput) {
    const data = addServicesSchema.parse(input);

    const provider = await providerService.getByUserId(userId);

    const services = await serviceRepository.createMany(
      provider.id,
      data.serviceTypes as ServiceCategory[]
    );

    return services;
  },

  /** Get all services for the current provider */
  async getServices(userId: string) {
    const provider = await providerService.getByUserId(userId);
    return serviceRepository.findByProviderId(provider.id);
  },

  /** Validate that a provider has a specific service type registered */
  async ensureServiceExists(providerId: string, serviceType: ServiceCategory) {
    const service = await serviceRepository.findByProviderAndType(providerId, serviceType);
    if (!service) {
      throw {
        statusCode: 400,
        message: `Provider must register "${serviceType}" service first`,
      };
    }
    return service;
  },
};
