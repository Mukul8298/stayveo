import { useMemo } from 'react';
import { calculateDistanceKm, formatDistance } from '../utils/calculateDistance';

function hasUsableCollegeCoordinates(college) {
  return Number.isFinite(Number(college?.latitude)) && Number.isFinite(Number(college?.longitude));
}

export function useNearbyPGs(listings, college) {
  return useMemo(() => {
    const source = Array.isArray(listings) ? listings : [];

    if (!hasUsableCollegeCoordinates(college)) {
      return source.map((listing) => ({
        ...listing,
        distanceKm: null,
        distanceLabel: 'Distance unavailable',
      }));
    }

    const enriched = source.map((listing) => {
      const distanceKm = calculateDistanceKm(
        college.latitude,
        college.longitude,
        listing?.latitude,
        listing?.longitude
      );

      return {
        ...listing,
        distance: distanceKm,
        distanceKm,
        distanceLabel: formatDistance(distanceKm),
      };
    });

    return enriched.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [listings, college?.latitude, college?.longitude]);
}
