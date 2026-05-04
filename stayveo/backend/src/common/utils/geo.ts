// ─── Geo Utilities ──────────────────────────────────────────────────────
// Haversine formula for distance-based filtering
// ────────────────────────────────────────────────────────────────────────

/**
 * Calculate the distance between two coordinates using Haversine formula.
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Build a raw SQL WHERE clause for radius-based filtering.
 * Uses the Haversine formula directly in PostgreSQL.
 * Returns the SQL fragment and parameter values.
 */
export function buildGeoFilterSQL(
  latColumn: string,
  lonColumn: string,
  centerLat: number,
  centerLon: number,
  radiusKm: number
): { sql: string; params: number[] } {
  // Haversine in SQL: 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) + sin(radians(lat1)) * sin(radians(lat2)))
  const sql = `(
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians($1)) * cos(radians(${latColumn})) *
        cos(radians(${lonColumn}) - radians($2)) +
        sin(radians($1)) * sin(radians(${latColumn}))
      ))
    )
  ) <= $3`;

  return { sql, params: [centerLat, centerLon, radiusKm] };
}
