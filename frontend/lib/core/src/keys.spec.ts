import { type ShortcutModifiers, isShortcut } from "./keys";

/** Returns a press with only the modifiers given held. */
function press(held: Partial<ShortcutModifiers>): ShortcutModifiers {
  return { ctrlKey: false, altKey: false, metaKey: false, ...held };
}

describe("isShortcut", () => {
  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Alt", { altKey: true }],
    ["Meta", { metaKey: true }],
    ["Ctrl and Alt", { ctrlKey: true, altKey: true }],
  ])("says a key pressed with %s is a shortcut", (_, held) => {
    expect(isShortcut(press(held))).toBe(true);
  });

  it("says a key pressed with none held is none", () => {
    expect(isShortcut(press({}))).toBe(false);
  });

  it("says a key pressed with Shift alone is none", () => {
    const withShift = { ...press({}), shiftKey: true };

    expect(isShortcut(withShift)).toBe(false);
  });
});
