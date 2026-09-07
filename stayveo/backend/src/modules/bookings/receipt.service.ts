import prisma from '../../common/db/prisma.js';

const money = (value: unknown) => Number(value || 0);

function createQrDataUri(value: string) {
  const encoded = encodeURIComponent(value);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="white"/><rect x="12" y="12" width="48" height="48" fill="#111827"/><rect x="20" y="20" width="32" height="32" fill="white"/><rect x="28" y="28" width="16" height="16" fill="#111827"/><rect x="120" y="12" width="48" height="48" fill="#111827"/><rect x="128" y="20" width="32" height="32" fill="white"/><rect x="136" y="28" width="16" height="16" fill="#111827"/><rect x="12" y="120" width="48" height="48" fill="#111827"/><rect x="20" y="128" width="32" height="32" fill="white"/><rect x="28" y="136" width="16" height="16" fill="#111827"/><text x="90" y="96" text-anchor="middle" font-family="monospace" font-size="7" fill="#111827">${encoded.slice(0, 28)}</text><text x="90" y="108" text-anchor="middle" font-family="monospace" font-size="7" fill="#111827">STAYVEO</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const receiptService = {
  async createForSuccessfulPayment(bookingId: string, payment: { id: string; amount: unknown; status: string; paymentMethod?: string | null; transactionId?: string | null }) {
    const existing = await prisma.receipt.findUnique({ where: { bookingId } });
    if (existing) return existing;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking?.reservationId) throw new Error('A reservation ID is required before generating a receipt');

    const [student, provider, room, pgDetails] = await Promise.all([
      prisma.user.findUnique({ where: { id: booking.userId }, include: { studentProfile: true } }),
      prisma.providerProfile.findUnique({ where: { id: booking.providerId } }),
      booking.roomId ? prisma.roomListing.findUnique({ where: { id: booking.roomId } }) : null,
      booking.roomId ? prisma.pGDetails.findUnique({ where: { id: booking.roomId } }) : null,
    ]);

    const totalMonthlyCost = [
      booking.monthlyRent, booking.foodCharges, booking.electricityCharges, booking.waterCharges,
      booking.maintenanceCharges, booking.parkingCharges, booking.otherCharges,
    ].reduce((sum, value) => sum + money(value), 0);
    const totalPaid = money(payment.amount);
    const pendingAmount = Math.max(0, totalMonthlyCost + money(booking.securityDeposit) - totalPaid);
    const generatedAt = new Date();
    const payload = {
      reservationId: booking.reservationId,
      bookingDate: booking.bookingDate.toISOString(),
      propertyName: room?.title || pgDetails?.pgName || 'StayVeo PG',
      propertyAddress: pgDetails?.address || provider?.address || 'Address shared by provider at move-in',
      roomType: booking.roomType || room?.roomType || pgDetails?.roomType || 'Room',
      monthlyRent: money(booking.monthlyRent), securityDeposit: money(booking.securityDeposit),
      reservationFee: money(booking.reservationFee), platformFee: money(booking.platformFee),
      minimumStayMonths: booking.minimumStayMonths, numberOfBeds: booking.numberOfBeds,
      foodCharges: money(booking.foodCharges), electricityCharges: money(booking.electricityCharges),
      waterCharges: money(booking.waterCharges), maintenanceCharges: money(booking.maintenanceCharges),
      parkingCharges: money(booking.parkingCharges), otherCharges: money(booking.otherCharges),
      totalMonthlyCost, totalPaid, pendingAmount,
      moveInDate: booking.moveInDate?.toISOString() || null,
      providerName: provider?.name || provider?.businessName || 'Provider',
      providerContact: provider?.contactNumber || provider?.phone || null,
      studentName: booking.studentName || student?.studentProfile?.fullName || 'Student',
      studentContact: booking.studentPhone || student?.phone_number || null,
      paymentMethod: payment.paymentMethod || 'Online', transactionId: payment.transactionId || payment.id,
      paymentStatus: payment.status, receiptGeneratedTime: generatedAt.toISOString(),
    };
    const qrCode = createQrDataUri(booking.reservationId);

    return prisma.receipt.create({
      data: { bookingId, receiptNumber: `RCPT-${booking.reservationId}`, payload, qrCode, generatedAt },
    });
  },
};
