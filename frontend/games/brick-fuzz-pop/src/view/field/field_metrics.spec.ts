import { SHAPES, SMALLEST, shapesAt } from "@fz/dev/layout";
import { type Viewport, roomInside } from "@fz/phaser/layout";
import { viewport } from "@fz/phaser/testing/pure";
import { COLUMNS, LEAST_DEPTH, MOST_DEPTH } from "../../rules/tuning";
import { thirdsOf } from "../../rules/wall/wall";
import { boardCanvas, marginInsets } from "../../testing/canvases";
import {
  FLOOR_BAND,
  FRAME_CSS_PX,
  type FieldMetrics,
  LINTEL,
  MARGIN_CSS_PX,
  PANEL_GAP_CSS_PX,
  bandPixels,
  fieldMetrics,
  fieldShape,
  hasRoom,
  lintelPixels,
  toCanvas,
  toField,
} from "./field_metrics";

/** Describes a row of plan.md's table of shapes in "The field". */
interface ShapeRow {
  readonly name: string;
  /** The window, in CSS pixels. */
  readonly window: readonly [width: number, height: number];
  /** The room the bar and the margin leave the field, in CSS pixels. */
  readonly room: readonly [width: number, height: number];
  readonly depth: number;
  /** A unit, in CSS pixels. */
  readonly unit: number;
  /** How many rows a jump brings the wall down. */
  readonly jump: number;
  /** The floor's band and the lintel, in units, to one place. */
  readonly band: number;
  readonly lintel: number;
  /** Each panel's width, in CSS pixels, or null where none shows. */
  readonly panels: number | null;
}

/** plan.md's table of shapes in "The field", worked out again for answer 1's lintel. */
const TABLE: readonly ShapeRow[] = [
  {
    name: "a roomy window",
    window: [1280, 800],
    room: [1232, 679],
    depth: 11,
    unit: 56,
    jump: 3,
    band: 0.6,
    lintel: 0.5,
    panels: 320,
  },
  {
    name: "a phone upright",
    window: [390, 844],
    room: [366, 760],
    depth: 17,
    unit: 40,
    jump: 5,
    band: 1.1,
    lintel: 0.9,
    panels: null,
  },
  {
    name: "a phone on its side",
    window: [844, 390],
    room: [756, 366],
    depth: 11,
    unit: 30,
    jump: 3,
    band: 0.7,
    lintel: 0.5,
    panels: 231,
  },
  {
    name: "a small phone upright",
    window: [375, 553],
    room: [351, 469],
    depth: 11,
    unit: 38,
    jump: 3,
    band: 0.8,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "a small phone on its side",
    window: [568, 320],
    room: [480, 296],
    depth: 11,
    unit: 24,
    jump: 3,
    band: 0.8,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "the smallest phone",
    window: [320, 480],
    room: [296, 396],
    depth: 11,
    unit: 32,
    jump: 3,
    band: 0.9,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "a tall phone",
    window: [360, 800],
    room: [336, 716],
    depth: 18,
    unit: 37,
    jump: 5,
    band: 0.9,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "a folded phone",
    window: [280, 653],
    room: [256, 569],
    depth: 19,
    unit: 28,
    jump: 6,
    band: 0.8,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "a tablet upright",
    window: [820, 1180],
    room: [772, 1059],
    depth: 11,
    unit: 85,
    jump: 3,
    band: 1,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "a tablet on its side",
    window: [1180, 820],
    room: [1132, 699],
    depth: 11,
    unit: 57,
    jump: 3,
    band: 0.8,
    lintel: 0.5,
    panels: 297,
  },
  {
    name: "a desktop",
    window: [1920, 970],
    room: [1872, 849],
    depth: 11,
    unit: 70,
    jump: 3,
    band: 0.6,
    lintel: 0.5,
    panels: 320,
  },
  {
    name: "a square window",
    window: [1000, 1000],
    room: [952, 879],
    depth: 11,
    unit: 72,
    jump: 3,
    band: 0.7,
    lintel: 0.5,
    panels: null,
  },
  {
    name: "an ultra-wide window",
    window: [3440, 1300],
    room: [3392, 1179],
    depth: 11,
    unit: 97,
    jump: 3,
    band: 0.7,
    lintel: 0.5,
    panels: 320,
  },
];

/** The rooms the shapes' rules are held over: CSS sizes of canvases, at pixel ratios. */
const ROOMS: readonly (readonly [number, number, number])[] = [
  333, 390, 517, 768, 1001, 1500,
].flatMap((width) =>
  [330, 457, 555, 760].flatMap((height) =>
    [1, 2, 2.625].map((ratio) => [width, height, ratio] as const),
  ),
);

/** Returns a canvas of a CSS size at a pixel ratio, inside a compact screen's margin. */
function canvas(width: number, height: number, pixelRatio: number): Viewport {
  return viewport(
    width,
    height,
    pixelRatio,
    marginInsets(MARGIN_CSS_PX.compact),
  );
}

/** Returns the field a canvas lays out, at the shape it works out. */
function laidOut(canvas: Viewport): FieldMetrics {
  return fieldMetrics(canvas, fieldShape(canvas));
}

/** Returns the canvas a board has in a row's window. */
function boardOf(row: ShapeRow): Viewport {
  return boardCanvas(...row.window);
}

/** Returns how many device pixels the field takes down, from the lintel's top to the band's bottom. */
function tallness(canvas: Viewport): number {
  const shape = fieldShape(canvas);
  const metrics = fieldMetrics(canvas, shape);
  return (
    lintelPixels(shape, metrics.unit) +
    metrics.height +
    bandPixels(shape, metrics.unit)
  );
}

describe("fieldShape", () => {
  describe("plan.md's table of shapes", () => {
    it.each(TABLE)("leaves the field $room in $name's window", (row) => {
      const room = roomInside(boardOf(row));

      expect([room.width, room.height]).toEqual(row.room);
    });

    it.each(TABLE)(
      "shapes $name's field $depth rows deep at a unit of $unit CSS px",
      (row) => {
        const shape = fieldShape(boardOf(row));

        expect([shape.depth, shape.unit / shape.pixelRatio]).toEqual([
          row.depth,
          row.unit,
        ]);
      },
    );

    it.each(TABLE)("jumps $name's wall $jump rows", (row) => {
      const shape = fieldShape(boardOf(row));

      expect(thirdsOf(shape.depth).jump).toBe(row.jump);
    });

    it.each(TABLE)(
      "gives $name's field a floor's band of $band units and a lintel of $lintel",
      (row) => {
        const shape = fieldShape(boardOf(row));

        expect(shape.band).toBeCloseTo(row.band, 1);
        expect(shape.lintel).toBeCloseTo(row.lintel, 1);
      },
    );

    it.each(TABLE.filter((row) => row.panels !== null))(
      "stands a panel $panels CSS px wide either side of $name's field",
      (row) => {
        const canvas = boardOf(row);
        const shape = fieldShape(canvas);

        const panels = fieldMetrics(canvas, shape).panels;

        expect([shape.panels, panels?.left.width, panels?.right.width]).toEqual(
          [true, row.panels, row.panels],
        );
      },
    );

    it.each(TABLE.filter((row) => row.panels === null))(
      "stands no panel beside $name's field",
      (row) => {
        const canvas = boardOf(row);
        const shape = fieldShape(canvas);

        expect([shape.panels, fieldMetrics(canvas, shape).panels]).toEqual([
          false,
          null,
        ]);
      },
    );

    it.each([
      ["a small phone on its side", 568, 320, 132],
      ["a square window", 1000, 1000, 152],
    ])(
      "spares %s's field %i by %i only %i CSS px a side, too few for a panel",
      (_name, width, height, spare) => {
        const canvas = boardCanvas(width, height);
        const room = roomInside(canvas);

        const metrics = laidOut(canvas);

        expect(metrics.x - room.x).toBe(spare);
      },
    );
  });

  describe("a depth set over the room's", () => {
    it.each(TABLE)(
      "shapes $name's field to it, a shallow one or a deep one",
      (row) => {
        const canvas = boardOf(row);

        const depths = [11, 22].map((depth) => fieldShape(canvas, depth).depth);

        expect(depths).toEqual([11, 22]);
      },
    );

    it.each(TABLE)(
      "lays $name's field out in its room, at a depth set to the most",
      (row) => {
        const canvas = boardOf(row);
        const shape = fieldShape(canvas, MOST_DEPTH);

        const metrics = fieldMetrics(canvas, shape);

        expect({
          unit: metrics.unit,
          tall:
            lintelPixels(shape, metrics.unit) +
              metrics.height +
              bandPixels(shape, metrics.unit) <=
            roomInside(canvas).height,
        }).toEqual({ unit: shape.unit, tall: true });
      },
    );

    it.each(TABLE)(
      "gives $name's field the shape of the room's own depth when set to it",
      (row) => {
        const canvas = boardOf(row);
        const own = fieldShape(canvas);

        expect(fieldShape(canvas, own.depth)).toEqual(own);
      },
    );
  });

  it.each(
    TABLE.flatMap((row) =>
      (
        [
          ["wider", 1, 0],
          ["narrower", -1, 0],
          ["taller", 0, 1],
          ["shorter", 0, -1],
        ] as const
      ).map(([way, across, down]) => ({ ...row, way, across, down })),
    ),
  )(
    "keeps the depth and the unit of $name's field in a window a pixel $way",
    ({ window: [width, height], across, down }) => {
      const before = fieldShape(boardCanvas(width, height));

      const after = fieldShape(boardCanvas(width + across, height + down));

      expect([after.depth, after.unit]).toEqual([before.depth, before.unit]);
    },
  );

  it.each([
    ...shapesAt(1, [...SHAPES, SMALLEST]),
    ...shapesAt(2, [...SHAPES, SMALLEST]),
  ])(
    "gives the field a unit of 24 CSS px at least in the layout check's $name at $viewport.deviceScaleFactor×",
    ({ viewport: { width, height, deviceScaleFactor } }) => {
      const shape = fieldShape(boardCanvas(width, height, deviceScaleFactor));

      expect(shape.unit / shape.pixelRatio).toBeGreaterThanOrEqual(24);
    },
  );

  it.each(ROOMS)(
    "gives a room of %i by %i CSS px at %f× the largest whole unit 9 cells across and the least field down fit",
    (width, height, ratio) => {
      const room = roomInside(canvas(width, height, ratio));

      const { unit } = fieldShape(canvas(width, height, ratio));

      const largest = Math.min(
        room.width / COLUMNS,
        room.height / (LEAST_DEPTH + FLOOR_BAND.least + LINTEL.least),
      );
      expect(Number.isInteger(unit)).toBe(true);
      expect(unit).toBeLessThanOrEqual(largest + 1e-9);
      expect(unit + 1).toBeGreaterThan(largest);
    },
  );

  it.each(ROOMS)(
    "makes a room of %i by %i CSS px at %f× as many rows deep as it holds past the thinnest band and lintel",
    (width, height, ratio) => {
      const room = roomInside(canvas(width, height, ratio));

      const { unit, depth } = fieldShape(canvas(width, height, ratio));

      const rows = room.height / unit - FLOOR_BAND.least - LINTEL.least;
      expect(rows + 1e-9).toBeGreaterThanOrEqual(depth);
      expect(rows).toBeLessThan(depth + 1);
    },
  );

  it.each(ROOMS)(
    "fills a room of %i by %i CSS px at %f× from top to bottom with the cells, the band and the lintel",
    (width, height, ratio) => {
      const room = roomInside(canvas(width, height, ratio));

      const shape = fieldShape(canvas(width, height, ratio));

      expect(shape.depth + shape.band + shape.lintel).toBeCloseTo(
        room.height / shape.unit,
        9,
      );
    },
  );

  it.each(ROOMS)(
    "keeps the band and the lintel within their thinnest and thickest in a room of %i by %i CSS px at %f×",
    (width, height, ratio) => {
      const { band, lintel } = fieldShape(canvas(width, height, ratio));

      expect(band).toBeGreaterThanOrEqual(FLOOR_BAND.least);
      expect(band).toBeLessThanOrEqual(FLOOR_BAND.most);
      expect(lintel).toBeGreaterThanOrEqual(LINTEL.least);
      expect(lintel).toBeLessThanOrEqual(LINTEL.most);
    },
  );

  it("thickens the band to its thickest before the lintel", () => {
    const shape = fieldShape(boardCanvas(390, 844));

    expect([shape.band, shape.lintel]).toEqual([
      FLOOR_BAND.most,
      expect.closeTo(0.9, 9),
    ]);
  });

  it("stops at the most rows in a room taller than they need, the band and the lintel at their thickest", () => {
    const shape = fieldShape(canvas(400, 1400, 1));

    expect(shape).toEqual({
      unit: 41,
      depth: MOST_DEPTH,
      band: FLOOR_BAND.most,
      lintel: LINTEL.most,
      panels: false,
      pixelRatio: 1,
    });
  });

  it("gives a room with no area the least field, at a unit of a device pixel", () => {
    const shape = fieldShape(viewport(0, 0));

    expect(shape).toEqual({
      unit: 1,
      depth: LEAST_DEPTH,
      band: FLOOR_BAND.least,
      lintel: LINTEL.least,
      panels: false,
      pixelRatio: 1,
    });
  });

  // 617 / 12.1 is 50.99, a hundredth under a whole unit.
  it("rounds a unit a hair under a whole device pixel down", () => {
    const shape = fieldShape(viewport(1000, 617));

    expect(shape.unit).toBe(50);
  });

  it("shapes the field in device pixels at the canvas's pixel ratio", () => {
    const shape = fieldShape(boardCanvas(390, 844, 2));

    expect([shape.unit, shape.depth, shape.pixelRatio]).toEqual([81, 17, 2]);
  });

  it("keeps the frame inside the narrowest margin and the panels' gap, where it is drawn", () => {
    expect(FRAME_CSS_PX).toBeLessThan(
      Math.min(MARGIN_CSS_PX.compact, PANEL_GAP_CSS_PX),
    );
  });
});

describe("fieldMetrics", () => {
  it("lays a phone's field out across its room, the lintel at its top and the band at its bottom", () => {
    const metrics = laidOut(boardCanvas(390, 844));

    expect(metrics).toEqual({
      unit: 40,
      pixelRatio: 1,
      x: 15,
      y: 48,
      width: 360,
      height: 680,
      css: { x: 15, y: 48, width: 360, height: 680 },
      framed: { x: 15, y: 12, width: 360, height: 760 },
      panels: null,
    });
  });

  it("frames the field from the lintel's top to the band's bottom, as tall as the panels beside it", () => {
    const metrics = laidOut(boardCanvas(1280, 800));

    const { css, framed, panels } = metrics;
    expect(framed).toEqual({
      x: css.x,
      y: panels?.left.y,
      width: css.width,
      height: panels?.left.height,
    });
  });

  it("frames a field of the most rows, centered in a room taller than it needs, around its lintel and its band, in CSS pixels", () => {
    const room = canvas(400, 1400, 2);
    const shape = fieldShape(room);

    const { unit, css, framed } = fieldMetrics(room, shape);

    expect({
      lintel: css.y - framed.y,
      band: framed.y + framed.height - css.y - css.height,
    }).toEqual({
      lintel: lintelPixels(shape, unit) / 2,
      band: bandPixels(shape, unit) / 2,
    });
  });

  it("stands a roomy window's panels 12 CSS px from the cells, as tall as the field from the lintel's top to the band's bottom", () => {
    const metrics = laidOut(boardCanvas(1280, 800));

    expect(metrics.panels).toEqual({
      left: { x: 56, y: 24, width: 320, height: 679 },
      right: { x: 904, y: 24, width: 320, height: 679 },
    });
  });

  it("makes both panels as wide as the narrower side spares, where the room spares an odd pixel", () => {
    const metrics = laidOut(boardCanvas(1180, 820));

    expect(metrics.panels).toEqual({
      left: { x: 24, y: 24, width: 297, height: 699 },
      right: { x: 858, y: 24, width: 297, height: 699 },
    });
  });

  it("lays a field out at a unit of a device pixel in a room with no area", () => {
    const metrics = laidOut(viewport(0, 0));

    expect(metrics.unit).toBe(1);
  });

  it("centers a field of the most rows in a room taller than it needs", () => {
    const metrics = laidOut(canvas(400, 1400, 1));

    expect([metrics.x, metrics.y, metrics.height]).toEqual([15, 247, 902]);
  });

  it.each(ROOMS)(
    "lays a room of %i by %i CSS px at %f× out at its shape's unit",
    (width, height, ratio) => {
      const shape = fieldShape(canvas(width, height, ratio));

      const metrics = fieldMetrics(canvas(width, height, ratio), shape);

      expect(metrics.unit).toBe(shape.unit);
    },
  );

  it.each(ROOMS)(
    "fills a room of %i by %i CSS px at %f× from top to bottom in whole device pixels",
    (width, height, ratio) => {
      const room = roomInside(canvas(width, height, ratio));

      const tall = tallness(canvas(width, height, ratio));

      expect(tall).toBe(room.height);
    },
  );

  it.each(ROOMS)(
    "keeps the lintel half a unit thick at least in a room of %i by %i CSS px at %f×",
    (width, height, ratio) => {
      const shape = fieldShape(canvas(width, height, ratio));

      const lintel = lintelPixels(shape, shape.unit);

      expect(lintel).toBeGreaterThanOrEqual(LINTEL.least * shape.unit);
    },
  );

  it.each(ROOMS)(
    "centers the cells across a room of %i by %i CSS px at %f× on whole device pixels",
    (width, height, ratio) => {
      const room = roomInside(canvas(width, height, ratio));

      const { x, y, width: across } = laidOut(canvas(width, height, ratio));

      const left = x - room.x;
      const right = room.x + room.width - (x + across);
      expect([Number.isInteger(x), Number.isInteger(y)]).toEqual([true, true]);
      expect([0, 1]).toContain(right - left);
    },
  );

  it.each(ROOMS)(
    "gives the cells of a room of %i by %i CSS px at %f× in CSS pixels too",
    (width, height, ratio) => {
      const metrics = laidOut(canvas(width, height, ratio));

      expect(metrics.css).toEqual({
        x: metrics.x / ratio,
        y: metrics.y / ratio,
        width: metrics.width / ratio,
        height: metrics.height / ratio,
      });
    },
  );

  it.each(ROOMS)(
    "stands panels beside the field of a room of %i by %i CSS px at %f× just where its shape says",
    (width, height, ratio) => {
      const shape = fieldShape(canvas(width, height, ratio));

      const metrics = fieldMetrics(canvas(width, height, ratio), shape);

      expect(metrics.panels !== null).toBe(shape.panels);
    },
  );

  // The room runs from 12 to 378 down; the field, 361 device px tall,
  // leaves 5 spare, 2 above it and 3 below.
  it("keeps the shape's depth at a smaller unit in a room a round flies on into, the field centered inside it", () => {
    const upright = fieldShape(boardCanvas(390, 844));

    const metrics = fieldMetrics(boardCanvas(844, 390), upright);

    const top = metrics.y - lintelPixels(upright, metrics.unit);
    const bottom =
      metrics.y + metrics.height + bandPixels(upright, metrics.unit);
    expect([metrics.unit, metrics.height / metrics.unit]).toEqual([19, 17]);
    expect([top, bottom]).toEqual([14, 375]);
  });

  it.each(
    TABLE.flatMap((row) =>
      (
        [
          ["narrower", -1, 0],
          ["shorter", 0, -1],
        ] as const
      ).flatMap(([way, across, down]) =>
        [1, 1.5, 2, 2.625].map((ratio) => ({
          ...row,
          way,
          across,
          down,
          ratio,
        })),
      ),
    ),
  )(
    "keeps the unit of $name's shape at $ratio× in a room a round flies on into a CSS pixel $way",
    ({ window: [width, height], across, down, ratio }) => {
      const shape = fieldShape(boardCanvas(width, height, ratio));

      const metrics = fieldMetrics(
        boardCanvas(width + across, height + down, ratio),
        shape,
      );

      expect(metrics.unit).toBe(shape.unit);
    },
  );

  // The room runs from 12 to 772 down; the field, 366 device px tall at a
  // unit of 30, leaves 394 spare, 197 above it.
  it("keeps the shape's unit in a larger room a round flies on into, the field centered in it", () => {
    const turned = fieldShape(boardCanvas(844, 390));

    const metrics = fieldMetrics(boardCanvas(390, 844), turned);

    expect([metrics.unit, metrics.height / metrics.unit, metrics.y]).toEqual([
      30, 11, 224,
    ]);
  });

  // A room 384 CSS px wide is 360 across inside its margin, 9 units of 40
  // exactly, at a field 18 deep with a band of 0.9 in 776 down.
  it.each([
    [383, 800, 1, 40],
    [383, 800, 2, 80],
    [384, 799, 1, 40],
  ])(
    "keeps the unit of a room 384 by 800 CSS px's field in a room %i by %i at %i×, the margin taking a CSS pixel",
    (width, height, ratio, unit) => {
      const shape = fieldShape(canvas(384, 800, ratio));

      const metrics = fieldMetrics(canvas(width, height, ratio), shape);

      expect(metrics.unit).toBe(unit);
    },
  );

  it.each([
    [382, 800, 1, 39],
    [382, 800, 2, 79],
    [384, 798, 1, 39],
  ])(
    "refits a room 384 by 800 CSS px's field to a room %i by %i at %i×, two CSS pixels smaller, at a unit of %i",
    (width, height, ratio, unit) => {
      const shape = fieldShape(canvas(384, 800, ratio));

      const metrics = fieldMetrics(canvas(width, height, ratio), shape);

      expect(metrics.unit).toBe(unit);
    },
  );

  // 766 device px down over the field's 12.77 units, worked out at 1×, is
  // 59.999… in floating point.
  it("counts a refitted unit a hair under a whole device pixel as it", () => {
    const shape = fieldShape(canvas(300, 407, 1));

    const metrics = fieldMetrics(canvas(300, 407, 2), shape);

    expect(metrics.unit).toBe(60);
  });

  it("takes the largest unit that fits the shape's field where the pixel ratio has changed since", () => {
    const shape = fieldShape(boardCanvas(390, 844, 1));

    const metrics = fieldMetrics(boardCanvas(390, 844, 2), shape);

    expect([metrics.unit, metrics.height / metrics.unit]).toEqual([80, 17]);
  });

  // A room 638 CSS px wide makes a unit of 30 CSS px here, 270 across, and
  // spares 184 a side; one a pixel narrower spares 183 on its narrower side.
  it.each([
    [638, 370, 1],
    [638, 365, 2],
  ])(
    "stands panels of the least width where a room %i by %i CSS px at %i× spares 184 CSS px a side",
    (width, height, ratio) => {
      const metrics = laidOut(viewport(width, height, ratio));

      expect([metrics.panels?.left.width, metrics.panels?.right.width]).toEqual(
        [172, 172],
      );
    },
  );

  it.each([
    [637, 370, 1],
    [637, 365, 2],
  ])(
    "stands no panels where a room %i by %i CSS px at %i× spares 183 CSS px on a side",
    (width, height, ratio) => {
      const metrics = laidOut(viewport(width, height, ratio));

      expect(metrics.panels).toBeNull();
    },
  );

  it("stands panels 12 CSS px from the cells at a pixel ratio of 2", () => {
    const metrics = laidOut(boardCanvas(1280, 800, 2));

    expect(metrics.panels).toEqual({
      left: { x: 56, y: 24, width: 320, height: 679 },
      right: { x: 904, y: 24, width: 320, height: 679 },
    });
  });

  it("stands no panels where a room a round flies on into spares too little, though its shape's room had them", () => {
    const roomy = fieldShape(boardCanvas(1280, 800));

    const metrics = fieldMetrics(boardCanvas(820, 1180), roomy);

    expect([roomy.panels, metrics.panels]).toEqual([true, null]);
  });
});

describe("hasRoom", () => {
  it("finds room for a field inside a canvas's insets", () => {
    expect(hasRoom(boardCanvas(390, 844))).toBe(true);
  });

  it.each([
    [0, 0],
    [390, 0],
    [0, 844],
    [24, 844],
  ])(
    "finds none in a canvas %i by %i CSS px, inside a compact margin",
    (width, height) => {
      expect(hasRoom(canvas(width, height, 1))).toBe(false);
    },
  );
});

describe("lintelPixels and bandPixels", () => {
  it("round the lintel up and the band down, so they fill what the room spares the cells", () => {
    const shape = fieldShape(boardCanvas(360, 800));

    expect([
      lintelPixels(shape, shape.unit),
      bandPixels(shape, shape.unit),
    ]).toEqual([19, 31]);
  });
});

describe("toCanvas and toField", () => {
  /** A phone's field: cells from (15, 48), 40 device px a unit, 17 rows deep. */
  const PHONE = laidOut(boardCanvas(390, 844));

  it("puts the floor's left end at the cells' bottom left", () => {
    expect(toCanvas(PHONE, 0, 0)).toEqual({ x: 15, y: 728 });
  });

  it("puts the ceiling's right end at the cells' top right", () => {
    expect(toCanvas(PHONE, COLUMNS, 17)).toEqual({ x: 375, y: 48 });
  });

  it("reads a place on the canvas as units from the left wall and up from the floor", () => {
    expect(toField(PHONE, 195, 628)).toEqual({ x: 4.5, y: 2.5 });
  });

  it("reads a place off the field as off it", () => {
    expect(toField(PHONE, 5, 748)).toEqual({ x: -0.25, y: -0.5 });
  });

  it.each([
    [4.5, 0.25],
    [0.25, 16.75],
    [8.123, 3.3],
    [-1, 30],
  ])("brings the place (%f, %f) back from the canvas", (x, y) => {
    const onCanvas = toCanvas(PHONE, x, y);

    const back = toField(PHONE, onCanvas.x, onCanvas.y);

    expect([back.x, back.y]).toEqual([
      expect.closeTo(x, 12),
      expect.closeTo(y, 12),
    ]);
  });

  it.each([
    ["toCanvas", toCanvas],
    ["toField", toField],
  ])("writes %s's place into the one it is handed", (_name, map) => {
    const into = { x: 0, y: 0 };

    const place = map(PHONE, 1, 2, into);

    expect(place).toBe(into);
  });
});
