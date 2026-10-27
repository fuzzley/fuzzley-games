/** Returns a count with its noun, such as "1 hint" or "2 hints". */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
