import {
  brickAt,
  fieldFrom,
  playWithoutBall,
  stepTimes,
  throwBall,
} from "../../testing/field_picture";
import type { Field } from "../field/field";
import { cellIndex, cellMiddleX, cellMiddleY } from "../grid";
import { stepsIn } from "../stepper";
import { BRICKS_TOP, COLUMNS, SLIDER_BEAT_MS } from "../tuning";
import { hitBrick } from "./bricks";
import { placeBricks } from "./sliders";

/** The field's beat, in steps. */
const BEAT = stepsIn(SLIDER_BEAT_MS);

/** Returns a field in play from a picture, with no ball in it. */
function fieldOf(rows: readonly string[]): Field {
  return playWithoutBall(fieldFrom(rows));
}

/**
 * Returns what stands in each cell of a row, left to right: the way a
 * slider heads, `>` or `<`, `x` for a broken brick, `o` for any other, and
 * `.` for none.
 */
function pictureOf(field: Field, row = 0): string {
  return Array.from({ length: COLUMNS }, (_, column) => {
    const brick = field.bricks[cellIndex(column, row)];
    if (!brick) return ".";
    if (brick.broken) return "x";
    if (brick.kind !== "slider") return "o";
    return brick.heading > 0 ? ">" : "<";
  }).join("");
}

/** Returns the cell and the way of each `slid` event the field's log holds, oldest first. */
function slidesOf(field: Field): { cell: number; way: number }[] {
  const slides: { cell: number; way: number }[] = [];
  field.events.forEachSince(0, ({ kind, cell, way }) => {
    if (kind === "slid") slides.push({ cell, way });
  });
  return slides;
}

/** Puts a ball in the cell a train's lead at the left of the first row steps into next, a step before the beat. */
function ballAhead(field: Field): void {
  stepTimes(field, BEAT - 1);
  throwBall(field, cellMiddleX(2), cellMiddleY(2) + 0.6, 180);
}

/** Breaks the brick in a cell of the field's first row. */
function breakAt(field: Field, column: number): void {
  const brick = brickAt(field, column, 0);
  while (!brick.broken) hitBrick(field, brick, 0, 0);
}

describe("stepSliders", () => {
  it("stands a slider still till the field's beat", () => {
    const field = fieldOf([">"]);

    stepTimes(field, BEAT - 1);

    expect(pictureOf(field)).toBe(">............");
  });

  it.each([
    ["right", ".>>..........", "..>>........."],
    ["left", "...<<........", "..<<........."],
  ])("steps a train %s together on the beat, a cell its way", (_, from, to) => {
    const field = fieldOf([from]);

    stepTimes(field, BEAT);

    expect(pictureOf(field)).toBe(to);
  });

  it("steps a train a cell a beat", () => {
    const field = fieldOf([">"]);

    stepTimes(field, 3 * BEAT);

    expect(pictureOf(field)).toBe("...>.........");
  });

  it.each([
    ["the right wall", "...........>>", "...........<<"],
    ["the left wall", "<<...........", ">>..........."],
    ["a brick", ">>o..........", "<<o.........."],
    ["a train heading at it", ">><<.........", "<<>>........."],
  ])("turns a train at %s, and leaves it standing", (_, from, to) => {
    const field = fieldOf([from]);

    stepTimes(field, BEAT);

    expect(pictureOf(field)).toBe(to);
  });

  it("steps a train turned back the way it came on the next beat", () => {
    const field = fieldOf(["...........>>"]);

    stepTimes(field, 2 * BEAT);

    expect(pictureOf(field)).toBe("..........<<.");
  });

  it("steps into a broken brick's cell, and puts the brick in the cell the train left", () => {
    const field = fieldOf([".>>o"]);
    breakAt(field, 3);

    stepTimes(field, BEAT);

    expect(pictureOf(field)).toBe(".x>>.........");
  });

  it("steps a train over a broken slider, which takes the cell it left, and splits the train at it", () => {
    const field = fieldOf([">>>"]);
    breakAt(field, 1);

    stepTimes(field, BEAT);

    expect(pictureOf(field)).toBe("x>.>.........");
  });

  it("steps the trains of each row, each its way", () => {
    const field = fieldOf([">", "", "............<"]);

    stepTimes(field, BEAT);

    expect([pictureOf(field, 0), pictureOf(field, 2)]).toEqual([
      ".>...........",
      "...........<.",
    ]);
  });

  it("waits, whole, while a ball is in the cell its lead would step into", () => {
    const field = fieldOf([">>"]);
    ballAhead(field);

    stepTimes(field, 1);

    expect(pictureOf(field)).toBe(">>...........");
  });

  it.each([
    [
      "right",
      ".>>",
      [
        { cell: 3, way: 1 },
        { cell: 2, way: 1 },
      ],
    ],
    [
      "left",
      ".<<",
      [
        { cell: 0, way: -1 },
        { cell: 1, way: -1 },
      ],
    ],
  ])(
    "records each slider's step %s at its new cell, and its way, the lead's first",
    (_, picture, slides) => {
      const field = fieldOf([picture]);

      stepTimes(field, BEAT);

      expect(slidesOf(field)).toEqual(slides);
    },
  );

  it("records nothing for a train that turns", () => {
    const field = fieldOf([">o"]);

    stepTimes(field, BEAT);

    expect(slidesOf(field)).toEqual([]);
  });

  it("records nothing for a train that waits", () => {
    const field = fieldOf([">>"]);
    ballAhead(field);

    stepTimes(field, 1);

    expect(slidesOf(field)).toEqual([]);
  });

  it("moves each brick's cell with it, keeping its home", () => {
    const field = fieldOf([".>>o"]);
    breakAt(field, 3);

    stepTimes(field, BEAT);

    expect(
      [2, 3, 1].map((column) => {
        const { cell, home } = brickAt(field, column, 0);
        return { cell, home };
      }),
    ).toEqual([
      { cell: 2, home: 1 },
      { cell: 3, home: 2 },
      { cell: 1, home: 3 },
    ]);
  });

  it("has a ball meet a slider at the cell it stepped into", () => {
    const field = fieldOf([">"]);
    stepTimes(field, BEAT);
    throwBall(field, cellMiddleX(1), BRICKS_TOP + 3, 0);

    stepTimes(field, 60);

    expect(pictureOf(field)).toBe(".x...........");
  });
});

describe("placeBricks", () => {
  it("puts each brick in the cell it says it stands in", () => {
    const field = fieldOf([">o"]);
    brickAt(field, 0, 0).cell = 2;

    placeBricks(field);

    expect(pictureOf(field)).toBe(".o>..........");
  });
});
