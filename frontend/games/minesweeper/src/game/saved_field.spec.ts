import { fieldFrom } from "../testing/field_picture";
import { PRESETS } from "./difficulty";
import { createField, toggleFlag } from "./field";
import { restoreField, saveField } from "./saved_field";

/** Returns what a stored field becomes once JSON has carried it. */
function throughJson(value: object): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/** Returns a stored game in play, with a change made to it. */
function savedWith(change: Record<string, unknown>): unknown {
  return {
    ...throughJson(saveField(fieldFrom(["x12*.", "f13*.", "__2*."]))),
    ...change,
  };
}

describe("saveField and restoreField", () => {
  it("bring back a game in play as it was", () => {
    const field = fieldFrom(["x12*.", "f13*.", "__2*."]);

    expect(restoreField(throughJson(saveField(field)))).toEqual(field);
  });

  it("bring back a game not yet started, flags and all", () => {
    const field = toggleFlag(createField(PRESETS.easy.size, 2, 99), 5);

    expect(restoreField(throughJson(saveField(field)))).toEqual(field);
  });

  it("bring back a lost game", () => {
    const field = fieldFrom(["x12*.", "f13*.", "__2*."], { livesLeft: 0 });

    expect(restoreField(throughJson(saveField(field)))).toEqual(field);
  });

  it("store a letter a square and the squares the mines lie on", () => {
    const saved = saveField(fieldFrom(["x1.", "11."]));

    expect(saved.squares).toBe("trhrrh");
    expect(saved.mineSquares).toEqual([0]);
  });
});

describe("restoreField", () => {
  it.each([
    ["nothing", null],
    ["a list", []],
    ["a number", 3],
  ])("refuses %s", (_, saved) => {
    expect(restoreField(saved)).toBeNull();
  });

  it.each([
    ["another version", { version: 2 }],
    ["a size cut short", { rows: "3" }],
    ["no lives", { lives: 0, livesLeft: 0 }],
    ["more lives left than it had", { livesLeft: 4 }],
    ["lives below none", { livesLeft: -1 }],
    ["no rows", { rows: 0 }],
    ["a mine in every square", { mines: 15 }],
    ["an outcome it doesn't know", { outcome: "paused" }],
    ["a square it doesn't know", { squares: "trrhhfrrhh??rhh" }],
    ["too few squares", { squares: "trrh" }],
    ["squares in no string", { squares: ["t"] }],
    ["too few mines placed", { mineSquares: [0, 3] }],
    ["a mine placed twice", { mineSquares: [0, 0, 3, 8] }],
    ["a mine off the field", { mineSquares: [0, 3, 8, 15] }],
    ["mines in no list", { mineSquares: "0,3,8,13" }],
    ["a mine revealed", { mineSquares: [1, 3, 8, 13] }],
    ["a square stepped on with no mine", { mineSquares: [2, 3, 8, 13] }],
    ["a game started with no mines placed", { mineSquares: null }],
  ])("refuses a field with %s", (_, change) => {
    expect(restoreField(savedWith(change))).toBeNull();
  });

  it("refuses a game not started that has lost a life", () => {
    const saved = {
      ...throughJson(saveField(createField(PRESETS.easy.size, 3, 1))),
      livesLeft: 2,
    };

    expect(restoreField(saved)).toBeNull();
  });
});
