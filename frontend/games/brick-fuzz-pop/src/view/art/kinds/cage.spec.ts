import { eyesCommands, fuzzballCommands } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  extentOf,
  polygon,
  rect,
  shifted,
  within,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import { type CageLook, FRAMES, type Ink } from "../frames";
import { ACROSS, bandAlong, cellOf } from "../symbols";
import { tileBody, tileCommands } from "./brick";
import { CAGE_ART } from "./cage";

const CAGE = ART_PALETTE.kinds.cage;

/** A palette in which the cage has inks of its own, unlike the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    cage: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

/** The crack a hit leaves in a cage's frame, as shares of its tile's body. */
const CRACK = [
  [0.75, 0],
  [0.696, 0.054],
  [0.772, 0.098],
  [0.728, 0.174],
] as const;

/** Returns a cage's bars, whole or hit, at a scale, in a palette. */
function barsAt(
  look: CageLook,
  scale: ArtScale = ART_SCALE,
  palette = ART_PALETTE,
): ArtFrame {
  return frameNamed(CAGE_ART.frames(palette, scale), FRAMES.cage(look));
}

/** Returns a cage's tile and inside with its friend in an ink, in a palette at a scale. */
function cagedAt(
  ink: Ink,
  palette = ART_PALETTE,
  scale: ArtScale = ART_SCALE,
): ArtFrame {
  return frameNamed(CAGE_ART.frames(palette, scale), FRAMES.caged(ink));
}

/** Returns a cage of two hits with some left, of a tint. */
function cage(hits: number, tint = 0) {
  return { tint, hits, full: 2, plates: 0 } as const;
}

/** Returns a bar of the cage at 31 CSS pixels a unit, 2 device pixels to one, from its left edge, in a color: 3 pixels wide, from 12 pixels down to 50. */
function barAt(left: number, color: number = CAGE.glyph) {
  return rect({ x: left, y: 12, width: 3, height: 38 }, { color });
}

/** Returns the crack a hit cage shows at a scale, a band so wide. */
function crackAt(scale: ArtScale, width: number): DrawCommand {
  return polygon(
    bandAlong(within(tileBody(cellOf(scale)), CRACK), width, ACROSS),
    { color: ART_PALETTE.mark },
  );
}

describe("CAGE_ART", () => {
  const hit = barsAt("hit");

  it.each([
    [2, 0, ["caged-0", "cage-whole"]],
    [1, 0, ["caged-0", "cage-hit"]],
    [2, 5, ["caged-5", "cage-whole"]],
    [1, 3, ["caged-3", "cage-hit"]],
  ])(
    "shows a cage with %i hits of its 2 left, of tint %i, as its friend's frame under its bars, %o",
    (hits, tint, layers) => {
      expect(CAGE_ART.layersOf(cage(hits, tint))).toEqual(layers);
    },
  );

  it("makes nothing to find a cage's layers, handing back the list it made once", () => {
    expect(CAGE_ART.layersOf(cage(1, 4))).toBe(CAGE_ART.layersOf(cage(1, 4)));
  });

  it("refuses a cage of a tint no friend's ink has", () => {
    expect(() => CAGE_ART.layersOf(cage(2, 8))).toThrow(RangeError);
  });

  it("gives a cage's shards its own body's color", () => {
    expect(CAGE_ART.colorOf(cage(2), OWN_INKS)).toBe(OWN_INKS.kinds.cage.body);
  });

  it("brings a frame of its tile and friend for each of the friends' 8 inks, then its bars whole and hit", () => {
    expect(
      CAGE_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual([
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((ink) => `caged-${String(ink)}`),
      "cage-whole",
      "cage-hit",
    ]);
  });

  it("stands its friend on the chunky tile in its own body's color, its inside in its own face's", () => {
    const own = cagedAt(5, OWN_INKS);
    const { body, face } = OWN_INKS.kinds.cage;

    expect({
      tile: own.commands.slice(0, 3),
      inside: drawnIn(own, "roundRect", face).length,
    }).toEqual({ tile: tileCommands(cellOf(ART_SCALE), body), inside: 1 });
  });

  it("fills its inside in its face's color, its edges on whole pixels", () => {
    expect(cagedAt(0).commands[3]).toEqual({
      kind: "roundRect",
      x: 7,
      y: 12,
      width: 48,
      height: 38,
      radius: 0.03 * 62,
      color: CAGE.face,
    });
  });

  it.each([0, 5] as const)(
    "holds a friend in the friends' ink %i on its inside, 1.5 of the design's 100 units to a unit of the fuzzball's grid, its eyes cut out in the mark",
    (ink) => {
      const by = 0.015 * 62;
      const friend = [
        ...fuzzballCommands(by, { color: ART_PALETTE.friends[ink] ?? 0 }),
        ...eyesCommands(by, { color: ART_PALETTE.mark }),
      ].map((command) => shifted(command, { x: 31, y: 0.505 * 62 }));

      expect(cagedAt(ink).commands.slice(4)).toEqual(friend);
    },
  );

  it("stands four bars in its own glyph's color over its friend, each 3 pixels wide, on whole pixels", () => {
    const { glyph } = OWN_INKS.kinds.cage;

    expect(barsAt("whole", ART_SCALE, OWN_INKS).commands).toEqual([
      barAt(12, glyph),
      barAt(22, glyph),
      barAt(37, glyph),
      barAt(47, glyph),
    ]);
  });

  it.each([50, 75, 100, 128])(
    "keeps its inside and its bars as far from the cell's right as from its left, and from its bottom as from its top, at %i device pixels a unit",
    (unit) => {
      const scale = { unit, pixelRatio: 2 };
      const inside = cagedAt(0, ART_PALETTE, scale).commands.slice(3, 4);
      const bars = barsAt("whole", scale).commands;
      const edges = (command: DrawCommand) => {
        const { x, y, width, height } = extentOf(command);
        return {
          left: x,
          right: unit - x - width,
          top: y,
          bottom: unit - y - height,
        };
      };
      const shown = [...inside, ...bars].map(edges);
      const mirrored = [...inside, ...[...bars].reverse()].map(edges);

      expect({
        many: shown.length,
        across: shown.map(({ left }) => left),
        down: shown.map(({ top }) => top),
      }).toEqual({
        many: 5,
        across: mirrored.map(({ right }) => right),
        down: shown.map(({ bottom }) => bottom),
      });
    },
  );

  it("breaks its third bar once hit, each end bent aside as a band as wide as a bar", () => {
    const band = (points: readonly Point[]) =>
      polygon(bandAlong(points, 3), { color: CAGE.glyph });

    expect(hit.commands.slice(0, -1)).toEqual([
      barAt(12),
      barAt(22),
      band([
        { x: 38.5, y: 12 },
        { x: 38.5, y: 0.3 * 62 },
        { x: 38.5 + 0.08 * 62, y: 0.385 * 62 },
      ]),
      band([
        { x: 38.5, y: 50 },
        { x: 38.5, y: 0.72 * 62 },
        { x: 38.5 - 0.07 * 62, y: 0.64 * 62 },
      ]),
      barAt(47),
    ]);
  });

  it("cracks its frame once hit, from its tile's top edge down to its inside, cut out in the mark over its bars", () => {
    expect(hit.commands.at(-1)).toEqual(crackAt(ART_SCALE, 2));
  });

  it("draws its crack 0.032 of the cell wide, 4 pixels at 110 device pixels a unit, 1 to a CSS pixel, where 0.03 would be 3", () => {
    const scale = { unit: 110, pixelRatio: 1 };

    expect(barsAt("hit", scale).commands.at(-1)).toEqual(crackAt(scale, 4));
  });

  it("leaves its crack out at 29 CSS pixels a unit, where 31 shows it, but breaks its bar at both", () => {
    const at29 = barsAt("hit", { unit: 58, pixelRatio: 2 });
    const marks = (frame: ArtFrame) =>
      drawnIn(frame, "polygon", ART_PALETTE.mark).length;
    const bars = (frame: ArtFrame) =>
      drawnIn(frame, "polygon", CAGE.glyph).length;

    expect({
      29: { marks: marks(at29), bars: bars(at29) },
      31: { marks: marks(hit), bars: bars(hit) },
    }).toEqual({ 29: { marks: 0, bars: 2 }, 31: { marks: 1, bars: 2 } });
  });
});
