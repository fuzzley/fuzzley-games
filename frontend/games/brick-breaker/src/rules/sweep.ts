// The first moment a moving circle touches a shape, as a share of its move:
// 0 where it already touches as it starts, 1 where it touches as it ends,
// and Infinity where it doesn't touch it on the way. A ball is swept this
// way, rather than tested for overlaps once a step, so however fast it goes
// it can't pass through a brick or turn twice off one.

/** Says that a circle doesn't touch a shape on its way. */
export const MISSED = Number.POSITIVE_INFINITY;

/**
 * Returns when a circle of radius `r`, its center moving from (`x`, `y`) by
 * (`dx`, `dy`), first touches a segment that runs along one axis, from
 * `from` to `to` on the other, facing the side its normal (`nx`, `ny`)
 * points to: the normal is (1, 0), (-1, 0), (0, 1) or (0, -1).
 *
 * Only a circle moving toward the segment's face touches it, so one leaving
 * it, or sliding along it, never does. One already a little through the
 * face, by less than its radius, touches it at once.
 */
export function sweepSegment(
  x: number,
  y: number,
  dx: number,
  dy: number,
  r: number,
  line: number,
  from: number,
  to: number,
  nx: number,
  ny: number,
): number {
  const toward = dx * nx + dy * ny;
  if (toward >= 0) return MISSED;
  // The center's distance in front of the face, less the radius.
  const gap = (nx !== 0 ? (x - line) * nx : (y - line) * ny) - r;
  if (gap < -r) return MISSED;
  const t = gap <= 0 ? 0 : gap / -toward;
  if (t > 1) return MISSED;
  const along = nx !== 0 ? y + dy * t : x + dx * t;
  return along >= from && along <= to ? t : MISSED;
}

/**
 * Returns when a circle of radius `r`, its center moving from (`x`, `y`) by
 * (`dx`, `dy`), first touches a point (`px`, `py`), such as a brick's
 * corner: when its center comes within `r` of the point. Only a circle
 * moving toward the point touches it, and one already over it touches it at
 * once.
 */
export function sweepPoint(
  x: number,
  y: number,
  dx: number,
  dy: number,
  r: number,
  px: number,
  py: number,
): number {
  const ox = x - px;
  const oy = y - py;
  const approach = ox * dx + oy * dy;
  if (approach >= 0) return MISSED;
  const outside = ox * ox + oy * oy - r * r;
  if (outside <= 0) return 0;
  const length = dx * dx + dy * dy;
  const reach = approach * approach - length * outside;
  if (reach < 0) return MISSED;
  const t = (-approach - Math.sqrt(reach)) / length;
  return t <= 1 ? t : MISSED;
}
