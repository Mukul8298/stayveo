const EARTH_RADIUS_KM = 6371.0088;

function toValidCoordinate(value: unknown, min: number, max: number): number | null {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    return null;
  }
  return numberValue;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistanceKm(
  sourceLat: unknown,
  sourceLng: unknown,
  destinationLat: unknown,
  destinationLng: unknown
): number | null {
  const lat1 = toValidCoordinate(sourceLat, -90, 90);
  const lng1 = toValidCoordinate(sourceLng, -180, 180);
  const lat2 = toValidCoordinate(destinationLat, -90, 90);
  const lng2 = toValidCoordinate(destinationLng, -180, 180);

  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
    return null;
  }

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(
  distanceKm: number | null | undefined,
  { unavailable = 'Distance unavailable' } = {}
): string {
  if (!Number.isFinite(distanceKm)) return unavailable;
  if ((distanceKm as number) < 1) return `${Math.round((distanceKm as number) * 1000)}m`;
  return `${(distanceKm as number).toFixed(1)}km`;
}

export default function calculateDistance(
  sourceLat: unknown,
  sourceLng: unknown,
  destinationLat: unknown,
  destinationLng: unknown
): string {
  const distanceKm = calculateDistanceKm(sourceLat, sourceLng, destinationLat, destinationLng);
  return formatDistance(distanceKm);
}
