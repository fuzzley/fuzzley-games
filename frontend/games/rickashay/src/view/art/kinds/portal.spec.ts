import { TINT } from "@fz/brick-wall/view/inks";
import { portalMark } from "@fz/phaser/bricks";
import { mixColors } from "@fz/phaser/color";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import type { WallPalette } from "../../colors/palette";
import type { KindLook } from "../art";
import { cellOf } from "../cells";
import { FRAMES, type PortalMark } from "../frames";
import { PORTAL_ART, PORTAL_GLOW, portalInks } from "./portal";

/** A palette whose every color a portal reads is one no other takes, so a spec sees which it reads. */
const OWN: WallPalette = {
  ...ART_PALETTE,
  tints: ART_PALETTE.tints.map((_, tint) => 0x100000 + tint),
  text: 0x200000,
  mark: 0x300000,
  portalEye: 0x400000,
};

/** Returns a portal's look as its art reads it, by its tint, its pair's place: the first pair's 0, the second's 1. */
function portal(tint: number): KindLook {
  return { tint, hits: 0, full: 0, plates: 0 };
}

/** Returns a pair's frame in a palette at a scale. */
function portalIn(
  mark: PortalMark,
  palette: WallPalette = OWN,
  scale: ArtScale = ART_SCALE,
): ArtFrame {
  return frameNamed(PORTAL_ART.frames(palette, scale), FRAMES.portal(mark));
}

describe("PORTAL_ART's layers", () => {
  it.each([
    [0, ["portal-1"]],
    [1, ["portal-2"]],
  ])("shows a portal of tint %i as its pair's frame, %o", (tint, layers) => {
    expect(PORTAL_ART.layersOf(portal(tint))).toEqual(layers);
  });

  it("finds a portal's layers without making them", () => {
    expect(PORTAL_ART.layersOf(portal(1))).toBe(PORTAL_ART.layersOf(portal(1)));
  });

  it("refuses a portal of a tint no pair has", () => {
    expect(() => PORTAL_ART.layersOf(portal(2))).toThrow(RangeError);
  });
});

describe("PORTAL_ART's frames", () => {
  it("brings a frame for each pair, the first's then the second's, each a cell", () => {
    expect(
      PORTAL_ART.frames(ART_PALETTE, ART_SCALE).map(
        ({ name, width, height }) => [name, width, height],
      ),
    ).toEqual([
      ["portal-1", 62, 62],
      ["portal-2", 62, 62],
    ]);
  });

  it.each([
    [1, "dot", 0],
    [2, "diamond", 1],
  ] as const)(
    "draws pair %i as @fz/phaser's portal with a %s on its ring, in its inks, on no tile",
    (mark, badge, tint) => {
      expect(portalIn(mark).commands).toEqual(
        portalMark(cellOf(ART_SCALE), badge, portalInks(tint, OWN), 2),
      );
    },
  );

  it("draws its lines at the scale's pixel ratio", () => {
    const scale = { unit: 72, pixelRatio: 3 };

    expect(portalIn(2, OWN, scale).commands).toEqual(
      portalMark(cellOf(scale), "diamond", portalInks(1, OWN), 3),
    );
  });
});

describe("portalInks", () => {
  it.each([
    [0, "violet"],
    [1, "teal"],
  ] as const)(
    "rings a portal of tint %i in its pair's ink, %s, round an eye in the page's color, lights its arms and badge with the field's text, and cuts its badge's disc out in the marks' color",
    (tint, ink) => {
      const ring = 0x100000 + TINT[ink];

      expect(portalInks(tint, OWN)).toEqual({
        middle: 0x400000,
        ring,
        glyph: mixColors(0x200000, ring, PORTAL_GLOW),
        disc: 0x300000,
      });
    },
  );

  it("lights the arms with a third of the field's text, as the art's", () => {
    expect(PORTAL_GLOW).toBe(0.34);
  });
});
