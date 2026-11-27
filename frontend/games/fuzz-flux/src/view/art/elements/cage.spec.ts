import { type ArtFrame, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import { type Grid, coverageOf } from "../../../testing/coverage";
import { FRAMES } from "../frame_names";
import { wellFrame } from "../well";
import { cageFrames } from "./cage";

/** The cage and its bar flying in the specs' palette, at their scale, a device pixel to each of the design's units. */
const FRAMES_DRAWN = cageFrames(ART_PALETTE, ART_SCALE);

/** The cage. */
const CAGE = frameNamed(FRAMES_DRAWN, FRAMES.cage);

/** How far in from the cage's middle the frame's line starts, in the design's units: the middle of its line, less half its width. */
const FRAME_INSIDE = 41 - 9 / 2;

/** Returns a grid of points over a frame, two to a device pixel. */
function gridOver({ width, height }: ArtFrame): Grid {
  return {
    from: { x: 0, y: 0 },
    step: 0.5,
    across: 2 * width + 1,
    down: 2 * height + 1,
  };
}

describe("cageFrames", () => {
  it("draws a cage, then a bar of one opened", () => {
    expect(FRAMES_DRAWN.map(({ name }) => name)).toEqual([
      FRAMES.cage,
      FRAMES.cageBar,
    ]);
  });

  it("runs 4 bars down the cage in the bars' ink, each 6.5 of the design's units wide, 16 apart about its middle", () => {
    const bars = CAGE.commands.filter(
      ({ color }) => color === ART_PALETTE.cage.bars,
    );

    expect(
      bars.map((bar) => {
        const { x, width } = extentOf(bar);
        return { across: x + width / 2 - CAGE.width / 2, width };
      }),
    ).toEqual([
      { across: -24, width: 6.5 },
      { across: -8, width: 6.5 },
      { across: 8, width: 6.5 },
      { across: 24, width: 6.5 },
    ]);
  });

  it("draws its frame last, in the frame's steel, over each bar's ends", () => {
    const frame = CAGE.commands.slice(-1);
    const grid = gridOver(CAGE);
    const framed = coverageOf(frame, grid);
    const barred = coverageOf(CAGE.commands.slice(0, -1), grid);

    const showing = [...barred.keys()].filter(
      (point) => barred[point] === 1 && framed[point] === 0,
    );

    expect({
      colors: frame.map(({ color }) => color),
      showingInside: showing.every((point) => {
        const down = Math.floor(point / grid.across) * grid.step;
        return Math.abs(down - CAGE.height / 2) <= FRAME_INSIDE;
      }),
    }).toEqual({ colors: [ART_PALETTE.cage.frame], showingInside: true });
  });

  it("keeps the cage within its square's well", () => {
    const well = wellFrame(ART_PALETTE, ART_SCALE);

    expect({
      across: CAGE.width <= well.width,
      down: CAGE.height <= well.height,
    }).toEqual({ across: true, down: true });
  });

  it("draws a bar flying 7 of the design's units wide and 72 long, in the frame's steel", () => {
    const bars = frameNamed(FRAMES_DRAWN, FRAMES.cageBar).commands.map(
      (bar) => {
        const { width, height } = extentOf(bar);
        return { width, height, color: bar.color };
      },
    );

    expect(bars).toEqual([
      { width: 7, height: 72, color: ART_PALETTE.cage.frame },
    ]);
  });
});
