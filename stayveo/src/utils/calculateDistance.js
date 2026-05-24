const EARTH_RADIUS_KM = 6371.0088;

function toValidCoordinate(value, min, max) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    return null;
  }
  return numberValue;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

export function calculateDistanceKm(collegeLat, collegeLng, pgLat, pgLng) {
  const lat1 = toValidCoordinate(collegeLat, -90, 90);
  const lng1 = toValidCoordinate(collegeLng, -180, 180);
  const lat2 = toValidCoordinate(pgLat, -90, 90);
  const lng2 = toValidCoordinate(pgLng, -180, 180);

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

export function formatDistance(distanceKm, { unavailable = 'Distance unavailable' } = {}) {
  if (!Number.isFinite(distanceKm)) return unavailable;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  return `${distanceKm.toFixed(1)}km`;
}

export default function calculateDistance(collegeLat, collegeLng, pgLat, pgLng) {
  const distanceKm = calculateDistanceKm(collegeLat, collegeLng, pgLat, pgLng);
  return formatDistance(distanceKm, { unavailable: '-- km' });
}
