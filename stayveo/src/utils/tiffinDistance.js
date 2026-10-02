const EARTH_RADIUS_KM = 6371;

function coordinates(latitude, longitude) {
  if (latitude === null || latitude === undefined || latitude === '' || longitude === null || longitude === undefined || longitude === '') return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

export function calculateTiffinDistanceKm(studentLocation, providerLocation) {
  const student = coordinates(studentLocation?.latitude, studentLocation?.longitude);
  const provider = coordinates(providerLocation?.latitude, providerLocation?.longitude);
  if (!student || !provider) return null;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(provider.latitude - student.latitude);
  const longitudeDelta = toRadians(provider.longitude - student.longitude);
  const lat1 = toRadians(student.latitude);
  const lat2 = toRadians(provider.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function tiffinDistanceLabel(studentLocation, providerLocation) {
  if (!coordinates(studentLocation?.latitude, studentLocation?.longitude)) return 'Update your distance from Settings';
  const distance = calculateTiffinDistanceKm(studentLocation, providerLocation);
  return distance === null ? 'Distance unavailable' : `${distance.toFixed(1)} km away`;
}
