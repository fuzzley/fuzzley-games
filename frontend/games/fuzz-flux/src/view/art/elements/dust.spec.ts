import { type DrawCommand, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import { type Grid, coverageOf } from "../../../testing/coverage";
import { type Dusty, FRAMES } from "../frame_names";
import { wellFrame } from "../well";
import { dustFrames } from "./dust";

/** The dust in the specs' palette, at their scale. */
const DUST = dustFrames(ART_PALETTE, ART_SCALE);

/** The square's well, which dust covers. */
const WELL = wellFrame(ART_PALETTE, ART_SCALE);

/** A grid of points over a square's frame, two to a device pixel. */
const OVER_A_SQUARE: Grid = {
  from: { x: 0, y: 0 },
  step: 0.5,
  across: 2 * WELL.width + 1,
  down: 2 * WELL.height + 1,
};

/** Returns dust's shapes at a count of layers. */
function dustAt(layers: Dusty): readonly DrawCommand[] {
  return frameNamed(DUST, FRAMES.dust(layers)).commands;
}

/** Returns dust's specks at a count of layers. */
function specksAt(layers: Dusty): readonly DrawCommand[] {
  return dustAt(layers).filter(({ color }) => color === ART_PALETTE.specks);
}

/** Returns the radii of dust's specks at a count of layers. */
function speckRadiiAt(layers: Dusty): readonly number[] {
  return specksAt(layers).map((speck) => extentOf(speck).width / 2);
}

describe("dustFrames", () => {
  it("draws dust at 1 layer, then at 2", () => {
    expect(DUST.map(({ name }) => name)).toEqual([
      FRAMES.dust(1),
      FRAMES.dust(2),
    ]);
  });

  it.each([1, 2] as const)(
    "covers the square's well with a well of its own in the color of dust at %i layers, its specks over it",
    (layers) => {
      const [well, ...specks] = dustAt(layers);

      expect({
        well,
        specks: new Set(specks.map(({ color }) => color)),
      }).toEqual({
        well: { ...WELL.commands[0], color: ART_PALETTE.dust[layers] },
        specks: new Set([ART_PALETTE.specks]),
      });
    },
  );

  it("specks dust 7 times, each speck's radius 2.2 to 4.2 of the design's units, and thick dust 13 times, some larger, up to 5.4", () => {
    const dust = speckRadiiAt(1);
    const thickDust = speckRadiiAt(2);

    expect({
      dust: dust.length,
      thickDust: thickDust.length,
      dustWithin: Math.min(...dust) >= 2.2 && Math.max(...dust) <= 4.2,
      thickDustLarger:
        Math.max(...thickDust) > 4.2 && Math.max(...thickDust) <= 5.4,
    }).toEqual({
      dust: 7,
      thickDust: 13,
      dustWithin: true,
      thickDustLarger: true,
    });
  });

  it.each([1, 2] as const)(
    "keeps every speck of dust at %i layers inside its well",
    (layers) => {
      const well = coverageOf(WELL.commands, OVER_A_SQUARE);
      const specks = coverageOf(specksAt(layers), OVER_A_SQUARE);

      expect(
        specks.filter((covered, i) => covered === 1 && well[i] === 0).length,
      ).toBe(0);
    },
  );
});
