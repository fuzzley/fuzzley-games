import { mixColors } from "@fz/phaser/color";
import { circle, stroke } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES } from "../frames";
import { boltMark, cellOf } from "../symbols";
import { tileCommands } from "./brick";
import { WOOL_ART } from "./wool";

const WOOL = ART_PALETTE.kinds.wool;

/** The yarn's color: the wool's ink, about half white. */
const YARN = mixColors(0xffffff, WOOL.body, 0.52);

/** A palette in which the wool has inks of its own, unlike the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    wool: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

/** How a wool brick looks as it stands, whole, as it breaks at its first hit. */
const WHOLE: KindLook = { tint: 0, hits: 1, full: 1, plates: 0 };

describe("WOOL_ART", () => {
  const frame = frameNamed(
    WOOL_ART.frames(ART_PALETTE, ART_SCALE),
    FRAMES.wool,
  );
  const disc = circle({ x: 0.79 * 62, y: 0.21 * 62 }, 0.145 * 62, {
    color: WOOL.glyph,
  });

  it("shows a wool brick as its one frame", () => {
    expect(WOOL_ART.layersOf(WHOLE)).toEqual(["wool"]);
  });

  it("gives a wool brick's shards its own body's color", () => {
    expect(WOOL_ART.colorOf(WHOLE, OWN_INKS)).toBe(OWN_INKS.kinds.wool.body);
  });

  it("brings its one frame to the atlas", () => {
    expect(
      WOOL_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(["wool"]);
  });

  it("stands on the chunky tile in its own body's color", () => {
    const own = frameNamed(WOOL_ART.frames(OWN_INKS, ART_SCALE), FRAMES.wool);

    expect(own.commands.slice(0, 3)).toEqual(
      tileCommands(cellOf(ART_SCALE), OWN_INKS.kinds.wool.body),
    );
  });

  it("draws its yarn from its own body's color, and its disc in its own glyph's", () => {
    const own = frameNamed(WOOL_ART.frames(OWN_INKS, ART_SCALE), FRAMES.wool);
    const { body, glyph } = OWN_INKS.kinds.wool;

    expect({
      yarn: drawnIn(own, "line", mixColors(0xffffff, body, 0.52)).length,
      disc: drawnIn(own, "circle", glyph).length,
    }).toEqual({ yarn: 30, disc: 1 });
  });

  it("knits three rows of five stitches in its yarn, each a V two pixels wide, rounded at its ends and its foot", () => {
    const stitches = [0.29, 0.485, 0.68].flatMap((down) =>
      [0.18, 0.34, 0.5, 0.66, 0.82].flatMap((across) =>
        stroke(
          [
            { x: across * 62 - 0.062 * 62, y: down * 62 - 0.065 * 62 },
            { x: across * 62, y: down * 62 + 0.06 * 62 },
            { x: across * 62 + 0.062 * 62, y: down * 62 - 0.065 * 62 },
          ],
          { color: YARN, width: 2 },
        ),
      ),
    );

    expect(frame.commands.slice(3, 3 + stitches.length)).toEqual(stitches);
  });

  it("draws its yarn 0.04 of a cell wide, 5 pixels at 128 device pixels a unit, 1 to a CSS pixel", () => {
    const large = frameNamed(
      WOOL_ART.frames(ART_PALETTE, { unit: 128, pixelRatio: 1 }),
      FRAMES.wool,
    );

    expect(
      new Set(
        drawnIn(large, "line", YARN).map((command) =>
          command.kind === "line" ? command.width : NaN,
        ),
      ),
    ).toEqual(new Set([5]));
  });

  it("cuts a disc out of its top right corner, over the stitches there, then marks it with a lightning bolt in the sparks' color", () => {
    expect(frame.commands.slice(-2)).toEqual([
      disc,
      boltMark({ x: disc.x, y: disc.y }, 0.1 * 62, {
        color: ART_PALETTE.spark,
      }),
    ]);
  });
});
