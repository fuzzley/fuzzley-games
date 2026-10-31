/** Returns a count with its noun, such as "1 hint" or "2 hints". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Writes points as a player reads them, with a comma in the thousands: "4,250". */
export function formatPoints(points: number): string {
  return points.toLocaleString("en-US");
}
