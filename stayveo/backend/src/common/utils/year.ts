// ─── Year Mapper Utility ────────────────────────────────────────────────
// Centralised conversion between display-year strings and integers.
// Every layer in the backend should import from here instead of
// duplicating mapping logic.
// ────────────────────────────────────────────────────────────────────────

/**
 * Canonical lookup: lowercase display string → integer.
 * Covers "1st year" through "6th year".
 */
const DISPLAY_TO_INT: Record<string, number> = {
  '1st year': 1,
  '2nd year': 2,
  '3rd year': 3,
  '4th year': 4,
  '5th year': 5,
  '6th year': 6,
};

/** Ordinal suffixes used when converting back to display strings. */
const ORDINAL_SUFFIX: Record<number, string> = {
  1: 'st',
  2: 'nd',
  3: 'rd',
};

/**
 * Convert any year representation into an integer.
 *
 * Accepted inputs:
 *   "1st Year" | "1st year" → 1
 *   "2nd Year" | "2nd year" → 2
 *   "3"                      → 3
 *   3                        → 3
 *   null / undefined          → null
 *
 * Returns `null` for values that cannot be mapped.
 */
export function parseYear(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // Already an integer
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Try display-string lookup ("2nd Year" / "2nd year")
  const fromDisplay = DISPLAY_TO_INT[trimmed.toLowerCase()];
  if (fromDisplay !== undefined) return fromDisplay;

  // Try parsing as a plain numeric string ("3")
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum) && Number.isInteger(asNum) && asNum >= 1) {
    return asNum;
  }

  return null;
}

/**
 * Convert an integer year back to a display string for the frontend.
 *
 * 1 → "1st Year"
 * 2 → "2nd Year"
 * 3 → "3rd Year"
 * 4 → "4th Year"
 * null → null
 */
export function yearToDisplay(year: number | null | undefined): string | null {
  if (year === null || year === undefined) return null;
  const suffix = ORDINAL_SUFFIX[year] ?? 'th';
  return `${year}${suffix} Year`;
}
