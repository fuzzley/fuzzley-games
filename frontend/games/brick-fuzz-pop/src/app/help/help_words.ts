// The words How to play counts in where `count()` would read wrong.

/** Returns how many times something happens, in words: "once", "twice", "3 times". */
export function howOften(times: number): string {
  if (times === 1) return "once";
  if (times === 2) return "twice";
  return `${String(times)} times`;
}
