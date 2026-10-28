import {
  DIRECTIONS,
  directionTo,
  isDirection,
  opposite,
  sameSquare,
  stepFrom,
} from "./geometry";

describe("geometry", () => {
  it.each([
    ["up", { x: 3, y: 2 }],
    ["right", { x: 4, y: 3 }],
    ["down", { x: 3, y: 4 }],
    ["left", { x: 2, y: 3 }],
  ] as const)("steps %s", (direction, square) => {
    expect(stepFrom({ x: 3, y: 3 }, direction)).toEqual(square);
  });

  it("finds the way back for every direction", () => {
    expect(DIRECTIONS.map(opposite)).toEqual(["down", "left", "up", "right"]);
  });

  it("tells squares apart", () => {
    expect([
      sameSquare({ x: 1, y: 2 }, { x: 1, y: 2 }),
      sameSquare({ x: 1, y: 2 }, { x: 2, y: 1 }),
    ]).toEqual([true, false]);
  });

  it("finds the direction to a square beside another", () => {
    expect(directionTo({ x: 1, y: 1 }, { x: 1, y: 0 })).toBe("up");
  });

  it("finds no direction to a square not beside another", () => {
    expect(directionTo({ x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
  });

  it("knows a direction by its name", () => {
    expect([isDirection("left"), isDirection("north"), isDirection(3)]).toEqual(
      [true, false, false],
    );
  });
});
