import {
  type ArtFrame,
  type DrawCommand,
  extentOf,
  scaledBy,
  shifted,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { KIND_IDS, type KindId } from "../../../rules/catalog/kinds";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import { type Grid, coverageOf } from "../../../testing/coverage";
import { bodyInksOf, bodyOf } from "../bodies";
import { BODY } from "../design_square";
import { fluffFrames } from "../fluff";
import { FRAMES, type Lift } from "../frame_names";
import { BURRED_SCALE, burrFrames } from "./burr";

/** A burr's frames in the specs' palette, at their scale, a pixel to each of the design's units. */
const BURR = burrFrames(ART_PALETTE, ART_SCALE);

/** The ring of thorns. */
const RING = frameNamed(BURR, FRAMES.burr);

/** A grid of points over the ring's frame, two to a device pixel. */
const OVER_THE_RING: Grid = {
  from: { x: 0, y: 0 },
  step: 0.5,
  across: Math.ceil(2 * RING.width) + 1,
  down: Math.ceil(2 * RING.height) + 1,
};

/** The most of a burred fuzzball's body at rest the ring may lie under, where a tuft of its fur reaches it. */
const MOST_UNDER_RING = 0.01;

/** Returns the shapes of a frame drawn in a color. */
function inColor(frame: ArtFrame, color: number): readonly DrawCommand[] {
  return frame.commands.filter((command) => command.color === color);
}

/** Returns how far out from the ring's middle a shape of it reaches, in the design's units. */
function reachOf(command: DrawCommand): number {
  const { x, y, width, height } = extentOf(command);
  return Math.hypot(
    x + width / 2 - RING.width / 2,
    y + height / 2 - RING.height / 2,
  );
}

/** Returns the share of a burred fuzzball's body of a kind, at rest or on end, that the ring lies under. */
function shareUnderRing(kind: KindId, lift: Lift): number {
  const middle = { x: RING.width / 2, y: RING.height / 2 };
  const body = bodyOf(
    kind,
    "plain",
    lift,
    bodyInksOf(ART_PALETTE, kind),
    0,
  ).map((command) => shifted(scaledBy(command, BURRED_SCALE), middle));
  const covered = coverageOf(body, OVER_THE_RING);
  const ring = coverageOf(RING.commands, OVER_THE_RING);
  const under = covered.filter((point, i) => point === 1 && ring[i] === 1);
  return under.length / covered.filter((point) => point === 1).length;
}

describe("burrFrames", () => {
  it("draws a burr's ring of thorns, then its tuft", () => {
    expect(BURR.map(({ name }) => name)).toEqual([
      FRAMES.burr,
      FRAMES.burrTuft,
    ]);
  });

  it("draws the ring's thorns over its edges, in the burr's inks", () => {
    expect([...new Set(RING.commands.map(({ color }) => color))]).toEqual([
      ART_PALETTE.burrEdge,
      ART_PALETTE.burr,
    ]);
  });

  it("draws its edges wider than its thorns, so they show either side", () => {
    const widthOf = (color: number): number =>
      Math.max(
        ...inColor(RING, color).map((command) => {
          const { width, height } = extentOf(command);
          return Math.min(width, height);
        }),
      );

    expect(widthOf(ART_PALETTE.burrEdge)).toBeGreaterThan(
      widthOf(ART_PALETTE.burr),
    );
  });

  it("turns round 22 points, long and short in turn, 1.74 and 1.42 of a body's radius out", () => {
    const corners = inColor(RING, ART_PALETTE.burr)
      .filter(({ kind }) => kind === "circle")
      .map((command) => Number((reachOf(command) / BODY).toFixed(2)));

    expect({
      points: corners.length - 1,
      reaches: [...new Set(corners)],
    }).toEqual({ points: 22, reaches: [1.74, 1.42] });
  });

  it.each(KIND_IDS)(
    "keeps a burred %s fuzzball's body at rest off the ring, all but a tuft's tip",
    (kind) => {
      expect(shareUnderRing(kind, "rest")).toBeLessThanOrEqual(MOST_UNDER_RING);
    },
  );

  it("draws its tuft as a kind's tuft is drawn, in the burr's ink", () => {
    const kinds = fluffFrames(ART_PALETTE, ART_SCALE);
    const own = frameNamed(kinds, FRAMES.tuft("blue"));

    expect(frameNamed(BURR, FRAMES.burrTuft).commands).toEqual(
      own.commands.map((command) => ({
        ...command,
        color: ART_PALETTE.burr,
      })),
    );
  });
});
