import {
  type ArtFrame,
  type ArtScale,
  type Point,
  extentOf,
  outlineRoundRect,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_FRAMES,
  ART_PALETTE,
  ART_SCALE,
  billionths,
  inBillionths,
} from "../../../testing/art_frames";
import { atlasFrames } from "../atlas_frames";
import { FRAMES } from "../frames";
import { bandAlong, cellOf } from "../symbols";
import { type ZapperKind, zapperArt } from "./zapper";

const ZAPPER = ART_PALETTE.kinds.rowZapper;

/** A palette in which each zapper has inks of its own, unlike the game's, so a spec sees which a zapper reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    rowZapper: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
    columnZapper: { body: 0x001100, face: 0x002200, glyph: 0x003300 },
  },
};

/** Returns a zapper of a kind. */
function zapper(kind: ZapperKind) {
  return { kind, tint: 0, hits: 1, full: 1, plates: 0 } as const;
}

/**
 * Returns the points of each shape of a zapper's bolt, to a billionth of a
 * pixel: those it fills in its glyph's color after its outline, which its
 * body's color, the same, fills first.
 */
function boltOf(frame: ArtFrame): readonly (readonly Point[])[] {
  return drawnIn(frame, "polygon", ZAPPER.glyph)
    .slice(1)
    .map((command) =>
      command.kind === "polygon"
        ? command.points.map(({ x, y }) => ({
            x: billionths(x),
            y: billionths(y),
          }))
        : [],
    );
}

describe.each([
  ["rowZapper", FRAMES.zapper("row")],
  ["columnZapper", FRAMES.zapper("column")],
] as const)("zapperArt for a %s", (kind, name) => {
  const art = zapperArt(kind);
  const frame = frameNamed(ART_FRAMES, name);

  it(`shows it as its one frame, ${name}`, () => {
    expect(art.layersOf(zapper(kind))).toEqual([name]);
  });

  it("gives its shards its own body's color", () => {
    expect(art.colorOf(zapper(kind), OWN_INKS)).toBe(OWN_INKS.kinds[kind].body);
  });

  it("draws in its own inks, its face's, its body's and its glyph's", () => {
    const [own] = art.frames(OWN_INKS, ART_SCALE);
    const { body, face, glyph } = OWN_INKS.kinds[kind];

    expect(new Set(own?.commands.map((command) => command.color))).toEqual(
      new Set([body, face, glyph]),
    );
  });

  it("brings its one frame to the atlas", () => {
    expect(art.frames(ART_PALETTE, ART_SCALE).map((each) => each.name)).toEqual(
      [name],
    );
  });

  it("fills its tile in its face's color, a whole number of pixels in from its cell", () => {
    expect(drawnIn(frame, "roundRect", ZAPPER.face)).toEqual([
      {
        kind: "roundRect",
        x: 4,
        y: 4,
        width: 54,
        height: 54,
        radius: 0.12 * 62,
        color: ZAPPER.face,
      },
    ]);
  });

  it("outlines its tile in its body's color, as a band a line wide about its edge", () => {
    const [outline] = drawnIn(frame, "polygon", ZAPPER.body);

    expect(outline).toEqual(
      outlineRoundRect({ x: 4, y: 4, width: 54, height: 54 }, 0.12 * 62, {
        color: ZAPPER.body,
        width: 2,
      }),
    );
  });

  it("draws its bolt, a shaft and two arrowheads, inside its outline", () => {
    const bolt = boltOf(frame);

    expect({
      shapes: bolt.length,
      outside: bolt
        .flat()
        .filter(({ x, y }) => Math.min(x, y) < 5 || Math.max(x, y) > 57),
    }).toEqual({ shapes: 3, outside: [] });
  });
});

describe("zapperArt's tile", () => {
  /** Returns the row zapper's frame at a scale. */
  function rowAt(scale: ArtScale): ArtFrame {
    return frameNamed(atlasFrames(ART_PALETTE, scale), FRAMES.zapper("row"));
  }

  /** Returns how far in from a cell a zapper's outline lies at each side, left, top, right and bottom. */
  function gapsAt(scale: ArtScale): readonly number[] {
    const [outline] = drawnIn(rowAt(scale), "polygon", ZAPPER.body);
    const { x, y, width, height } = inBillionths(
      outline ? extentOf(outline) : { x: NaN, y: NaN, width: NaN, height: NaN },
    );
    const side = cellOf(scale).width;
    return [x, y, side - x - width, side - y - height];
  }

  it.each([
    [{ unit: 25, pixelRatio: 1 }, 2],
    [{ unit: 72, pixelRatio: 3 }, 3],
    [ART_SCALE, 3],
  ])(
    "keeps its outline as far in from its cell on every side, at a unit of %o: %i pixels",
    (scale, gap) => {
      expect(gapsAt(scale)).toEqual([gap, gap, gap, gap]);
    },
  );

  it("fills its face about its outline's own edge, so none of it shows past the outline", () => {
    expect(
      drawnIn(rowAt({ unit: 72, pixelRatio: 3 }), "roundRect", ZAPPER.face),
    ).toMatchObject([{ x: 4.5, y: 4.5, width: 63, height: 63 }]);
  });

  it.each([
    {
      unit: 36,
      pixelRatio: 1.5,
      outline: outlineRoundRect(
        { x: 2, y: 2, width: 32, height: 32 },
        0.12 * 36,
        { color: ZAPPER.body, width: 2 },
      ),
    },
    {
      unit: 72,
      pixelRatio: 3,
      outline: outlineRoundRect(
        { x: 4.5, y: 4.5, width: 63, height: 63 },
        0.12 * 72,
        { color: ZAPPER.body, width: 3 },
      ),
    },
  ])(
    "outlines it a CSS pixel wide at least, its band's edges on whole pixels, at $unit device pixels a unit, $pixelRatio to a CSS pixel",
    ({ unit, pixelRatio, outline }) => {
      expect(
        drawnIn(rowAt({ unit, pixelRatio }), "polygon", ZAPPER.body)[0],
      ).toEqual(outline);
    },
  );
});

describe("zapperArt's bolts", () => {
  const row = boltOf(frameNamed(ART_FRAMES, FRAMES.zapper("row")));
  const column = boltOf(frameNamed(ART_FRAMES, FRAMES.zapper("column")));

  it("lays the row's along its row, wider than it is tall", () => {
    const xs = row.flat().map(({ x }) => x);
    const ys = row.flat().map(({ y }) => y);

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(
      2 * (Math.max(...ys) - Math.min(...ys)),
    );
  });

  it("bands the row's shaft along a zigzag about its cell's middle, 0.092 of the cell wide", () => {
    const zigzag = [
      [-0.28, 0.03],
      [-0.04, -0.09],
      [0.04, 0.09],
      [0.28, -0.03],
    ].map(([across = 0, down = 0]) => ({
      x: 31 + across * 62,
      y: 31 + down * 62,
    }));

    expect(row[0]).toEqual(
      bandAlong(zigzag, 0.092 * 62).map(({ x, y }) => ({
        x: billionths(x),
        y: billionths(y),
      })),
    );
  });

  it("turns the column's a quarter turn from the row's, about the cell's middle", () => {
    const turned = row.map((points) =>
      points.map(({ x, y }) => ({ x: billionths(62 - y), y: billionths(x) })),
    );

    expect(column).toEqual(turned);
  });
});
