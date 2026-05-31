import prisma from '../../common/db/prisma.js';
import type {
  CreateServiceRequestInput,
  ServiceRequestFilterInput,
  AcceptServiceRequestInput,
  DeclineServiceRequestInput,
} from './service-request.schema.js';

const ACTIVE_REQUEST_STATUSES = ['pending', 'accepted'];

export const serviceRequestRepository = {
  async findStudentProfile(studentId: string) {
    return prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        user: { select: { id: true, phone_number: true } },
      },
    });
  },

  async findDuplicate(studentId: string, data: CreateServiceRequestInput) {
    return prisma.laundryRequest.findFirst({
      where: {
        studentId,
        serviceId: data.serviceId,
        serviceType: data.serviceType,
        status: { in: ACTIVE_REQUEST_STATUSES },
      },
    });
  },

  async create(studentId: string, data: CreateServiceRequestInput, distanceKm: number | null, profile: any) {
    return prisma.laundryRequest.create({
      data: {
        studentId,
        providerId: data.providerId,
        providerName: data.providerName?.trim() || null,
        serviceId: data.serviceId,
        serviceType: data.serviceType,
        status: 'pending',
        studentAddress: (data.studentAddress || profile?.currentAddress || '').trim() || null,
        studentLatitude: data.studentLatitude ?? profile?.latitude ?? null,
        studentLongitude: data.studentLongitude ?? profile?.longitude ?? null,
        providerLatitude: data.providerLatitude ?? null,
        providerLongitude: data.providerLongitude ?? null,
        distanceKm,
        studentPhone: (data.studentPhone || profile?.user?.phone_number || '').trim() || null,
        studentName: profile?.fullName || null,
        studentImageUrl: profile?.profileImageUrl || null,
      },
    });
  },

  async findById(id: string) {
    return prisma.laundryRequest.findUnique({ where: { id } });
  },

  async listByProvider(providerId: string, filters: ServiceRequestFilterInput) {
    const where: any = { providerId };
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      prisma.laundryRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.laundryRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async listByStudent(studentId: string, filters: ServiceRequestFilterInput) {
    const where: any = { studentId };
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      prisma.laundryRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.laundryRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async accept(id: string, data: AcceptServiceRequestInput) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.laundryRequest.update({
        where: { id },
        data: {
          status: 'accepted',
          pickupDate: new Date(data.selectedDate),
          pickupTime: data.selectedTime,
          estimatedArrival: data.estimatedArrival?.trim() || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.studentId,
          title: `${request.providerName || 'Provider'} accepted your request`,
          message: `${request.providerName || 'Provider'} accepted your request. Select laundry weight and complete payment.`,
          type: 'service',
          requestId: request.id,
        },
      });

      return request;
    });
  },

  async decline(id: string, data: DeclineServiceRequestInput) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.laundryRequest.update({
        where: { id },
        data: {
          status: 'declined',
          declineReason: data.reason?.trim() || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.studentId,
          title: `${request.providerName || 'Provider'} declined your request`,
          message: 'The provider could not accept this request. You can try another nearby service.',
          type: 'service',
          requestId: request.id,
        },
      });

      return request;
    });
  },
};
