import { commandOfKey, heldKeyOf, steerKeyOf } from "./controls";

describe("commandOfKey", () => {
  it.each([
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
    ["KeyX", "skip"],
    ["KeyR", "read"],
  ])("reads %s as %s", (code, command) => {
    expect(commandOfKey(code)).toBe(command);
  });

  it.each(["ArrowLeft", "Space", "KeyF", "KeyQ", "Tab"])(
    "reads %s as no command",
    (code) => {
      expect(commandOfKey(code)).toBeNull();
    },
  );
});

describe("steerKeyOf", () => {
  it.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
    ["ArrowUp", "up"],
    ["KeyW", "up"],
    ["ArrowDown", "down"],
    ["KeyS", "down"],
    ["Space", "release"],
  ])("reads %s as a key that does %s to the shot", (code, key) => {
    expect(steerKeyOf(code)).toBe(key);
  });

  it.each(["Escape", "KeyF", "KeyX", "KeyQ", "ShiftLeft"])(
    "reads %s as doing nothing to the shot",
    (code) => {
      expect(steerKeyOf(code)).toBeNull();
    },
  );
});

describe("heldKeyOf", () => {
  it("reads F held as fast-forward", () => {
    expect(heldKeyOf("KeyF")).toBe("fast");
  });

  it.each(["Space", "KeyX", "ArrowUp"])(
    "reads %s as holding nothing",
    (code) => {
      expect(heldKeyOf(code)).toBeNull();
    },
  );
});
