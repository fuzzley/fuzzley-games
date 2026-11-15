import { WEAPONS } from "../rules/catalog/weapons";
import { lastFewOn } from "../rules/field/fill";
import { stepsIn } from "../rules/stepper";
import { SHOT_LIFE_MS, SHOT_SPEED } from "../rules/tuning";
import {
  CELL,
  KEEPER,
  PICTURE_TORUS,
  fieldFrom,
  placeShot,
  shipOf,
  wholeRocks,
} from "./field_picture";

describe("fieldFrom", () => {
  it("lays each rock and the ship in its cell's middle", () => {
    const field = fieldFrom(["^.", ".M"]);

    expect([
      shipOf(field),
      wholeRocks(field).map(({ size, x, y }) => ({ size, x, y })),
    ]).toEqual([
      expect.objectContaining({ x: CELL / 2, y: CELL / 2 }),
      [{ size: "medium", x: 1.5 * CELL, y: 1.5 * CELL }],
    ]);
  });

  it.each([
    [
      "too many rows",
      Array.from({ length: PICTURE_TORUS.height / CELL + 1 }, () => "."),
      "Too many rows",
    ],
    [
      "a row too long",
      [".".repeat(PICTURE_TORUS.width / CELL + 1)],
      "too long",
    ],
    ["two ships", ["^.^"], "one ship at most"],
    ["a character it doesn't know", ["X"], 'No rock is drawn "X"'],
  ])("refuses a picture of %s", (_, rows, message) => {
    expect(() => fieldFrom(rows)).toThrow(message);
  });

  it("counts its last few by its shape", () => {
    expect(fieldFrom(["L"]).lastFew).toBe(lastFewOn(PICTURE_TORUS));
  });

  it("refuses more rocks than its cap", () => {
    expect(() => fieldFrom(["LL"], { cap: 1 })).toThrow("No slot was free");
  });

  it("refuses a rock of a kind that doesn't come in its size", () => {
    expect(() => fieldFrom(["S"], { kind: "crystal" })).toThrow(RangeError);
  });
});

describe("placeShot", () => {
  it("puts a shot of a weapon in flight in the first free slot, where it says, heading its way at a shot's speed, breaking as many as its weapon's", () => {
    const field = fieldFrom(KEEPER);

    const shot = placeShot(field, "lance", 30, 20, Math.PI / 2);

    expect([
      field.shots.slots.indexOf(shot),
      shot.weapon,
      [shot.x, shot.y, shot.lastX, shot.lastY],
      [shot.vx, shot.vy].map((speed) => Math.round(speed * 1e9) / 1e9 + 0),
      shot.lifeSteps,
      shot.breaksLeft,
    ]).toEqual([
      0,
      "lance",
      [30, 20, 30, 20],
      [0, SHOT_SPEED],
      stepsIn(SHOT_LIFE_MS),
      WEAPONS.lance.breaks,
    ]);
  });

  it("puts the next in the slot after it", () => {
    const field = fieldFrom(KEEPER);
    placeShot(field, "gun", 10, 10);

    const shot = placeShot(field, "gun", 20, 10);

    expect(field.shots.slots.indexOf(shot)).toBe(1);
  });
});
