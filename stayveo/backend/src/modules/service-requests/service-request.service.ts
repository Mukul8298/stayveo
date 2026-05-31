import { serviceRequestRepository } from './service-request.repository.js';
import {
  acceptServiceRequestSchema,
  createServiceRequestSchema,
  declineServiceRequestSchema,
  serviceRequestFilterSchema,
} from './service-request.schema.js';
import type {
  AcceptServiceRequestInput,
  CreateServiceRequestInput,
  DeclineServiceRequestInput,
  ServiceRequestFilterInput,
} from './service-request.schema.js';

const EARTH_RADIUS_KM = 6371.0088;

function isValidCoordinate(value: unknown, min: number, max: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

function toRadians(value: number) {
  return value * (Math.PI / 180);
}

function calculateDistanceKm(
  sourceLat: unknown,
  sourceLng: unknown,
  destinationLat: unknown,
  destinationLng: unknown
) {
  if (
    !isValidCoordinate(sourceLat, -90, 90) ||
    !isValidCoordinate(destinationLat, -90, 90) ||
    !isValidCoordinate(sourceLng, -180, 180) ||
    !isValidCoordinate(destinationLng, -180, 180)
  ) {
    return null;
  }

  const lat1 = Number(sourceLat);
  const lng1 = Number(sourceLng);
  const lat2 = Number(destinationLat);
  const lng2 = Number(destinationLng);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const serviceRequestService = {
  async create(studentId: string, input: CreateServiceRequestInput) {
    if (!studentId) throw { statusCode: 401, message: 'Student ID is required' };

    const data = createServiceRequestSchema.parse(input);
    const profile = await serviceRequestRepository.findStudentProfile(studentId);
    if (!profile) throw { statusCode: 400, message: 'Complete your student profile before requesting service' };

    const studentLatitude = data.studentLatitude ?? profile.latitude;
    const studentLongitude = data.studentLongitude ?? profile.longitude;
    const studentAddress = data.studentAddress || profile.currentAddress;

    if (!studentAddress?.trim()) {
      throw { statusCode: 400, message: 'Current address is required before requesting service' };
    }

    if (!isValidCoordinate(studentLatitude, -90, 90) || !isValidCoordinate(studentLongitude, -180, 180)) {
      throw { statusCode: 400, message: 'Pin your current location before requesting service' };
    }

    const duplicate = await serviceRequestRepository.findDuplicate(studentId, data);
    if (duplicate) {
      throw { statusCode: 409, message: 'You already have an active request for this service' };
    }

    const distanceKm = calculateDistanceKm(
      studentLatitude,
      studentLongitude,
      data.providerLatitude,
      data.providerLongitude
    );

    return serviceRequestRepository.create(studentId, data, distanceKm, profile);
  },

  async listByProvider(providerId: string, query: ServiceRequestFilterInput) {
    if (!providerId) throw { statusCode: 400, message: 'Provider ID is required' };
    const filters = serviceRequestFilterSchema.parse(query);
    return serviceRequestRepository.listByProvider(providerId, filters);
  },

  async listByStudent(studentId: string, query: ServiceRequestFilterInput) {
    if (!studentId) throw { statusCode: 401, message: 'Student ID is required' };
    const filters = serviceRequestFilterSchema.parse(query);
    return serviceRequestRepository.listByStudent(studentId, filters);
  },

  async accept(id: string, providerId: string, input: AcceptServiceRequestInput) {
    const data = acceptServiceRequestSchema.parse(input);
    const request = await serviceRequestRepository.findById(id);
    if (!request) throw { statusCode: 404, message: 'Request not found' };
    if (request.providerId !== providerId) throw { statusCode: 403, message: 'Request does not belong to this provider' };
    if (request.status !== 'pending') throw { statusCode: 409, message: `Request is already ${request.status}` };
    return serviceRequestRepository.accept(id, data);
  },

  async decline(id: string, providerId: string, input: DeclineServiceRequestInput) {
    const data = declineServiceRequestSchema.parse(input);
    const request = await serviceRequestRepository.findById(id);
    if (!request) throw { statusCode: 404, message: 'Request not found' };
    if (request.providerId !== providerId) throw { statusCode: 403, message: 'Request does not belong to this provider' };
    if (request.status !== 'pending') throw { statusCode: 409, message: `Request is already ${request.status}` };
    return serviceRequestRepository.decline(id, data);
  },
};
