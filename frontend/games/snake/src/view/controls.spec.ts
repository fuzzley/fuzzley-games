import { BOARD_KEYS, SwipeReader, commandOfKey } from "./controls";

describe("commandOfKey", () => {
  it.each([
    ["ArrowUp", "up"],
    ["KeyW", "up"],
    ["ArrowRight", "right"],
    ["KeyD", "right"],
    ["ArrowDown", "down"],
    ["KeyS", "down"],
    ["ArrowLeft", "left"],
    ["KeyA", "left"],
    ["Escape", "pause"],
    ["KeyP", "toggle"],
    ["Space", "toggle"],
    ["Enter", "go"],
    ["NumpadEnter", "go"],
  ])("reads %s as %s", (code, command) => {
    expect(commandOfKey(code)).toBe(command);
  });

  it("ignores a key it doesn't answer", () => {
    expect(commandOfKey("KeyQ")).toBeNull();
  });

  it("lists every key it answers", () => {
    expect(BOARD_KEYS).toHaveLength(13);
  });
});

describe("SwipeReader", () => {
  it("turns nothing before the finger has moved far enough", () => {
    const reader = new SwipeReader();
    reader.start(100, 100);

    expect(reader.move(110, 105, 24)).toBeNull();
  });

  it.each([
    [130, 104, "right"],
    [70, 96, "left"],
    [104, 130, "down"],
    [96, 70, "up"],
  ] as const)("turns along the axis moved most (%i, %i)", (x, y, way) => {
    const reader = new SwipeReader();
    reader.start(100, 100);

    expect(reader.move(x, y, 24)).toBe(way);
  });

  it("measures again from a turn, so one gesture turns twice", () => {
    const reader = new SwipeReader();
    reader.start(100, 100);
    reader.move(130, 100, 24);

    expect([reader.move(140, 100, 24), reader.move(140, 130, 24)]).toEqual([
      null,
      "down",
    ]);
  });

  it("turns nothing once the gesture has ended", () => {
    const reader = new SwipeReader();
    reader.start(100, 100);
    reader.end();

    expect(reader.move(200, 100, 24)).toBeNull();
  });

  it("turns nothing before a gesture starts", () => {
    expect(new SwipeReader().move(200, 100, 24)).toBeNull();
  });
});
