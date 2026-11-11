import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  polygon,
  ring,
  stroke,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { PORTAL_BADGES } from "../../../rules/levels/legend";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  everyScale,
} from "../../../testing/art_frames";
import { itemAt } from "../../items";
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

/** Returns how far a diamond reaches from its middle, half its width, or NaN for a command no polygon. */
function reachOf(command: DrawCommand | undefined): number {
  if (command?.kind !== "polygon") return NaN;
  const xs = command.points.map(({ x }) => x);
  return (Math.max(...xs) - Math.min(...xs)) / 2;
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
    "rings pair %i's portal in its body's color, 6 pixels wide, then cuts a badge 0.145 of the cell round out of the ring in the marks' color",
    (mark, inks) => {
      expect(portalIn(mark).commands.slice(88, 90)).toEqual([
        ring(MIDDLE, 0.36 * 62, { color: inks.body, width: 6 }),
        circle(BADGE, 0.145 * 62, { color: OWN_INKS.mark }),
      ]);
    },
  );

  it.each(PORTAL_BADGES.map((badge, tint) => [tint, badge] as const))(
    "marks the badge of a portal of tint %i with the one the legend names for its pair, a %s, in its pair's glyph's color: a solid dot, or a diamond 0.13 of the cell to its points, hollow, its band 0.035 wide round a hole of the disc's color",
    (tint, badge) => {
      const [layer = ""] = PORTAL_ART.layersOf(portal(tint));
      const shown = frameNamed(
        PORTAL_ART.frames(OWN_INKS, ART_SCALE),
        layer,
      ).commands.slice(90);
      const glyph = { color: itemAt(OWN_INKS.portals, tint).glyph };
      // A band 2 pixels wide takes √2 times as much off a diamond's reach.
      const drawn = {
        dot: [circle(BADGE, 0.084 * 62, glyph)],
        diamond: [
          polygon(diamond(BADGE, 0.13 * 62), glyph),
          polygon(diamond(BADGE, 0.13 * 62 - Math.SQRT2 * 2), {
            color: OWN_INKS.mark,
          }),
        ],
      };

      expect(shown).toEqual(drawn[badge]);
    },
  );

  it("brings a frame for each badge the legend names, and no more", () => {
    expect(PORTAL_ART.frames(ART_PALETTE, ART_SCALE)).toHaveLength(
      PORTAL_BADGES.length,
    );
  });

  it("draws its diamond's band 0.035 of a unit wide, 4 pixels at 128 device pixels a unit, 1 to a CSS pixel, taking √2 times as much off the diamond's reach", () => {
    const [band, hole] = portalIn(2, OWN_INKS, {
      unit: 128,
      pixelRatio: 1,
    }).commands.slice(-2);

    expect((reachOf(band) - reachOf(hole)) / Math.SQRT2).toBeCloseTo(4, 9);
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

describe.each(PIXEL_RATIOS)(
  "a portal's badges at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    it("tells the dot from the diamond by shape: the dot solid, the diamond hollow, its band a CSS pixel wide or more round a hole a CSS pixel or more between its sides, its points a CSS pixel or more past the dot's edge and within its disc", () => {
      const breaking = everyScale(pixelRatio)
        .filter((scale) => {
          const dot = portalIn(1, OWN_INKS, scale).commands.at(-1);
          const [disc, band, hole] = portalIn(
            2,
            OWN_INKS,
            scale,
          ).commands.slice(-3);
          const outer = reachOf(band);
          const inner = reachOf(hole);
          // A diamond's sides lie its reach over √2 from its middle.
          return !(
            dot?.kind === "circle" &&
            dot.color === FIRST.glyph &&
            disc?.kind === "circle" &&
            band?.color === SECOND.glyph &&
            hole?.color === OWN_INKS.mark &&
            Math.SQRT2 * inner >= pixelRatio &&
            (outer - inner) / Math.SQRT2 >= pixelRatio - 1e-9 &&
            outer - dot.radius >= pixelRatio &&
            outer <= disc.radius
          );
        })
        .map(({ unit }) => unit);

      expect(breaking).toEqual([]);
    });
  },
);

describe("a portal's diamond badge at every unit from 1 to 16 device pixels", () => {
  it("keeps its hole within the diamond, and a point up to 10, where the band, a pixel wide, takes all the diamond's reach", () => {
    const holes = Array.from({ length: 16 }, (_, i) => {
      const [band, hole] = portalIn(2, OWN_INKS, {
        unit: i + 1,
        pixelRatio: 1,
      }).commands.slice(-2);
      return { within: reachOf(hole) <= reachOf(band), reach: reachOf(hole) };
    });

    expect({
      within: holes.every(({ within }) => within),
      points: holes.slice(0, 10).map(({ reach }) => reach),
      open: holes.slice(10).every(({ reach }) => reach > 0),
    }).toEqual({
      within: true,
      points: Array.from({ length: 10 }, () => 0),
      open: true,
    });
  });
});
