import { type ArtFrame, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  SMALLEST_SCALE,
} from "../../testing/art_frames";
import { FRAMES, TIMES } from "./frame_names";
import { markFrames } from "./marks";

/** The marks in the specs' palette, at their scale. */
const MARKS = markFrames(ART_PALETTE, ART_SCALE);

/** Returns how far a frame's drawing stands off its middle, across and down. */
function offMiddleOf(frame: ArtFrame): { across: number; down: number } {
  const areas = frame.commands.map(extentOf);
  const left = Math.min(...areas.map(({ x }) => x));
  const right = Math.max(...areas.map(({ x, width }) => x + width));
  const top = Math.min(...areas.map(({ y }) => y));
  const bottom = Math.max(...areas.map(({ y, height }) => y + height));
  return {
    across: Math.abs((left + right) / 2 - frame.width / 2),
    down: Math.abs((top + bottom) / 2 - frame.height / 2),
  };
}

describe("markFrames", () => {
  it('draws "×2" to "×9", in their order', () => {
    expect(MARKS.map(({ name }) => name)).toEqual(
      TIMES.map((times) => FRAMES.times(times)),
    );
  });

  it.each(TIMES)(
    "draws \"×%i\" in the marks' color over a rim in the page's, about its middle to a hundredth of a square",
    (times) => {
      const mark = frameNamed(MARKS, FRAMES.times(times));
      const colors = mark.commands.map(({ color }) => color);
      const rim = colors.indexOf(ART_PALETTE.marks);

      expect({
        rim: new Set(colors.slice(0, rim)),
        mark: new Set(colors.slice(rim)),
        offMiddle:
          Math.max(...Object.values(offMiddleOf(mark))) <= ART_SCALE.unit / 100,
      }).toEqual({
        rim: new Set([ART_PALETTE.page]),
        mark: new Set([ART_PALETTE.marks]),
        offMiddle: true,
      });
    },
  );

  it('draws each mark taller than the one before, up to "×8", and "×9" as tall as "×8"', () => {
    const heights = MARKS.map(({ height }) => height);

    expect(
      heights.map((height, i) => Math.sign(height - (heights[i - 1] ?? 0))),
    ).toEqual([1, 1, 1, 1, 1, 1, 1, 0]);
  });

  it("draws every line of a mark and its rim a CSS pixel wide at least, at the smallest square", () => {
    const widths = markFrames(ART_PALETTE, SMALLEST_SCALE).flatMap(
      ({ commands }) =>
        commands.flatMap((command) =>
          command.kind === "line" ? [command.width] : [],
        ),
    );

    expect(Math.min(...widths)).toBeGreaterThanOrEqual(
      Math.ceil(SMALLEST_SCALE.pixelRatio),
    );
  });
});
