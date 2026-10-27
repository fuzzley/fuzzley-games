import { type BoardKey, type KeyPress, boardKey } from "./board_keys";

/** Returns a key press with no modifier held, but for those given. */
function press(
  code: string,
  key: string,
  held: Partial<KeyPress> = {},
): KeyPress {
  return {
    code,
    key,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...held,
  };
}

const SIX: BoardKey = { kind: "digit", digit: 6, note: false };
const NOTE_SIX: BoardKey = { kind: "digit", digit: 6, note: true };
const ERASE: BoardKey = { kind: "erase" };

describe("boardKey", () => {
  it.each<[string, KeyPress, BoardKey | null]>([
    ["a digit on the top row", press("Digit6", "6"), SIX],
    ["the top row of an AZERTY keyboard", press("Digit6", "-"), SIX],
    ["a digit with Shift", press("Digit6", "^", { shiftKey: true }), NOTE_SIX],
    ["the number pad", press("Numpad6", "6"), SIX],
    [
      "the number pad's key that moves with Shift",
      press("Numpad6", "ArrowRight", { shiftKey: true }),
      null,
    ],
    ["Backspace", press("Backspace", "Backspace"), ERASE],
    ["Delete", press("Delete", "Delete"), ERASE],
    ["0 on the top row", press("Digit0", "0"), ERASE],
    ["0 on the number pad", press("Numpad0", "0"), ERASE],
    ["Enter", press("Enter", "Enter"), { kind: "enter" }],
    ["N", press("KeyN", "n"), { kind: "notes" }],
    ["N with Shift", press("KeyN", "N", { shiftKey: true }), { kind: "notes" }],
    ["H", press("KeyH", "h"), { kind: "hint" }],
    ["H where the layout puts it", press("KeyJ", "h"), { kind: "hint" }],
    ["a digit with Ctrl", press("Digit6", "6", { ctrlKey: true }), null],
    ["a digit with Alt", press("Digit6", "6", { altKey: true }), null],
    ["a digit with Meta", press("Digit6", "6", { metaKey: true }), null],
    ["an arrow", press("ArrowUp", "ArrowUp"), null],
    ["another letter", press("KeyQ", "q"), null],
  ])("reads %s", (_, keyPress, expected) => {
    expect(boardKey(keyPress)).toEqual(expected);
  });
});
