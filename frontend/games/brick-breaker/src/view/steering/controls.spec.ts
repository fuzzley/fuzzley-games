import { commandOfKey, heldKeyOf } from "./controls";

describe("commandOfKey", () => {
  it.each([
    ["Space", "launch"],
    ["ArrowUp", "launch"],
    ["KeyW", "launch"],
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
  ])("reads %s as %s", (code, command) => {
    expect(commandOfKey(code)).toBe(command);
  });

  it.each(["ArrowLeft", "KeyQ", "Tab"])("reads %s as no command", (code) => {
    expect(commandOfKey(code)).toBeNull();
  });
});

describe("heldKeyOf", () => {
  it.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
    ["ShiftLeft", "fine"],
    ["ShiftRight", "fine"],
  ])("reads %s held as %s", (code, key) => {
    expect(heldKeyOf(code)).toBe(key);
  });

  it.each(["Space", "KeyQ", "ArrowDown"])(
    "reads %s as held to steer nothing",
    (code) => {
      expect(heldKeyOf(code)).toBeNull();
    },
  );
});
