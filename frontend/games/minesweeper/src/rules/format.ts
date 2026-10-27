/** Returns a count with its noun, such as "1 life" or "2 lives". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
