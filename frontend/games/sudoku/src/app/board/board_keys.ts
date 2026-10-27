/** Says what a key pressed on a square asks the game to do. */
export type BoardKey =
  /** Places a digit, or with `note` adds or takes away a note. */
  | { readonly kind: "digit"; readonly digit: number; readonly note: boolean }
  | { readonly kind: "erase" }
  /** Turns Notes mode on or off. */
  | { readonly kind: "notes" }
  /** Shows a hint, or fills in the one showing. */
  | { readonly kind: "hint" }
  /** Fills in the hint showing, if it is on the selected square. */
  | { readonly kind: "enter" };

/** Holds what a key's meaning depends on, as a `KeyboardEvent` has it. */
export type KeyPress = Pick<
  KeyboardEvent,
  "code" | "key" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey"
>;

/** The digit keys, by the key's code: the top row and the number pad. */
const DIGIT_CODE = /^(Digit|Numpad)([1-9])$/;

/** The keys that erase, by the key's code. */
const ERASE_CODES: ReadonlySet<string> = new Set([
  "Backspace",
  "Delete",
  "Digit0",
  "Numpad0",
]);

/**
 * Returns what a key pressed on a square asks for, or null for a key the
 * board leaves alone, such as an arrow or one held with Ctrl, Alt or Meta.
 *
 * Digit keys are read by the key's code, not its character, so the top row
 * of an AZERTY keyboard places a digit without Shift, and Shift adds a note
 * on every layout; N and H are read by their character, as the layout
 * labels them.
 */
export function boardKey(press: KeyPress): BoardKey | null {
  if (press.ctrlKey || press.metaKey || press.altKey) return null;
  const digit = digitOf(press);
  if (digit !== null) return { kind: "digit", digit, note: press.shiftKey };
  if (ERASE_CODES.has(press.code)) return { kind: "erase" };
  if (press.code === "Enter") return { kind: "enter" };
  switch (press.key.toLowerCase()) {
    case "n":
      return { kind: "notes" };
    case "h":
      return { kind: "hint" };
    default:
      return null;
  }
}

/**
 * Returns the digit a key stands for, or null. A number pad's key counts
 * only while it types its digit: with Shift, Windows makes it a key that
 * moves, such as End.
 */
function digitOf({ code, key }: KeyPress): number | null {
  const match = DIGIT_CODE.exec(code);
  if (!match) return null;
  const [, row, digit] = match;
  if (row === "Numpad" && key !== digit) return null;
  return Number(digit);
}
