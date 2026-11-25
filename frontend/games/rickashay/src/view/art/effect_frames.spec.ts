import { SHARD } from "@fz/brick-wall/view/art";
import { type ArtFrame, extentOf, widthOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE, billionths } from "../../testing/art_frames";
import { STREAK } from "../effects/timing";
import {
  EFFECT_FRAMES,
  PUFF,
  RALLY_RING,
  SPARK,
  STREAK_HEAD,
  SWIRL,
  effectFrames,
} from "./effect_frames";

/** The flourishes' frames in the specs' palette, at their scale. */
const FRAMES_DRAWN = effectFrames(ART_PALETTE, ART_SCALE);

/** Returns a frame of the flourishes', by name. */
function frameOf(name: string): ArtFrame {
  return frameNamed(FRAMES_DRAWN, name);
}

/** Returns how far a frame's drawing reaches either way from its middle, across and down, to a billionth. */
function reachOf(frame: ArtFrame): { across: number; down: number } {
  const areas = frame.commands.map(extentOf);
  return {
    across: billionths(
      Math.max(...areas.map(({ x, width }) => x + width)) - frame.width / 2,
    ),
    down: billionths(
      Math.max(...areas.map(({ y, height }) => y + height)) - frame.height / 2,
    ),
  };
}

/** Returns the widths of the lines a frame draws. */
function lineWidthsOf(frame: ArtFrame): number[] {
  return frame.commands.flatMap((command) =>
    command.kind === "ring" || command.kind === "line" ? [command.width] : [],
  );
}

describe("effectFrames", () => {
  it("names each flourish's frame", () => {
    expect(FRAMES_DRAWN.map((frame) => frame.name)).toEqual([
      EFFECT_FRAMES.shard,
      EFFECT_FRAMES.ring,
      EFFECT_FRAMES.streak,
      EFFECT_FRAMES.hotStreak,
      EFFECT_FRAMES.spark,
      EFFECT_FRAMES.swirl,
      EFFECT_FRAMES.puff,
    ]);
  });

  it("draws a shard in white, a shard wide, for a tint to color as its brick", () => {
    const shard = frameOf(EFFECT_FRAMES.shard);

    expect({
      side: [shard.width, shard.height],
      colors: shard.commands.map((command) => command.color),
    }).toEqual({
      side: [widthOf(SHARD, ART_SCALE), widthOf(SHARD, ART_SCALE)],
      colors: [0xffffff],
    });
  });

  it.each([
    ["the ring", EFFECT_FRAMES.ring, RALLY_RING],
    ["a swirl", EFFECT_FRAMES.swirl, SWIRL],
  ])(
    "draws %s about its middle in the fuzzball's color, its line as wide as it says",
    (_, name, { radius, width }) => {
      const frame = frameOf(name);

      expect(frame.commands).toEqual([
        {
          kind: "ring",
          x: frame.width / 2,
          y: frame.height / 2,
          radius: radius * ART_SCALE.unit,
          color: ART_PALETTE.fuzzball,
          width: widthOf(width, ART_SCALE),
        },
      ]);
    },
  );

  it.each([
    [EFFECT_FRAMES.streak, ART_PALETTE.streak.plain],
    [EFFECT_FRAMES.hotStreak, ART_PALETTE.streak.hot],
  ])(
    "draws %s along its width, as long as a streak and its head as wide as it says, in its color",
    (name, color) => {
      const streak = frameOf(name);

      expect({
        reach: reachOf(streak),
        colors: streak.commands.map((command) => command.color),
      }).toEqual({
        reach: {
          across: billionths((STREAK * ART_SCALE.unit) / 2),
          down: billionths(widthOf(STREAK_HEAD, ART_SCALE) / 2),
        },
        colors: [color],
      });
    },
  );

  it("draws a spark's rays in the sparks' color, reaching as far as a spark does", () => {
    const spark = frameOf(EFFECT_FRAMES.spark);
    const half = widthOf(SPARK.width, ART_SCALE) / 2;

    expect({
      reach: reachOf(spark).across,
      colors: new Set(spark.commands.map((command) => command.color)),
    }).toEqual({
      reach: billionths(SPARK.reach * ART_SCALE.unit + half),
      colors: new Set([ART_PALETTE.spark]),
    });
  });

  it("draws a puff in the field's text, as wide as a puff", () => {
    const puff = frameOf(EFFECT_FRAMES.puff);

    expect({
      reach: reachOf(puff).across,
      colors: puff.commands.map((command) => command.color),
    }).toEqual({
      reach: billionths((PUFF * ART_SCALE.unit) / 2),
      colors: [ART_PALETTE.text],
    });
  });

  it("draws the rings' and the sparks' lines a CSS pixel wide at least", () => {
    const tiny = effectFrames(ART_PALETTE, { unit: 4, pixelRatio: 3 });
    const widths = [
      EFFECT_FRAMES.ring,
      EFFECT_FRAMES.swirl,
      EFFECT_FRAMES.spark,
    ].flatMap((name) => lineWidthsOf(frameNamed(tiny, name)));

    expect(Math.min(...widths)).toBe(3);
  });
});
