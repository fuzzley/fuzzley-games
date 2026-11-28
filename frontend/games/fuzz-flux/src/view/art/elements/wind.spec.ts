import type { CircleCommand, LineCommand } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
} from "../../../testing/art_frames";
import { LONGEST_GUST_LINE } from "../../effects/gust_line";
import { FRAMES } from "../frame_names";
import { windFrames } from "./wind";

/** A line of wind, in the specs' palette at their scale, a pixel to each of the design's units. */
const LINE = frameNamed(windFrames(ART_PALETTE, ART_SCALE), FRAMES.gustLine);

describe("windFrames", () => {
  it("draws a line of wind as long as a line grows and a twentieth of a square wide, across", () => {
    const strokes = LINE.commands.filter(
      (command): command is LineCommand => command.kind === "line",
    );

    expect(
      strokes.map(({ from, to, width }) => ({
        across: billionths(to.x - from.x),
        down: billionths(to.y - from.y),
        width,
      })),
    ).toEqual([
      { across: billionths(LONGEST_GUST_LINE * 100), down: 0, width: 5 },
    ]);
  });

  it("rounds its ends", () => {
    const ends = LINE.commands.filter(
      (command): command is CircleCommand => command.kind === "circle",
    );

    expect(ends.map(({ radius }) => radius)).toEqual([2.5, 2.5]);
  });

  it("draws it in the muted text", () => {
    expect(new Set(LINE.commands.map(({ color }) => color))).toEqual(
      new Set([ART_PALETTE.gust]),
    );
  });
});
