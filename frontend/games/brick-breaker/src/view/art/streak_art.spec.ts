import { extentOf } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { BALL_RADIUS } from "../../rules/tuning";
import { ART_FRAMES, ART_SCALE } from "../../testing/art_frames";
import { STREAK_FRAMES, STREAK_RING_RADIUS } from "./streak_art";

describe("a streak's frames", () => {
  it("draw a tail's dot in the atlas, white, half a ball wide", () => {
    const dot = frameNamed(ART_FRAMES, STREAK_FRAMES.dot);

    const [disc] = drawnIn(dot, "circle", 0xffffff);

    expect(disc && extentOf(disc).width).toBeCloseTo(
      BALL_RADIUS * ART_SCALE.unit,
    );
  });

  it("draw the ring about a ball in the atlas, white, reaching its widest", () => {
    const ring = frameNamed(ART_FRAMES, STREAK_FRAMES.ring);

    const [drawn] = drawnIn(ring, "ring", 0xffffff);

    expect(drawn && extentOf(drawn).width).toBeCloseTo(
      2 * STREAK_RING_RADIUS * ART_SCALE.unit,
    );
  });
});
