import { wallFrom } from "../../testing/wall_picture";
import { kindsIn, waitingRows } from "./panels";

/** A wall of five rows, each a kind of its own but the plain bricks' gap, its lowest in field row 8. */
const WALL = wallFrom(
  ["|||||||||", "---------", "#########", "oo.oooooo", "222222222"],
  { lowestRow: 8 },
);

/** Returns the kinds of a row's bricks, or "." for none, as one string. */
function kindsOf(row: readonly ({ kind: string } | null)[]): string {
  return row.map((brick) => brick?.kind.charAt(0) ?? ".").join("");
}

describe("waitingRows", () => {
  it("gives the rows over the ceiling of a field 11 deep, the furthest first", () => {
    expect(waitingRows(WALL, 11).map(kindsOf)).toEqual([
      "ccccccccc",
      "rrrrrrrrr",
    ]);
  });

  it("gives every row of a wall still wholly over the ceiling, the furthest first", () => {
    expect(waitingRows({ ...WALL, lowestRow: 12 }, 11).map(kindsOf)).toEqual([
      "ccccccccc",
      "rrrrrrrrr",
      "sssssssss",
      "bb.bbbbbb",
      "ttttttttt",
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
      "brick",
      "brick",
      null,
      "brick",
      "brick",
      "brick",
      "brick",
      "brick",
      "brick",
    ]);
  });
});

describe("kindsIn", () => {
  it("gives each kind a wall holds once, in How to play's order, those waiting among them", () => {
    expect(kindsIn(WALL)).toEqual([
      "brick",
      "tough",
      "steel",
      "rowZapper",
      "columnZapper",
    ]);
  });

  it("gives only the kinds a wall holds", () => {
    expect(kindsIn(wallFrom(["#...o...#"]))).toEqual(["brick", "steel"]);
  });
});
