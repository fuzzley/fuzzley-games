/**
 * Returns a time in whole seconds as a clock shows it: minutes and seconds,
 * such as "2:13", or hours too past an hour, such as "1:02:13".
 */
export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}
