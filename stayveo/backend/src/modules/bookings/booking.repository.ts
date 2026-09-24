// ─── Booking Repository ─────────────────────────────────────────────────
// Handles all Prisma queries for bookings table.
// ────────────────────────────────────────────────────────────────────────

import prisma from '../../common/db/prisma.js';
import { BookingStatus, PaymentStatus, PaymentType } from '@prisma/client';
import type { CreateBookingInput, BookingFilterInput } from './booking.schema.js';
import type { CreatePaymentInput } from '../payments/payment.schema.js';
import { createReservationId } from './reservation.util.js';

const TYPE_MAP: Record<string, PaymentType> = {
  rent: 'RENT',
  reservation: 'RESERVATION',
  tiffin: 'TIFFIN',
};

const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  paid: 'PAID',
  success: 'PAID',
  captured: 'PAID',
  completed: 'PAID',
  pending: 'PENDING',
  processing: 'PENDING',
  failed: 'FAILED',
};

// Map lowercase status strings to Prisma enum values
const STATUS_MAP: Record<string, BookingStatus> = {
  new: 'NEW',
  accepted: 'ACCEPTED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  rejected: 'REJECTED',
};

export const bookingRepository = {
  async hydrate(items: any[]) {
    if (!items.length) return items;

    const userIds = [...new Set(items.map((item) => item.userId).filter(Boolean))];
    const providerIds = [...new Set(items.map((item) => item.providerId).filter(Boolean))];
    const roomIds = [...new Set(items.map((item) => item.roomId).filter(Boolean))];

    const [users, providerProfiles, legacyProviders, roomListings, pgDetails] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          phone_number: true,
          studentProfile: { select: { fullName: true, profileImageUrl: true } },
        },
      }),
      prisma.providerProfile.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, userId: true, name: true, email: true, phone: true, contactNumber: true, businessName: true, address: true },
      }),
      prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, userId: true, name: true, businessName: true, phone_number: true, location: true },
      }),
      prisma.roomListing.findMany({
        where: { id: { in: roomIds } },
        select: {
          id: true, title: true, address: true, roomType: true, price: true,
          securityDeposit: true, minimumStayMonths: true, totalBeds: true,
          availableBeds: true, reservedBeds: true, occupiedBeds: true, images: true,
        },
      }),
      prisma.pGDetails.findMany({
        where: { id: { in: roomIds } },
        select: {
          id: true, pgName: true, address: true, roomType: true, minPrice: true,
          securityDeposit: true, reservationFee: true, minimumStayMonths: true,
          numberOfBeds: true, photos: true,
        },
      }),
    ]);

    const userById = new Map(users.map((user) => [user.id, user]));
    const providerById = new Map<string, any>();
    providerProfiles.forEach((provider) => providerById.set(provider.id, provider));
    legacyProviders.forEach((provider) => providerById.set(provider.id, provider));
    const roomById = new Map<string, any>();
    roomListings.forEach((room) => roomById.set(room.id, room));
    const pgById = new Map<string, any>();
    pgDetails.forEach((room) => pgById.set(room.id, room));

    return items.map((booking) => {
      const user = userById.get(booking.userId);
      const provider = providerById.get(booking.providerId);
      const room = roomById.get(booking.roomId);
      const legacyRoom = pgById.get(booking.roomId);
      const payments = Array.isArray(booking.payments) ? booking.payments : [];
      const paidPayment = payments.find((payment: any) => payment.status === 'PAID');
      const latestPayment = payments[0] || null;
      const property = room
        ? {
            id: room.id,
            name: room.title,
            address: room.address,
            image: room.images?.[0] || null,
            totalBeds: room.totalBeds,
            availableBeds: room.availableBeds,
            reservedBeds: room.reservedBeds,
            occupiedBeds: room.occupiedBeds,
          }
        : legacyRoom
          ? {
              id: legacyRoom.id,
              name: legacyRoom.pgName,
              address: legacyRoom.address,
              image: legacyRoom.photos?.[0] || null,
              totalBeds: legacyRoom.numberOfBeds,
              availableBeds: null,
              reservedBeds: null,
              occupiedBeds: null,
            }
          : null;

      return {
        ...booking,
        student: {
          id: user?.id || booking.userId,
          name: user?.studentProfile?.fullName || booking.studentName || 'Student',
          email: null,
          phone: booking.studentPhone || user?.phone_number || null,
          image: user?.studentProfile?.profileImageUrl || null,
        },
        provider: provider
          ? {
              id: provider.id,
              name: provider.name || provider.businessName || 'Provider',
              email: 'email' in provider ? provider.email : null,
              phone: 'phone' in provider ? provider.phone : provider.phone_number,
              address: 'address' in provider ? provider.address : provider.location,
            }
          : null,
        property,
        room: room
          ? { id: room.id, type: room.roomType, rent: room.price }
          : legacyRoom
            ? { id: legacyRoom.id, type: legacyRoom.roomType, rent: legacyRoom.minPrice }
            : { id: booking.roomId, type: booking.roomType, rent: booking.monthlyRent },
        payment: paidPayment || latestPayment,
        paymentStatus: paidPayment?.status || latestPayment?.status || 'PENDING',
        amountPaid: paidPayment?.amount || 0,
        transactionId: paidPayment?.transactionId || latestPayment?.transactionId || null,
        paymentDate: paidPayment?.createdAt || latestPayment?.createdAt || null,
      };
    });
  },

  /** Create a new booking */
  async create(userId: string, data: CreateBookingInput) {
    if (data.room_id) {
      const roomListing = await prisma.roomListing.findUnique({
        where: { id: data.room_id },
        select: { providerId: true, availableBeds: true },
      });
      if (roomListing) {
        if (roomListing.providerId !== data.provider_id) {
          throw { statusCode: 403, message: 'This room does not belong to the selected provider' };
        }
        if (roomListing.availableBeds < (data.number_of_beds ?? 1)) {
          throw { statusCode: 409, message: 'No beds are currently available for this listing' };
        }
      } else {
        const legacyRoom = await prisma.pGDetails.findUnique({
          where: { id: data.room_id },
          include: { service: { select: { providerId: true } } },
        });
        if (!legacyRoom) throw { statusCode: 404, message: 'Room listing not found' };
        if (legacyRoom.service.providerId !== data.provider_id) {
          throw { statusCode: 403, message: 'This room does not belong to the selected provider' };
        }
      }
    }

    return prisma.booking.create({
      data: {
        userId,
        providerId: data.provider_id,
        roomId: data.room_id,
        serviceType: data.service_type,
        roomType: data.room_type,
        status: 'NEW',
        bookingDate: new Date(data.booking_date),
        bookingTime: data.booking_time,
        price: data.price,
        monthlyRent: data.monthly_rent ?? 0,
        securityDeposit: data.security_deposit ?? 0,
        reservationFee: data.reservation_fee ?? data.price,
        platformFee: data.platform_fee ?? 0,
        minimumStayMonths: data.minimum_stay_months ?? 1,
        numberOfBeds: data.number_of_beds ?? 1,
        foodCharges: data.food_charges ?? 0,
        electricityCharges: data.electricity_charges ?? 0,
        waterCharges: data.water_charges ?? 0,
        maintenanceCharges: data.maintenance_charges ?? 0,
        parkingCharges: data.parking_charges ?? 0,
        otherCharges: data.other_charges ?? 0,
        moveInDate: data.move_in_date ? new Date(data.move_in_date) : null,
        studentName: data.student_name,
        studentPhone: data.student_phone,
        notes: data.notes,
      },
    });
  },

  /** Find booking by ID */
  async findById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { visitRequests: true, payments: true, receipt: true },
    });
    return booking ? (await bookingRepository.hydrate([booking]))[0] : null;
  },

  /** List bookings for a provider with optional status filter */
  async findByProvider(providerId: string | string[], filters: BookingFilterInput) {
    const where: any = { providerId: Array.isArray(providerId) ? { in: providerId } : providerId };
    if (filters.status) {
      where.status = STATUS_MAP[filters.status] || filters.status;
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: { visitRequests: true, payments: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      items: await bookingRepository.hydrate(items),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  /** List bookings for a student */
  async findByUser(userId: string, filters: BookingFilterInput) {
    const where: any = { userId };
    if (filters.status) {
      where.status = STATUS_MAP[filters.status] || filters.status;
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      items: await bookingRepository.hydrate(items),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  /** Update booking status */
  async updateStatus(id: string, status: string) {
    const prismaStatus = STATUS_MAP[status] || status;
    return prisma.booking.update({
      where: { id },
      data: { status: prismaStatus as BookingStatus },
    });
  },

  async assignReservationId(id: string, reservationId: string) {
    return prisma.booking.update({ where: { id }, data: { reservationId } });
  },

  /**
   * Payment + reservation ID + inventory decrement in one database
   * transaction. The conditional update is the concurrency guard for the
   * last available bed.
   */
  async createReservationPayment(data: CreatePaymentInput) {
    return prisma.$transaction(async (tx) => {
      if (!data.booking_id) throw { statusCode: 400, message: 'A booking is required for a reservation payment' };

      const booking = await tx.booking.findUnique({
        where: { id: data.booking_id },
        include: { payments: true },
      });
      if (!booking) throw { statusCode: 404, message: 'Booking not found' };
      if (booking.userId !== data.user_id || booking.providerId !== data.provider_id) {
        throw { statusCode: 403, message: 'Payment does not belong to this booking' };
      }
      if (booking.payments.some((payment) => payment.status === 'PAID')) {
        throw { statusCode: 409, message: 'This booking has already been paid' };
      }

      const payment = await tx.payment.create({
        data: {
          bookingId: data.booking_id,
          userId: data.user_id,
          providerId: data.provider_id,
          amount: data.amount,
          type: TYPE_MAP[data.type] || data.type as PaymentType,
          status: PAYMENT_STATUS_MAP[data.status || 'pending'] || 'PENDING',
          paymentMethod: data.payment_method,
          transactionId: data.transaction_id,
        },
      });

      let reservationId = booking.reservationId;
      if (!reservationId) {
        const candidate = createReservationId(booking.roomId || booking.id, booking.bookingDate);
        const updated = await tx.booking.update({ where: { id: booking.id }, data: { reservationId: candidate } });
        reservationId = updated.reservationId;
      }

      if (booking.roomId) {
        const roomListing = await tx.roomListing.findUnique({
          where: { id: booking.roomId },
          select: { id: true, providerId: true, availableBeds: true, isActive: true },
        });

        if (roomListing) {
          const quantity = booking.numberOfBeds || 1;
          const updated = await tx.roomListing.updateMany({
            where: {
              id: roomListing.id,
              providerId: booking.providerId,
              availableBeds: { gte: quantity },
            },
            data: {
              availableBeds: { decrement: quantity },
              reservedBeds: { increment: quantity },
            },
          });
          if (updated.count !== 1) {
            throw { statusCode: 409, message: 'The last available bed was just reserved by another student' };
          }
          await tx.roomListing.update({
            where: { id: roomListing.id },
            data: { status: roomListing.isActive && roomListing.availableBeds - quantity > 0 ? 'ACTIVE' : roomListing.isActive ? 'FULL' : 'CLOSED' },
          });
        }
      }

      const updatedBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });
      return { payment, booking: updatedBooking, reservationId };
    });
  },

  /** Count bookings for a provider (for dashboard stats) */
  async countByProvider(providerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [total, newCount, acceptedCount, inProgressCount, completedCount, monthlyRevenue] = await Promise.all([
      prisma.booking.count({ where: { providerId } }),
      prisma.booking.count({ where: { providerId, status: 'NEW' } }),
      prisma.booking.count({ where: { providerId, status: 'ACCEPTED' } }),
      prisma.booking.count({ where: { providerId, status: 'IN_PROGRESS' } }),
      prisma.booking.count({ where: { providerId, status: 'COMPLETED' } }),
      prisma.booking.aggregate({
        where: {
          providerId,
          status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: {
          reservationFee: true,
          platformFee: true,
          foodCharges: true,
          electricityCharges: true,
          waterCharges: true,
          maintenanceCharges: true,
          parkingCharges: true,
          otherCharges: true,
        },
      }),
    ]);

    const monthlyRevenueTotal = [
      monthlyRevenue?._sum?.reservationFee ?? 0,
      monthlyRevenue?._sum?.platformFee ?? 0,
      monthlyRevenue?._sum?.foodCharges ?? 0,
      monthlyRevenue?._sum?.electricityCharges ?? 0,
      monthlyRevenue?._sum?.waterCharges ?? 0,
      monthlyRevenue?._sum?.maintenanceCharges ?? 0,
      monthlyRevenue?._sum?.parkingCharges ?? 0,
      monthlyRevenue?._sum?.otherCharges ?? 0,
    ].reduce<number>((sum, amount) => {
      const numericAmount = Number(amount ?? 0);
      return sum + (Number.isFinite(numericAmount) ? numericAmount : 0);
    }, 0);
    const confirmedCount = acceptedCount + inProgressCount + completedCount;

    return {
      total,
      new: newCount,
      accepted: acceptedCount,
      confirmed: confirmedCount,
      in_progress: inProgressCount,
      completed: completedCount,
      thisMonthRevenue: Number.isFinite(monthlyRevenueTotal) ? monthlyRevenueTotal : 0,
    };
  },

  async countSummaryByProvider(providerId: string | string[]) {
    const where = { providerId: Array.isArray(providerId) ? { in: providerId } : providerId };
    const [total, newCount, acceptedCount, inProgressCount, completedCount] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: 'NEW' } }),
      prisma.booking.count({ where: { ...where, status: 'ACCEPTED' } }),
      prisma.booking.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.booking.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);
    return {
      total,
      new: newCount,
      accepted: acceptedCount,
      confirmed: acceptedCount + inProgressCount + completedCount,
      in_progress: inProgressCount,
      completed: completedCount,
    };
  },

  async monthlyRevenueByProvider(providerId: string | string[]) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const result = await prisma.booking.aggregate({
      where: {
        providerId: Array.isArray(providerId) ? { in: providerId } : providerId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
        createdAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
      _sum: {
        reservationFee: true,
        platformFee: true,
        foodCharges: true,
        electricityCharges: true,
        waterCharges: true,
        maintenanceCharges: true,
        parkingCharges: true,
        otherCharges: true,
      },
    });
    return [
      result._sum.reservationFee,
      result._sum.platformFee,
      result._sum.foodCharges,
      result._sum.electricityCharges,
      result._sum.waterCharges,
      result._sum.maintenanceCharges,
      result._sum.parkingCharges,
      result._sum.otherCharges,
    ].reduce((sum, amount) => sum + Number(amount || 0), 0);
  },
};
