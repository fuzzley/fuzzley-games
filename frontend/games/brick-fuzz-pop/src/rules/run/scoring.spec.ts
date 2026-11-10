import { FLIGHT_FIXTURES } from "../../testing/flight_fixtures";
import { JUMP_POINTS, STAR_POINTS } from "../tuning";
import { breakPoints, starPoints, streakTimes, tallyOf } from "./scoring";

/** A level's run, cleared in 7 rounds against a par of 6, so two stars, with 2 jumps. */
const CLEARED = {
  outcome: "cleared",
  rounds: 7,
  par: 6,
  jumps: 2,
  banked: 1000,
  score: 2900,
} as const;

describe("streakTimes", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [19, 3],
    [20, 4],
    [60, 4],
  ])("scores a round's brick %i times %i", (streak, times) => {
    expect(streakTimes(streak)).toBe(times);
  });
});

describe("breakPoints", () => {
  it("scores a brick its kind's points for each hit it had whole", () => {
    expect([
      breakPoints({ kind: "brick", full: 1 }, 1),
      breakPoints({ kind: "tough", full: 4 }, 1),
      breakPoints({ kind: "rowZapper", full: 1 }, 1),
    ]).toEqual([10, 40, 30]);
  });

  it("multiplies them by the streak's times", () => {
    expect(breakPoints({ kind: "tough", full: 3 }, 10)).toBe(90);
  });

  it("scores every break of the rounds made by hand as they score it", () => {
    const breaks = Object.values(FLIGHT_FIXTURES).flatMap(({ start, round }) =>
      round.flight.events.flatMap((event) =>
        event.kind === "break"
          ? [{ brick: start.wall.bricks[event.cell], event }]
          : [],
      ),
    );

    const misscored = breaks.filter(
      ({ brick, event }) =>
        !brick || breakPoints(brick, event.streak) !== event.points,
    );

    expect({ breaks: breaks.length > 10, misscored }).toEqual({
      breaks: true,
      misscored: [],
    });
  });
});

describe("starPoints", () => {
  it("adds a star's points for each star", () => {
    expect([0, 1, 3].map(starPoints)).toEqual([
      0,
      STAR_POINTS,
      3 * STAR_POINTS,
    ]);
  });
});

describe("tallyOf", () => {
  it("adds a cleared level's points up from its bricks, its jumps and its stars", () => {
    expect(tallyOf(CLEARED)).toEqual({
      bricks: 1900 - 2 * JUMP_POINTS - 2 * STAR_POINTS,
      jumps: 2 * JUMP_POINTS,
      stars: 2 * STAR_POINTS,
    });
  });

  it("adds up to the level's points", () => {
    const { bricks, jumps, stars } = tallyOf(CLEARED);

    expect(bricks + jumps + stars).toBe(CLEARED.score - CLEARED.banked);
  });

  it("gives a level not yet cleared no stars", () => {
    const tally = tallyOf({ ...CLEARED, outcome: "playing" });

    expect(tally).toEqual({
      bricks: 1900 - 2 * JUMP_POINTS,
      jumps: 2 * JUMP_POINTS,
      stars: 0,
    });
  });
});
