import { commandOfKey } from "./controls";

describe("commandOfKey", () => {
  it.each([
    ["KeyF", "fast"],
    ["KeyX", "skip"],
    ["KeyG", "readGuide"],
    ["KeyR", "readRows"],
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
  ])("reads %s as %s", (code, command) => {
    expect(commandOfKey(code)).toBe(command);
  });

  it.each(["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyQ", "Tab"])(
    "reads %s as no command",
    (code) => {
      expect(commandOfKey(code)).toBeNull();
    },
  );
});
