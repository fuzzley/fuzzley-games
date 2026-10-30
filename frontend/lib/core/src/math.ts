/** Returns a number kept between a least and a most, which it may equal. */
export function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}
