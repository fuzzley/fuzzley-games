import { itemAt } from "@fz/core/records";
import { MOVE_FIXTURES } from "../../../testing/move_fixtures";
import {
  HOPS_MS,
  blastTimeline,
  firstWaveOf,
  spriteAt,
  timelineOfParts,
} from "../../../testing/played_parts";
import { moveStartOf } from "../../../testing/shown_board";
import { afterSwap } from "../board_after";
import { FEEL } from "../feel";
import { RAISED, lookAt } from "../looks";
import { reachesOf } from "../reach";
import type { Timeline } from "../timeline";
import { wispOff } from "./wisp";

/** When the wisp, piece 5, goes off on square 1 of its 3 by 3 board. */
const OFF_MS = HOPS_MS + FEEL.blastAfterMs;

/** When its copy lands on square 7, the one fuzzball it takes. */
const LANDS_MS = OFF_MS + FEEL.wispMs;

/**
 * Returns the timeline of a wisp and a dasher swapped together going off,
 * the dasher, piece 6, swapped from square 5 onto the wisp on square 4.
 */
function dasherOnWisp(): Timeline {
  const fixture = MOVE_FIXTURES.wispCarriesDasher;
  const play = {
    ...firstWaveOf(fixture),
    grid: afterSwap(moveStartOf(fixture).grid, {
      from: 5,
      to: 4,
      refused: false,
    }),
  };
  const reach = itemAt(reachesOf(play.wave, play.hopsMs, FEEL), 0);
  return timelineOfParts(
    play.grid,
    wispOff(
      { ...itemAt(play.wave.blasts, 0), square: 4, piece: 6 },
      reach,
      play,
    ),
  );
}

describe("wispOff", () => {
  const timeline = blastTimeline(MOVE_FIXTURES.wispGoesOff, wispOff);

  it("flutters as it goes off", () => {
    expect(timeline.sounds).toEqual([
      { atMs: OFF_MS, sound: "wisp", cents: 0, volume: 1 },
    ]);
  });

  it("takes the wisp off as it goes off", () => {
    expect(timeline.pieces.find(({ id }) => id === 5)?.untilMs).toBe(OFF_MS);
  });

  it("flies a happy copy of it, over the rest, from its square to the fuzzball it takes", () => {
    expect(timeline.sprites).toMatchObject([
      {
        drawn: {
          what: "copy",
          piece: { id: 5, special: "wisp" },
          face: "happy",
        },
        fromMs: OFF_MS,
        untilMs: LANDS_MS,
        look: { ...lookAt({ x: 1, y: 0 }), raise: RAISED.top },
      },
    ]);
    expect(spriteAt(timeline, LANDS_MS)).toMatchObject({
      x: 1,
      y: 2,
      leanX: 0,
      leanY: 0,
    });
  });

  it("bows the copy's flight to one side and lifts it, most halfway", () => {
    expect(spriteAt(timeline, OFF_MS + FEEL.wispMs / 2)).toMatchObject({
      x: 1,
      y: 1,
      leanX: FEEL.wispBendSquares * FEEL.curveArc,
      leanY: -FEEL.curveRiseSquares,
    });
  });

  it("lands it in its kind's tufts and a thin white ring", () => {
    expect(timeline.effects).toEqual([
      {
        what: "fluff",
        atMs: LANDS_MS,
        at: { x: 1, y: 2 },
        tuft: "tuft-violet",
        count: FEEL.wispTufts,
        power: FEEL.tuftPower,
      },
      {
        what: "ring",
        atMs: LANDS_MS,
        ms: FEEL.ringMs,
        at: { x: 1, y: 2 },
        radius: FEEL.wispRingSquares,
        ink: "white",
      },
    ]);
  });

  it("draws a special swapped onto a wisp as a wisp's copy, as it carries the special", () => {
    const timeline = dasherOnWisp();

    expect([
      timeline.sprites,
      timeline.pieces.find(({ id }) => id === 6)?.untilMs,
    ]).toMatchObject([
      [{ drawn: { piece: { id: 6, special: "wisp" } } }],
      HOPS_MS + FEEL.pairMs,
    ]);
  });
});
