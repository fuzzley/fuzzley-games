import { RADIANS_PER_DEGREE } from "../rules/angles";
import { type Crossing, blankCrossing } from "../rules/hazards/crossing";
import type { Torus } from "../rules/torus";
import { type Entry, entriesOf, entryOf } from "./crossings";

/** The field the crossings wait off. */
const TORUS: Torus = { width: 72, height: 40 };

/** The margin and the tilt, in degrees, the entries are held to. */
const MARGIN = 2;
const TILT = 30;

/** Returns a crossing waiting at a place, heading a way. */
function waitingAt(x: number, y: number, heading: number): Crossing {
  return { ...blankCrossing(), x, y, heading };
}

/** Returns an entry off the left edge that comes in rightly, changed as given. */
function entry(change: Partial<Entry> = {}): Entry {
  return {
    edge: "left",
    by: MARGIN,
    along: 0.5,
    tilt: 10,
    towardMiddle: true,
    ...change,
  };
}

describe("entryOf", () => {
  it.each([
    [
      "left",
      waitingAt(-2, 10, 0),
      { edge: "left", by: 2, along: 0.25, tilt: 0, towardMiddle: true },
    ],
    [
      "right",
      waitingAt(75, 30, Math.PI),
      { edge: "right", by: 3, along: 0.75, tilt: 0, towardMiddle: true },
    ],
    [
      "top",
      waitingAt(18, -1, Math.PI / 2),
      { edge: "top", by: 1, along: 0.25, tilt: 0, towardMiddle: true },
    ],
    [
      "bottom",
      waitingAt(54, 42, 1.5 * Math.PI),
      { edge: "bottom", by: 2, along: 0.75, tilt: 0, towardMiddle: true },
    ],
  ])("reads a crossing off the %s edge", (_, crossing, expected) => {
    expect(entryOf(crossing, TORUS)).toEqual(expected);
  });

  // Each waits a quarter of the way along its edge, so its middle lies down
  // a left or right edge and right along the top or bottom.
  it.each([
    { edge: "left", x: -2, y: 10, degrees: 20, towardMiddle: true },
    { edge: "left", x: -2, y: 10, degrees: -20, towardMiddle: false },
    { edge: "right", x: 75, y: 10, degrees: 160, towardMiddle: true },
    { edge: "right", x: 75, y: 10, degrees: 200, towardMiddle: false },
    { edge: "top", x: 18, y: -1, degrees: 70, towardMiddle: true },
    { edge: "top", x: 18, y: -1, degrees: 110, towardMiddle: false },
    { edge: "bottom", x: 18, y: 42, degrees: 290, towardMiddle: true },
    { edge: "bottom", x: 18, y: 42, degrees: 250, towardMiddle: false },
  ])(
    "reads a heading of $degrees° off the $edge edge as a tilt of 20°, toward its middle: $towardMiddle",
    ({ edge, x, y, degrees, towardMiddle }) => {
      const crossing = waitingAt(x, y, degrees * RADIANS_PER_DEGREE);

      const read = entryOf(crossing, TORUS);

      expect([read.edge, read.tilt, read.towardMiddle]).toEqual([
        edge,
        expect.closeTo(20),
        towardMiddle,
      ]);
    },
  );
});

describe("entriesOf", () => {
  it("counts the edges entries come in by, none wrongly", () => {
    const entries = [entry(), entry({ edge: "top" }), entry({ edge: "top" })];

    expect(entriesOf(entries, MARGIN, TILT)).toEqual({ edges: 2, wrong: [] });
  });

  it.each([
    ["off its margin", entry({ by: MARGIN + 0.5 })],
    ["too near its edge's start", entry({ along: 0.1 })],
    ["too near its edge's end", entry({ along: 0.9 })],
    ["tilted too far", entry({ tilt: TILT + 1 })],
    ["tilted away from the middle", entry({ towardMiddle: false })],
  ])("finds an entry %s wrong", (_, wrong) => {
    expect(entriesOf([entry(), wrong], MARGIN, TILT).wrong).toEqual([wrong]);
  });
});
