import { mixColors } from "@fz/phaser/color";
import {
  type ArtFrame,
  type ArtScale,
  circle,
  ring,
  stroke,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES } from "../frames";
import { EIGHTH } from "../symbols";
import { BUMPER_ART } from "./bumper";

/** A palette in which the bumper has inks of its own, each unlike the others and the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    bumper: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

const { body, face, glyph } = OWN_INKS.kinds.bumper;

/** How a bumper looks as it stands, as it never breaks. */
const STANDING: KindLook = { tint: 0, hits: 0, full: 0, plates: 0 };

/** Returns the bumper's frame in a palette at a scale. */
function bumperIn(palette = OWN_INKS, scale: ArtScale = ART_SCALE): ArtFrame {
  return frameNamed(BUMPER_ART.frames(palette, scale), FRAMES.bumper);
}

/** Returns the widths of the lines a frame draws in a color, each once. */
function widthsIn(frame: ArtFrame, color: number): ReadonlySet<number> {
  return new Set(
    frame.commands.flatMap((command) =>
      (command.kind === "line" || command.kind === "ring") &&
      command.color === color
        ? [command.width]
        : [],
    ),
  );
}

describe("BUMPER_ART", () => {
  const frame = bumperIn();

  it("shows a bumper as its one frame", () => {
    expect(BUMPER_ART.layersOf(STANDING)).toEqual(["bumper"]);
  });

  it("gives a bumper's shards its own body's color", () => {
    expect(BUMPER_ART.colorOf(STANDING, OWN_INKS)).toBe(body);
  });

  it("brings its one frame to the atlas", () => {
    expect(
      BUMPER_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(["bumper"]);
  });

  it("kicks four ticks out toward its cell's corners in its own body's color, each 3 pixels wide and round at its ends, from 0.435 of the cell from its middle to 0.495", () => {
    const tick = (across: number, down: number) =>
      stroke(
        [0.435, 0.495].map((reach) => ({
          x: 31 + across * (reach * 62),
          y: 31 + down * (reach * 62),
        })),
        { color: body, width: 3 },
      );

    expect(frame.commands.slice(0, 12)).toEqual([
      ...tick(EIGHTH, EIGHTH),
      ...tick(-EIGHTH, EIGHTH),
      ...tick(-EIGHTH, -EIGHTH),
      ...tick(EIGHTH, -EIGHTH),
    ]);
  });

  it("stands its disc in its own face's color a little above its middle, on a shadow of it darker, then cuts its ring out of it in its glyph's, under a cap lighter", () => {
    const disc = { x: 31, y: 0.485 * 62 };

    expect(frame.commands.slice(12)).toEqual([
      circle({ x: 31, y: 0.485 * 62 + 0.035 * 62 }, 0.37 * 62, {
        color: mixColors(0x000000, face, 0.28),
      }),
      circle(disc, 0.37 * 62, { color: face }),
      ring(disc, 0.24 * 62, { color: glyph, width: 5 }),
      circle(disc, 0.105 * 62, { color: mixColors(0xffffff, face, 0.52) }),
    ]);
  });

  it("draws its ticks 0.05 of a cell wide and its ring 0.075, 6 and 10 pixels at 128 device pixels a unit, 1 to a CSS pixel", () => {
    const large = bumperIn(OWN_INKS, { unit: 128, pixelRatio: 1 });

    expect({
      ticks: widthsIn(large, body),
      ring: widthsIn(large, glyph),
    }).toEqual({ ticks: new Set([6]), ring: new Set([10]) });
  });
});
