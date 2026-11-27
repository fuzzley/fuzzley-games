import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { HOPS_MS, blastTimeline } from "../../../testing/played_parts";
import type { BlastEvent } from "../blasts";
import { FEEL } from "../feel";
import type { Place, Timeline } from "../timeline";
import { crossOff } from "./cross";

/** When the two dashers go off together, on square 4 of their 3 by 3 board, once they have wound up. */
const OFF_MS = HOPS_MS + FEEL.pairMs;

/** The two dashers' cross, played as a dasher's with a puffer. */
const WIDE: BlastEvent = (blast, reach, play) =>
  crossOff({ ...blast, what: "dasher-and-puffer" }, reach, play);

/** Returns where each of a timeline's streaks runs from, and to where. */
function streaksIn(timeline: Timeline): readonly (readonly Place[])[] {
  return timeline.effects.flatMap((effect) =>
    effect.what === "streak" ? [[effect.from, effect.to]] : [],
  );
}

describe("crossOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.twoDashers, crossOff);

  it("rushes as a dasher does as it goes off", () => {
    expect(timeline.sounds).toEqual([
      { atMs: OFF_MS, sound: "dash", cents: 0, volume: FEEL.dashVolume },
    ]);
  });

  it("rushes and puffs at their own loudness for a dasher with a puffer", () => {
    expect(blastTimeline(MOVE_FIXTURES.twoDashers, WIDE).sounds).toEqual([
      { atMs: OFF_MS, sound: "dash", cents: 0, volume: 1 },
      { atMs: OFF_MS, sound: "puff", cents: 0, volume: 1 },
    ]);
  });

  it("runs streaks both ways along the row and down the column the pair meets on", () => {
    expect(streaksIn(timeline)).toEqual([
      [
        { x: 1, y: 1 },
        { x: 1 + 7, y: 1 },
      ],
      [
        { x: 1, y: 1 },
        { x: 1 - 7, y: 1 },
      ],
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 + 7 },
      ],
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 - 7 },
      ],
    ]);
  });

  it("spreads a white ring, shakes the board, and takes the pair off at once", () => {
    expect([
      timeline.effects.filter(({ what }) => what !== "streak"),
      timeline.pieces.find(({ id }) => id === 4)?.untilMs,
    ]).toEqual([
      [
        {
          what: "ring",
          atMs: OFF_MS,
          ms: FEEL.crossRingMs,
          at: { x: 1, y: 1 },
          radius: FEEL.crossRingSquares,
          ink: "white",
        },
        { what: "shake", atMs: OFF_MS, px: FEEL.shakeTwoDashersPx },
      ],
      OFF_MS,
    ]);
  });

  it("runs a dasher and a puffer's three rows and three columns wide, shaking the board harder", () => {
    const wide = blastTimeline(MOVE_FIXTURES.twoDashers, WIDE);

    expect([
      streaksIn(wide).map(([from]) => from),
      wide.effects.find(({ what }) => what === "shake"),
    ]).toEqual([
      [
        { x: 1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 2, y: 1 },
      ],
      { what: "shake", atMs: OFF_MS, px: FEEL.shakeDasherAndPufferPx },
    ]);
  });
});
