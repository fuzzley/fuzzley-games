import { boardFrom } from "../../../testing/board_picture";
import { pieceAt, timelineOfParts } from "../../../testing/played_parts";
import { gridOf } from "../../../testing/shown_board";
import { FEEL } from "../feel";
import { RAISED } from "../looks";
import { standingOn } from "../standing";
import type { Timeline } from "../timeline";
import { pairWindUp } from "./pair";

/** When the swap ends and the pair winds up. */
const AT_MS = 140;

/** A red dasher, a blue puffer beside it and the frizzball under it, numbered 1 to 3. */
const GRID = gridOf(boardFrom({ pieces: ["rb", "f "], marks: ["-o", ".."] }));

/** Returns the timeline of the piece on a square winding up with the one on another. */
function windUp(from: number, to: number): Timeline {
  return timelineOfParts(
    GRID,
    pairWindUp(standingOn(GRID, from), standingOn(GRID, to), AT_MS, FEEL),
  );
}

describe("pairWindUp", () => {
  const timeline = windUp(0, 1);

  it("sounds the pair as they meet", () => {
    expect(timeline.sounds).toEqual([
      { atMs: AT_MS, sound: "pair", cents: 0, volume: 1 },
    ]);
  });

  it("takes the one swapped with off, in its tufts, as a ring spreads where they met", () => {
    expect([
      timeline.pieces.find(({ id }) => id === 2)?.untilMs,
      timeline.effects,
    ]).toEqual([
      AT_MS,
      [
        {
          what: "ring",
          atMs: AT_MS,
          ms: FEEL.pairMs,
          at: { x: 1, y: 0 },
          radius: FEEL.pairRingSquares,
          ink: "white",
        },
        {
          what: "fluff",
          atMs: AT_MS,
          at: { x: 1, y: 0 },
          tuft: "tuft-blue",
          count: FEEL.pairTufts,
          power: FEEL.pairTuftPower,
        },
      ],
    ]);
  });

  it("swells the one swapped from, its fur on end, raised, as the pair", () => {
    expect(pieceAt(timeline, 1, AT_MS + FEEL.pairMs)).toMatchObject({
      scaleX: FEEL.pairScale,
      lift: 1,
      raise: RAISED.goingOff,
    });
  });

  it("leaves the frizzball to be seen, under the id of the special swapped with it, which is gone in its tufts", () => {
    const frizzball = windUp(0, 2);

    expect([
      frizzball.pieces.find(({ id }) => id === 1)?.becomes,
      pieceAt(frizzball, 1, AT_MS).face,
      frizzball.pieces.find(({ id }) => id === 3)?.untilMs,
      frizzball.effects[1],
    ]).toMatchObject([
      [{ atMs: AT_MS, piece: { what: "frizzball", id: 1 } }],
      "eep",
      AT_MS,
      { tuft: "tuft-red" },
    ]);
  });

  it("throws no tufts for two frizzballs, there being none of their fur", () => {
    const grid = gridOf(boardFrom(["ff"]));

    expect(
      timelineOfParts(
        grid,
        pairWindUp(standingOn(grid, 0), standingOn(grid, 1), AT_MS, FEEL),
      ).effects.map(({ what }) => what),
    ).toEqual(["ring"]);
  });

  it("counts each fuzzball of the pair for the goal of its kind as they meet, but no frizzball", () => {
    expect(
      pairWindUp(standingOn(GRID, 0), standingOn(GRID, 2), AT_MS, FEEL).filter(
        ({ what }) => what === "counted",
      ),
    ).toEqual([
      { what: "counted", atMs: AT_MS, counts: { what: "gather", kind: "red" } },
    ]);
  });
});
