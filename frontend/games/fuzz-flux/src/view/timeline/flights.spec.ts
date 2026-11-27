import type { Goal } from "../../rules/catalog/goals";
import type { Fuzzball } from "../../rules/catalog/pieces";
import type { GoalShown } from "../run_state";
import { FEEL } from "./feel";
import { type Claim, flightsOf } from "./flights";

/** A goal of red fuzzballs, and one of dust. */
const GOALS: readonly Goal[] = [
  { what: "gather", kind: "red", count: 20 },
  { what: "dust" },
];

/** Returns the goals, each asking for so many more. */
function asking(...left: readonly number[]): readonly GoalShown[] {
  return GOALS.map((goal, index) => {
    const asks = left[index] ?? 0;
    return { goal, left: asks, met: asks <= 0 };
  });
}

/** Returns a fuzzball of a kind, by its id. */
function fuzzball(id: number, kind: Fuzzball["kind"] = "red"): Fuzzball {
  return {
    what: "fuzzball",
    id,
    kind,
    special: null,
    caged: false,
    burred: false,
  };
}

/** Returns some fuzzballs of a kind gathered at a moment, numbered from 1. */
function gatheredAt(
  atMs: number,
  count: number,
  kind: Fuzzball["kind"] = "red",
): readonly Claim[] {
  return Array.from({ length: count }, (_, index) => ({
    what: "gathered",
    atMs,
    piece: fuzzball(index + 1, kind),
    at: { x: index, y: 0 },
  }));
}

describe("flightsOf", () => {
  it("flies each fuzzball gathered to the goal of its kind, a gap apart", () => {
    const { flights } = flightsOf(gatheredAt(100, 2), asking(5), FEEL);

    expect(flights).toEqual([
      {
        atMs: 100 + FEEL.flightAfterMs,
        ms: FEEL.flightMs,
        drawn: fuzzball(1),
        from: { x: 0, y: 0 },
        goal: 0,
      },
      {
        atMs: 100 + FEEL.flightAfterMs + FEEL.flightGapMs,
        ms: FEEL.flightMs,
        drawn: fuzzball(2),
        from: { x: 1, y: 0 },
        goal: 0,
      },
    ]);
  });

  it("counts the goal down as each lands", () => {
    const landsMs = 100 + FEEL.flightAfterMs + FEEL.flightMs;

    expect(flightsOf(gatheredAt(100, 2), asking(5), FEEL).counts).toEqual([
      { atMs: landsMs, goal: 0, left: 4 },
      { atMs: landsMs + FEEL.flightGapMs, goal: 0, left: 3 },
    ]);
  });

  it("starts again with no gap once so many are in the air", () => {
    const { flights } = flightsOf(
      gatheredAt(100, FEEL.flightsInTurn + 1),
      asking(20),
      FEEL,
    );

    expect(
      flights.find(({ drawn }) => drawn.id === FEEL.flightsInTurn + 1)?.atMs,
    ).toBe(100 + FEEL.flightAfterMs);
  });

  it("counts those past the most in the air with no flight, a while later", () => {
    const { flights, counts } = flightsOf(
      gatheredAt(100, FEEL.mostFlights + 1),
      asking(20),
      FEEL,
    );

    expect([flights.length, counts[0]]).toEqual([
      FEEL.mostFlights,
      { atMs: 100 + FEEL.unflownCountMs, goal: 0, left: 19 },
    ]);
  });

  it("flies none to a goal of another kind, nor past what its goal asks for", () => {
    const { flights } = flightsOf(
      [...gatheredAt(100, 3), ...gatheredAt(100, 1, "blue")],
      asking(2),
      FEEL,
    );

    expect(flights.map(({ drawn }) => drawn.id)).toEqual([1, 2]);
  });

  it("counts what a goal counts with no flight as it happens, an element's among it", () => {
    const { flights, counts } = flightsOf(
      [
        { what: "counted", atMs: 50, counts: { what: "gather", kind: "red" } },
        { what: "counted", atMs: 60, counts: { what: "dust" } },
        ...gatheredAt(100, 1),
      ],
      asking(1, 3),
      FEEL,
    );

    expect([flights, counts]).toEqual([
      [],
      [
        { atMs: 50, goal: 0, left: 0 },
        { atMs: 60, goal: 1, left: 2 },
      ],
    ]);
  });
});
