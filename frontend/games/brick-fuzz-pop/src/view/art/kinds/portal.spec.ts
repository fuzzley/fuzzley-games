import {
  type ArtFrame,
  type ArtScale,
  type Point,
  circle,
  polygon,
  ring,
  stroke,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES, type PortalMark } from "../frames";
import { EIGHTH, diamond, turned } from "../symbols";
import { PORTAL_ART } from "./portal";

/** A palette in which each pair of portals has inks of its own, each unlike the others and the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  mark: 0x000044,
  portals: [
    { body: 0x110000, face: 0x120000, glyph: 0x130000 },
    { body: 0x210000, face: 0x220000, glyph: 0x230000 },
  ] as const,
};

const [FIRST, SECOND] = OWN_INKS.portals;

/** Returns a portal's look as its art reads it, by its tint, its pair's place: the first pair's 0, the second's 1. */
function portal(tint: number): KindLook {
  return { tint, hits: 0, full: 0, plates: 0 };
}

/** Returns a pair's portal's frame in a palette at a scale. */
function portalIn(
  mark: PortalMark,
  palette = OWN_INKS,
  scale: ArtScale = ART_SCALE,
): ArtFrame {
  return frameNamed(PORTAL_ART.frames(palette, scale), FRAMES.portal(mark));
}

/** Its middle at 31 CSS pixels a unit, 2 device pixels to one. */
const MIDDLE = { x: 31, y: 31 };

/** Its badge's middle at 31 CSS pixels a unit, on its ring up and to its right. */
const BADGE = {
  x: 31 + EIGHTH * 0.36 * 62,
  y: 31 - EIGHTH * 0.36 * 62,
};

/** Returns an arm's points from where it starts, spiralling out from 0.075 of the cell from the middle to 0.27, through 215 degrees, at 31 CSS pixels a unit. */
function armFrom(start: number): readonly Point[] {
  return Array.from({ length: 15 }, (_, i) => {
    const along = i / 14;
    const way = turned(
      { x: (0.075 + (0.27 - 0.075) * along) * 62, y: 0 },
      start + 215 * along,
    );
    return { x: 31 + way.x, y: 31 + way.y };
  });
}

describe("PORTAL_ART", () => {
  it.each([
    [0, ["portal-1"]],
    [1, ["portal-2"]],
  ])("shows a portal of tint %i as its pair's frame, %o", (tint, layers) => {
    expect(PORTAL_ART.layersOf(portal(tint))).toEqual(layers);
  });

  it("makes nothing to find a portal's layers, handing back the list it made once", () => {
    expect(PORTAL_ART.layersOf(portal(1))).toBe(PORTAL_ART.layersOf(portal(1)));
  });

  it("refuses a portal of a tint no pair has", () => {
    expect(() => PORTAL_ART.layersOf(portal(2))).toThrow(RangeError);
  });

  it("brings a frame for each pair to the atlas, the first's then the second's", () => {
    expect(
      PORTAL_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(["portal-1", "portal-2"]);
  });

  it.each([
    [1, FIRST],
    [2, SECOND],
  ] as const)(
    "draws pair %i's dark middle in its face's color, then three arms spiralling out of it in its glyph's, 3 pixels wide, round at their ends and bends",
    (mark, inks) => {
      const arm = { color: inks.glyph, width: 3 };

      expect(portalIn(mark).commands.slice(0, 88)).toEqual([
        circle(MIDDLE, 0.33 * 62, { color: inks.face }),
        ...stroke(armFrom(0), arm),
        ...stroke(armFrom(120), arm),
        ...stroke(armFrom(240), arm),
      ]);
    },
  );

  it.each([
    [1, FIRST],
    [2, SECOND],
  ] as const)(
    "rings pair %i's portal in its body's color, 6 pixels wide, then cuts a badge out of the ring in the marks' color",
    (mark, inks) => {
      expect(portalIn(mark).commands.slice(88, 90)).toEqual([
        ring(MIDDLE, 0.36 * 62, { color: inks.body, width: 6 }),
        circle(BADGE, 0.135 * 62, { color: OWN_INKS.mark }),
      ]);
    },
  );

  it("marks the first pair's badge with a dot, the second's with a diamond, each in its pair's glyph's color", () => {
    expect([portalIn(1).commands.at(-1), portalIn(2).commands.at(-1)]).toEqual([
      circle(BADGE, 0.084 * 62, { color: FIRST.glyph }),
      polygon(diamond(BADGE, 0.104 * 62), { color: SECOND.glyph }),
    ]);
  });

  it("draws its arms 0.044 of a cell wide and its ring 0.1, 6 and 13 pixels at 128 device pixels a unit, 1 to a CSS pixel", () => {
    const large = portalIn(1, OWN_INKS, { unit: 128, pixelRatio: 1 });

    expect(
      new Set(
        large.commands.flatMap((command) =>
          command.kind === "line" || command.kind === "ring"
            ? [command.width]
            : [],
        ),
      ),
    ).toEqual(new Set([6, 13]));
  });
});
