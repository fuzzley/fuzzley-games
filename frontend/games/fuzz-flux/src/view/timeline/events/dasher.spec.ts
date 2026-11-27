import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import { HOPS_MS, blastTimeline, pieceAt } from "../../../testing/played_parts";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import type { BlastEvent } from "../blasts";
import { dasherOff } from "./dasher";

/** When the dasher goes off, on square 1, as its swap lands it there. */
const OFF_MS = HOPS_MS + FEEL.blastAfterMs;

/** How many squares its streaks run: the board's 3, and on past it. */
const SQUARES = 3 + FEEL.streakRunOnSquares;

/** The dasher's own event, played as a dasher down. */
const DOWN: BlastEvent = (blast, reach, play) =>
  dasherOff({ ...blast, what: "dasher-down" }, reach, play);

describe("dasherOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.dasherGoesOff, dasherOff);

  it("rushes as it goes off, a little under its own loudness", () => {
    expect(timeline.sounds).toEqual([
      { atMs: OFF_MS, sound: "dash", cents: 0, volume: FEEL.dashVolume },
    ]);
  });

  it("sends two streaks of its kind from its square along its row, one each way, a square at a time", () => {
    const streak = {
      what: "streak",
      atMs: OFF_MS + FEEL.streaksAfterMs,
      ms: SQUARES * FEEL.dasherSquareMs,
      from: { x: 1, y: 0 },
      ink: "violet",
    };

    expect(timeline.effects.filter(({ what }) => what === "streak")).toEqual([
      { ...streak, to: { x: 1 + SQUARES, y: 0 } },
      { ...streak, to: { x: 1 - SQUARES, y: 0 } },
    ]);
  });

  it("shakes the board", () => {
    expect(timeline.effects).toContainEqual({
      what: "shake",
      atMs: OFF_MS,
      px: FEEL.shakeDasherPx,
    });
  });

  it("stretches the dasher along its row, narrows and fades it, raised, and takes it off", () => {
    const goneMs = OFF_MS + FEEL.dasherGoneMs;

    expect([
      pieceAt(timeline, 5, goneMs),
      timeline.pieces.find(({ id }) => id === 5)?.untilMs,
    ]).toMatchObject([
      {
        scaleX: FEEL.dasherStretchScale,
        scaleY: FEEL.dasherNarrowScale,
        fade: 1,
        raise: RAISED.goingOff,
      },
      goneMs,
    ]);
  });

  it("runs a dasher down's streaks down its column, and stretches it down", () => {
    const down = blastTimeline(MOVE_FIXTURES.dasherGoesOff, DOWN);

    expect([
      down.effects.find(({ what }) => what === "streak"),
      pieceAt(down, 5, OFF_MS + FEEL.dasherGoneMs),
    ]).toMatchObject([
      { to: { x: 1, y: SQUARES } },
      { scaleX: FEEL.dasherNarrowScale, scaleY: FEEL.dasherStretchScale },
    ]);
  });

  it("runs the streaks of a dasher a wisp carried from the square it lands on, taking nothing off", () => {
    const carried = blastTimeline(
      MOVE_FIXTURES.wispCarriesDasher,
      dasherOff,
      1,
    );

    expect([
      carried.effects.filter(({ what }) => what === "streak"),
      carried.pieces.find(({ id }) => id === 7)?.untilMs,
    ]).toMatchObject([
      [{ from: { x: 2, y: 1 } }, { from: { x: 2, y: 1 } }],
      null,
    ]);
  });
});
