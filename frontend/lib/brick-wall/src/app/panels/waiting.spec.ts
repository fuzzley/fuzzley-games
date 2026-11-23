import { type Legend, wallFrom } from "../../rules/level_picture";
import type { Brick } from "../../rules/wall";
import { kindsIn, waitingRows } from "./waiting";

/** Kinds of brick made up for the spec, in the order its game lists them. */
const KINDS = ["pebble", "flint", "slate", "reed", "moss"] as const;

/** Names a kind made up for the spec. */
type Kind = (typeof KINDS)[number];

/** The legend the spec draws its walls in: each kind by its first letter. */
const LEGEND: Legend<Kind> = {
  none: ".",
  bricks: Object.fromEntries(
    KINDS.map((kind) => [kind.charAt(0), { kind, hits: 1, plates: 0 }]),
  ),
  twinMarks: [],
  tintOf: () => 0,
};

/** A wall of five rows, each a kind of its own but the pebbles' gap, its lowest in field row 8. */
const WALL = wallFrom(
  ["mmmmmmmmm", "rrrrrrrrr", "sssssssss", "pp.pppppp", "fffffffff"],
  LEGEND,
  { lowestRow: 8 },
);

/** Returns the kinds of a row's bricks, or "." for none, as one string. */
function kindsOf(row: readonly (Brick<Kind> | null)[]): string {
  return row.map((brick) => brick?.kind.charAt(0) ?? ".").join("");
}

describe("waitingRows", () => {
  it("gives the rows over the ceiling of a field 11 deep, the furthest first", () => {
    expect(waitingRows(WALL, 11).map(kindsOf)).toEqual([
      "mmmmmmmmm",
      "rrrrrrrrr",
    ]);
  });

  it("gives every row of a wall still wholly over the ceiling, the furthest first", () => {
    expect(waitingRows({ ...WALL, lowestRow: 12 }, 11).map(kindsOf)).toEqual([
      "mmmmmmmmm",
      "rrrrrrrrr",
      "sssssssss",
      "pp.pppppp",
      "fffffffff",
    ]);
  });

  it.each([13, 22])(
    "gives no row of a wall wholly in a field %i deep",
    (depth) => {
      expect(waitingRows(WALL, depth)).toEqual([]);
    },
  );

  it("gives each row's bricks from the left, null where there is none", () => {
    const deep = waitingRows({ ...WALL, lowestRow: 10 }, 11);

    expect(deep.at(-1)?.map((brick) => brick?.kind ?? null)).toEqual([
      "pebble",
      "pebble",
      null,
      "pebble",
      "pebble",
      "pebble",
      "pebble",
      "pebble",
      "pebble",
    ]);
  });
});

describe("kindsIn", () => {
  it("gives each kind a wall holds once, in the game's order, those waiting among them", () => {
    expect(kindsIn(WALL, KINDS)).toEqual([
      "pebble",
      "flint",
      "slate",
      "reed",
      "moss",
    ]);
  });

  it("gives only the kinds a wall holds", () => {
    expect(kindsIn(wallFrom(["s...p...s"], LEGEND), KINDS)).toEqual([
      "pebble",
      "slate",
    ]);
  });
});
