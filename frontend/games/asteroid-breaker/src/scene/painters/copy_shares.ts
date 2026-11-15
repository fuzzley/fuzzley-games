/**
 * Each copy of a thing drawn about a place, as shares of the way across and
 * down to the copies past the edges it reaches across, which
 * `copyOffsets()` gives: itself, across, down and both; a share of an
 * offset of 0 is no copy.
 */
export const COPY_SHARES = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;
