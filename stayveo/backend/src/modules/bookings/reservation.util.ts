import { randomBytes } from 'node:crypto';

const randomSuffix = () => randomBytes(4).toString('hex').toUpperCase();

/** Builds the externally visible, globally unique reservation identifier. */
export function createReservationId(propertyId: string, bookingDate: Date): string {
  const propertyCode = `PG${propertyId.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'PROPERTY'}`;
  const date = bookingDate.toISOString().slice(0, 10).replaceAll('-', '');
  return `${propertyCode}-${date}-${randomSuffix()}`;
}
