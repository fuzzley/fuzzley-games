import { HeldKeys, type ShortcutModifiers, isShortcut } from "./keys";

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

/** Names what the keys of the specs below steer. */
type Way = "left" | "right" | "fire";

/** What each key of the specs below steers, by `event.code`, two to a way as a game's arrows and letters are. */
const WAYS: Readonly<Record<string, Way>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "fire",
};

/** Returns keys held with none held yet, steering as `WAYS` says. */
function heldKeys(): HeldKeys<Way> {
  return new HeldKeys((code) => WAYS[code] ?? null);
}

/** Returns keys held after each code given is pressed in turn. */
function pressed(...codes: string[]): HeldKeys<Way> {
  const keys = heldKeys();
  for (const code of codes) keys.press(code);
  return keys;
}

describe("HeldKeys", () => {
  it("holds nothing before a key is pressed", () => {
    const keys = heldKeys();

    expect(keys.isHeld("left")).toBe(false);
    expect(keys.axis("left", "right")).toBe(0);
  });

  it("holds what a key steers while it is held", () => {
    const keys = pressed("Space");

    expect(keys.isHeld("fire")).toBe(true);
    expect(keys.isHeld("left")).toBe(false);
  });

  it("says a press holds a key it didn't hold before", () => {
    const keys = heldKeys();

    expect(keys.press("ArrowLeft")).toBe(true);
  });

  it("says a held key that repeats holds nothing new", () => {
    const keys = pressed("ArrowLeft");

    expect(keys.press("ArrowLeft")).toBe(false);
  });

  it("says a key that steers nothing holds nothing", () => {
    const keys = heldKeys();

    expect(keys.press("KeyQ")).toBe(false);
  });

  it("lets go of what a key steers as the key is let go", () => {
    const keys = pressed("Space");

    keys.release("Space");

    expect(keys.isHeld("fire")).toBe(false);
  });

  it("lets go at one release of a key that repeated", () => {
    const keys = pressed("ArrowLeft", "ArrowLeft");

    keys.release("ArrowLeft");

    expect(keys.isHeld("left")).toBe(false);
  });

  it("keeps a way held while another key for it is held", () => {
    const keys = pressed("ArrowLeft", "KeyA");

    keys.release("ArrowLeft");

    expect(keys.isHeld("left")).toBe(true);
    expect(keys.axis("left", "right")).toBe(-1);
  });

  it("lets go of a way once every key for it is let go", () => {
    const keys = pressed("ArrowLeft", "KeyA");

    keys.release("KeyA");
    keys.release("ArrowLeft");

    expect(keys.isHeld("left")).toBe(false);
  });

  it.each([
    ["for the way held", "KeyA"],
    ["for the other way", "ArrowRight"],
    ["that steers nothing", "KeyQ"],
  ])("changes nothing at the release of a key not held %s", (_, code) => {
    const keys = pressed("ArrowLeft");

    keys.release(code);

    expect(keys.axis("left", "right")).toBe(-1);
  });

  it.each([
    ["ArrowLeft", -1],
    ["KeyD", 1],
  ])("steers the way of %s held alone", (code, way) => {
    const keys = pressed(code);

    expect(keys.axis("left", "right")).toBe(way);
  });

  it.each([
    ["ArrowLeft", "ArrowRight", 1],
    ["ArrowRight", "ArrowLeft", -1],
  ])("steers the way pressed last, %s then %s", (first, last, way) => {
    const keys = pressed(first, last);

    expect(keys.axis("left", "right")).toBe(way);
  });

  it("steers the way still held once the way pressed last is let go", () => {
    const keys = pressed("ArrowLeft", "ArrowRight");

    keys.release("ArrowRight");

    expect(keys.axis("left", "right")).toBe(-1);
  });

  it("steers the way pressed last while another key for it is held", () => {
    const keys = pressed("ArrowLeft", "ArrowRight", "KeyA");

    keys.release("KeyA");

    expect(keys.axis("left", "right")).toBe(-1);
  });

  it("steers the way pressed last though a key held repeats", () => {
    const keys = pressed("ArrowLeft", "ArrowRight", "ArrowLeft");

    expect(keys.axis("left", "right")).toBe(1);
  });

  it("forgets every key held at a let-go", () => {
    const keys = pressed("ArrowLeft", "Space");

    keys.letGo();

    expect(keys.isHeld("left")).toBe(false);
    expect(keys.isHeld("fire")).toBe(false);
  });

  it("holds a key afresh after a let-go", () => {
    const keys = pressed("ArrowLeft");
    keys.letGo();

    const fresh = keys.press("ArrowLeft");

    expect(fresh).toBe(true);
  });

  it("takes no release of a key held before a let-go", () => {
    const keys = pressed("ArrowLeft");
    keys.letGo();
    keys.press("KeyA");

    keys.release("ArrowLeft");

    expect(keys.isHeld("left")).toBe(true);
  });
});
