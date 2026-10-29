import { FIELD_KEYS, commandOfKey, heldKeyOf } from "./controls";

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
  ])("reads %s held as a push %s", (code, key) => {
    expect(heldKeyOf(code)).toBe(key);
  });

  it.each(["Space", "KeyQ", "ArrowDown"])("reads %s as no push", (code) => {
    expect(heldKeyOf(code)).toBeNull();
  });
});

describe("FIELD_KEYS", () => {
  it("lists every key the field answers, and no other", () => {
    const answered = FIELD_KEYS.filter(
      (code) => commandOfKey(code) !== null || heldKeyOf(code) !== null,
    );

    expect({ answered, unique: new Set(FIELD_KEYS).size }).toEqual({
      answered: FIELD_KEYS,
      unique: 11,
    });
  });
});
