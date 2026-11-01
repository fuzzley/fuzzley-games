import { commandOfKey, heldKeyOf } from "./controls";

describe("commandOfKey", () => {
  it.each([
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
  ])("reads %s as %s", (code, command) => {
    expect(commandOfKey(code)).toBe(command);
  });

  it.each(["Space", "ArrowUp", "KeyQ", "Tab"])(
    "reads %s as no command",
    (code) => {
      expect(commandOfKey(code)).toBeNull();
    },
  );
});

describe("heldKeyOf", () => {
  it.each([
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
    ["ArrowUp", "thrust"],
    ["KeyW", "thrust"],
    ["Space", "fire"],
    ["ShiftLeft", "dash"],
    ["ShiftRight", "dash"],
    ["ArrowDown", "dash"],
    ["KeyS", "dash"],
  ])("reads %s held as %s", (code, key) => {
    expect(heldKeyOf(code)).toBe(key);
  });

  it.each(["Enter", "KeyP", "KeyQ", "KeyZ"])(
    "reads %s as no flight",
    (code) => {
      expect(heldKeyOf(code)).toBeNull();
    },
  );
});
