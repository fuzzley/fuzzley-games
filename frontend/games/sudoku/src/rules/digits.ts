// Sets of the digits 1 to 9, as nine bits: 1 is the lowest bit, 9 the highest.
// A square's notes and its candidates are sets.

/** The digits a square can hold, in order. */
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Every digit, 1 to 9. */
export const ALL_DIGITS = 0x1ff;

/** Returns the set holding one digit. */
export function bit(digit: number): number {
  return 1 << (digit - 1);
}

/** Returns whether a set holds a digit. */
export function has(set: number, digit: number): boolean {
  return (set & bit(digit)) !== 0;
}

/** Returns how many digits a set holds. */
export function size(set: number): number {
  let n = 0;
  for (let rest = set; rest !== 0; rest &= rest - 1) n++;
  return n;
}

/** Returns a set's digits, smallest first. */
export function digitsIn(set: number): number[] {
  return DIGITS.filter((digit) => has(set, digit));
}

/** Returns the set holding the digits given. */
export function setOf(digits: Iterable<number>): number {
  let set = 0;
  for (const digit of digits) set |= bit(digit);
  return set;
}

/** Returns the smallest digit in a set, or 0 for an empty one. */
export function firstDigit(set: number): number {
  return set === 0 ? 0 : 32 - Math.clz32(set & -set);
}

/** Returns whether a value is a set of digits: a whole number of nine bits. */
export function isDigitSet(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= ALL_DIGITS
  );
}
