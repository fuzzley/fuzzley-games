import { itemAt } from "@fz/core/records";
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

  it("runs each bar from under the frame's line at the top to under it at the bottom", () => {
    const bars = CAGE.commands.slice(0, -1).map(extentOf);

    expect(
      bars.every(
        ({ y, height }) =>
          y <= CAGE.height / 2 - FRAME_INSIDE &&
          y + height >= CAGE.height / 2 + FRAME_INSIDE,
      ),
    ).toBe(true);
  });

  it("draws its frame 91 of the design's units across, its corners rounded 13 at the middle of its line", () => {
    const frame = itemAt(CAGE.commands, CAGE.commands.length - 1);
    const { x, y, width, height } = extentOf(frame);
    // The corner's curve crosses the diagonal from the frame's outer corner
    // 17.5 × (1 - 1/√2), about 5.13, in: one point is just outside it, and
    // one just inside.
    const corner = coverageOf([frame], {
      from: { x: x + 4.5, y: y + 4.5 },
      step: 1,
      across: 2,
      down: 2,
    });

    expect({ width, height, outside: corner[0], inside: corner[3] }).toEqual({
      width: 91,
      height: 91,
      outside: 0,
      inside: 1,
    });
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
