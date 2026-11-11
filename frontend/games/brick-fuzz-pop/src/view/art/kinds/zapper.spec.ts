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
import type { KindLook } from "../art";
import { atlasFrames } from "../atlas_frames";
import { FRAMES } from "../frames";
import { bandAlong, cellOf } from "../symbols";
import { zapperArt } from "./zapper";

const ZAPPER = ART_PALETTE.kinds.rowZapper;

/** A palette in which each zapper has inks of its own, unlike the game's, so a spec sees which a zapper reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    rowZapper: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
    columnZapper: { body: 0x001100, face: 0x002200, glyph: 0x003300 },
    crossZapper: { body: 0x000011, face: 0x000022, glyph: 0x000033 },
    xZapper: { body: 0x111100, face: 0x222200, glyph: 0x333300 },
  },
};

/** How a zapper looks as it stands, whole, as it breaks at its first hit. */
const WHOLE: KindLook = { tint: 0, hits: 1, full: 1, plates: 0 };

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
  { kind: "rowZapper", name: FRAMES.zapper("row"), bolts: 1, marks: [] },
  { kind: "columnZapper", name: FRAMES.zapper("column"), bolts: 1, marks: [] },
  {
    kind: "crossZapper",
    name: FRAMES.zapper("cross"),
    bolts: 2,
    marks: [ART_PALETTE.text],
  },
  { kind: "xZapper", name: FRAMES.zapper("x"), bolts: 2, marks: [] },
] as const)("zapperArt for a $kind", ({ kind, name, bolts, marks }) => {
  const art = zapperArt(kind);
  const frame = frameNamed(art.frames(ART_PALETTE, ART_SCALE), name);

  it(`shows it as its one frame, ${name}`, () => {
    expect(art.layersOf(WHOLE)).toEqual([name]);
  });

  it("gives its shards its own body's color", () => {
    expect(art.colorOf(WHOLE, OWN_INKS)).toBe(OWN_INKS.kinds[kind].body);
  });

  it(`draws in its own inks, its face's, its body's and its glyph's, and ${String(marks.length)} of the palette's`, () => {
    const [own] = art.frames(OWN_INKS, ART_SCALE);
    const { body, face, glyph } = OWN_INKS.kinds[kind];

    expect(new Set(own?.commands.map((command) => command.color))).toEqual(
      new Set([body, face, glyph, ...marks]),
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

  it(`draws ${bolts === 1 ? "a bolt" : "two bolts"}, each a shaft and two arrowheads, inside its outline`, () => {
    const bolt = boltOf(frame);

    expect({
      shapes: bolt.length,
      outside: bolt
        .flat()
        .filter(({ x, y }) => Math.min(x, y) < 5 || Math.max(x, y) > 57),
    }).toEqual({ shapes: 3 * bolts, outside: [] });
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

describe("zapperArt's crossed bolts", () => {
  const cross = frameNamed(
    zapperArt("crossZapper").frames(ART_PALETTE, ART_SCALE),
    FRAMES.zapper("cross"),
  );
  const x = frameNamed(
    zapperArt("xZapper").frames(ART_PALETTE, ART_SCALE),
    FRAMES.zapper("x"),
  );

  /** Returns a straight shaft about the cell's middle, its half length's reach across and down, so wide, to a billionth. */
  function shaft(
    across: number,
    down: number,
    width: number,
  ): readonly Point[] {
    return bandAlong(
      [
        { x: 31 - across, y: 31 - down },
        { x: 31 + across, y: 31 + down },
      ],
      width,
    ).map((point) => ({ x: billionths(point.x), y: billionths(point.y) }));
  }

  it("runs the cross's shafts straight along its row and its column, 0.56 of the cell long", () => {
    const bolt = boltOf(cross);

    expect([bolt[0], bolt[3]]).toEqual([
      shaft(0.28 * 62, 0, 0.092 * 62),
      shaft(0, 0.28 * 62, 0.092 * 62),
    ]);
  });

  it("marks where the cross's shafts cross with a diamond in the field's text, on a rim of its face, both over the shafts", () => {
    const diamond = (reach: number) =>
      [
        { x: 31, y: 31 - reach },
        { x: 31 + reach, y: 31 },
        { x: 31, y: 31 + reach },
        { x: 31 - reach, y: 31 },
      ].map((point) => ({ x: billionths(point.x), y: billionths(point.y) }));
    const pointsIn = (color: number) =>
      drawnIn(cross, "polygon", color).map((command) =>
        command.kind === "polygon"
          ? command.points.map((point) => ({
              x: billionths(point.x),
              y: billionths(point.y),
            }))
          : [],
      );

    expect({
      rim: pointsIn(ZAPPER.face),
      core: pointsIn(ART_PALETTE.text),
      last: cross.commands
        .slice(-2)
        .map(({ kind, color }) => ({ kind, color })),
    }).toEqual({
      rim: [diamond(0.155 * 62)],
      core: [diamond(0.1 * 62)],
      last: [
        { kind: "polygon", color: ZAPPER.face },
        { kind: "polygon", color: ART_PALETTE.text },
      ],
    });
  });

  it("lays the X's shafts corner to corner, an eighth of a turn either way of its row, 1.2 times a row's length and width", () => {
    const reach = 0.28 * 1.2 * 62 * Math.SQRT1_2;
    const bolt = boltOf(x);

    expect([bolt[0], bolt[3]]).toEqual([
      shaft(reach, reach, 0.092 * 1.2 * 62),
      shaft(reach, -reach, 0.092 * 1.2 * 62),
    ]);
  });

  it("points the X's arrowheads at its tile's corners, 0.48 of the cell from its middle along each diagonal", () => {
    const tip = 0.4 * 1.2 * 62 * Math.SQRT1_2;
    const tips = boltOf(x)
      .filter((_, i) => i % 3 !== 0)
      .map((head) => head[0]);

    expect(tips).toEqual(
      [
        { x: 31 + tip, y: 31 + tip },
        { x: 31 - tip, y: 31 - tip },
        { x: 31 + tip, y: 31 - tip },
        { x: 31 - tip, y: 31 + tip },
      ].map((point) => ({ x: billionths(point.x), y: billionths(point.y) })),
    );
  });
});
