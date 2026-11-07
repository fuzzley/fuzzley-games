import { SHAPES, SMALLEST, shapesAt } from "@fz/dev/layout";
import type { Viewport } from "@fz/phaser/layout";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";
import { boardOf, chrome, viewport } from "../../testing/canvases";
import {
  type BoardSetting,
  DECK_HEIGHT_CSS_PX,
  type DeckLayout,
  DECK_WIDTH_CSS_PX,
  type FieldMetrics,
  type PixelRect,
  deckLayout,
  fieldMetrics,
  fieldRoom,
  fieldShape,
  toCanvas,
  toField,
} from "./field_metrics";

/** A board with no margin and no deck, as on a screen with no touch. */
const NO_DECK: BoardSetting = {
  marginCss: 0,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** A board with no margin, its deck showing, its stick on the left. */
const DECK: BoardSetting = { ...NO_DECK, deck: true };

/** A field of the narrowest shape, which a field keeps where its room has none. */
const SQUARE = { width: FIELD_SHORT_SIDE, height: FIELD_SHORT_SIDE };

/** Returns the deck laid out around the field a canvas shapes, as a wave starts there. */
function deckOn(canvas: Viewport, board: BoardSetting): DeckLayout | null {
  return deckLayout(canvas, board, fieldShape(canvas, board, SQUARE));
}

/** Returns the room of the field a canvas shapes, as a wave starts there. */
function roomOn(canvas: Viewport, board: BoardSetting): PixelRect {
  return fieldRoom(canvas, board, fieldShape(canvas, board, SQUARE));
}

/** Returns the field's frame, the field and the frame around it. */
function framed(metrics: FieldMetrics): PixelRect {
  return {
    x: metrics.x - metrics.frame,
    y: metrics.y - metrics.frame,
    width: metrics.width + 2 * metrics.frame,
    height: metrics.height + 2 * metrics.frame,
  };
}

/** Returns whether one rectangle spans another across, or down, to within a device pixel. */
function spans(inner: PixelRect, outer: PixelRect, axis: "x" | "y"): boolean {
  const size = axis === "x" ? "width" : "height";
  return (
    Math.abs(inner[axis] - outer[axis]) <= 1 &&
    Math.abs(inner[axis] + inner[size] - (outer[axis] + outer[size])) <= 1
  );
}

/** Returns whether one rectangle lies wholly inside another. */
function inside(inner: PixelRect, outer: PixelRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Returns whether two rectangles share no pixel. */
function apart(one: PixelRect, other: PixelRect): boolean {
  return (
    one.x + one.width <= other.x ||
    other.x + other.width <= one.x ||
    one.y + one.height <= other.y ||
    other.y + other.height <= one.y
  );
}

describe("deckLayout", () => {
  it("lays nothing out where the deck doesn't show", () => {
    expect(deckOn(viewport(390, 784), NO_DECK)).toBeNull();
  });

  it("lays the deck along the bottom of an upright stage, a quarter of its height, the stick's zone its left half", () => {
    const deck = deckOn(viewport(390, 784), DECK);

    expect(deck).toEqual({
      under: true,
      stick: { x: 0, y: 588, width: 195, height: 196 },
      buttons: { x: 195, y: 588, width: 195, height: 196 },
    });
  });

  it("gives the buttons the odd pixel of a stage an odd number wide", () => {
    const deck = deckOn(viewport(391, 784), DECK);

    expect([deck?.stick.width, deck?.buttons.x, deck?.buttons.width]).toEqual([
      195, 195, 196,
    ]);
  });

  it.each([
    [400, DECK_HEIGHT_CSS_PX.least],
    [1000, DECK_HEIGHT_CSS_PX.most],
  ])(
    "keeps the deck under the field within its heights on a stage %i CSS px tall",
    (height, tall) => {
      const deck = deckOn(viewport(300, height), DECK);

      expect(deck?.stick.height).toBe(tall);
    },
  );

  it("lays a zone of the deck each side of a stage on its side, a sixth of its width, the stick's the left", () => {
    const deck = deckOn(viewport(780, 390), DECK);

    expect(deck).toEqual({
      under: false,
      stick: { x: 0, y: 0, width: 130, height: 390 },
      buttons: { x: 650, y: 0, width: 130, height: 390 },
    });
  });

  it.each([
    [600, DECK_WIDTH_CSS_PX.least],
    [1500, DECK_WIDTH_CSS_PX.most],
  ])(
    "keeps the deck beside the field within its widths on a stage %i CSS px wide",
    (width, wide) => {
      const deck = deckOn(viewport(width, 390), DECK);

      expect(deck?.stick.width).toBe(wide);
    },
  );

  // Under, the deck leaves 660 by 450, a unit of 446 / 40; beside, 436 by
  // 600, a unit of 432 / 40. At 720 across, beside leaves 480 by 600, a
  // unit of 476 / 40, more than under's.
  it.each([
    [660, true],
    [720, false],
  ])(
    "lays the deck where it leaves the field the larger unit on a stage %i by 600, under it %s",
    (width, under) => {
      const deck = deckOn(viewport(width, 600), DECK);

      expect(deck?.under).toBe(under);
    },
  );

  // Under it, the deck would leave the field 4 px down, its frame alone.
  it("lays the deck beside a stage where under it would leave the field no room", () => {
    const deck = deckOn(viewport(300, 140), DECK);

    expect(deck?.under).toBe(false);
  });

  // At 676 by 600 inside a margin of 24, a field shaped with the deck
  // under gets a unit of 9.95, as one with it beside does, and the tie lays
  // it under. At 677, a field shaped afresh gets 9.975 beside, but the one
  // kept from 676 would get 6.36 there, and still gets 9.95 under.
  it("keeps the deck where it leaves a field kept through a resize the larger unit", () => {
    const board = { ...DECK, marginCss: 24 };
    const kept = fieldShape(viewport(676, 600), board, SQUARE);
    const canvas = viewport(677, 600);

    expect({
      kept: deckLayout(canvas, board, kept)?.under,
      afresh: deckOn(canvas, board)?.under,
      unit: fieldMetrics(canvas, board, kept).unit,
    }).toEqual({
      kept: true,
      afresh: false,
      unit: fieldMetrics(viewport(676, 600), board, kept).unit,
    });
  });

  // Inside the chrome, the stage is 380 by 730 from (10, 20), and the deck
  // a quarter of it, 183, from 567 down.
  it("lays the deck under the field inside chrome that differs at each edge", () => {
    const deck = deckOn(
      viewport(390, 784, 1, { top: 20, right: 0, bottom: 34, left: 10 }),
      DECK,
    );

    expect(deck).toEqual({
      under: true,
      stick: { x: 10, y: 567, width: 190, height: 183 },
      buttons: { x: 200, y: 567, width: 190, height: 183 },
    });
  });

  // Inside the chrome, the stage is 733 by 369 from (47, 0), and each zone
  // a sixth of it, 122.
  it("lays the deck beside the field inside chrome that differs at each edge", () => {
    const deck = deckOn(
      viewport(780, 390, 1, { top: 0, right: 0, bottom: 21, left: 47 }),
      DECK,
    );

    expect(deck).toEqual({
      under: false,
      stick: { x: 47, y: 0, width: 122, height: 369 },
      buttons: { x: 658, y: 0, width: 122, height: 369 },
    });
  });

  it("lays the deck at the stage's edges, inside the chrome, whatever the field's margin", () => {
    const deck = deckOn(viewport(780, 390, 1, chrome(10)), {
      ...DECK,
      marginCss: 12,
    });

    // A sixth of the stage's 760 is 127.
    expect([deck?.stick.x, deck?.stick.y, deck?.buttons.x]).toEqual([
      10,
      10,
      10 + 760 - 127,
    ]);
  });

  it("puts the stick on the right where its setting says", () => {
    const left = deckOn(viewport(780, 390), DECK);
    const right = deckOn(viewport(780, 390), {
      ...DECK,
      stickOnRight: true,
    });

    expect([right?.stick, right?.buttons]).toEqual([
      left?.buttons,
      left?.stick,
    ]);
  });

  it("lays the deck out in device pixels", () => {
    const deck = deckOn(viewport(390, 784, 2), DECK);

    expect(deck?.stick).toEqual({ x: 0, y: 1176, width: 390, height: 392 });
  });
});

describe("fieldRoom", () => {
  it("is the stage inside the chrome and the margin where the deck doesn't show", () => {
    const room = roomOn(viewport(390, 784, 1, chrome(10)), {
      ...NO_DECK,
      marginCss: 12,
    });

    expect(room).toEqual({ x: 22, y: 22, width: 346, height: 740 });
  });

  // Inside chrome of 10, the stage is 370 by 764, and the deck a quarter of
  // it, 191, from 583 down.
  it("is the stage above the deck, inside the chrome and the margin", () => {
    const room = roomOn(viewport(390, 784, 1, chrome(10)), {
      ...DECK,
      marginCss: 12,
    });

    expect(room).toEqual({ x: 22, y: 22, width: 346, height: 549 });
  });

  it.each([
    [
      "under",
      viewport(390, 784, 1, { top: 20, right: 0, bottom: 34, left: 10 }),
      { x: 22, y: 32, width: 356, height: 523 },
    ],
    [
      "beside",
      viewport(780, 390, 1, { top: 0, right: 0, bottom: 21, left: 47 }),
      { x: 181, y: 12, width: 465, height: 345 },
    ],
  ])(
    "is the stage less the deck %s it, inside chrome that differs at each edge and the margin",
    (_, canvas, room) => {
      expect(roomOn(canvas, { ...DECK, marginCss: 12 })).toEqual(room);
    },
  );

  it.each([false, true])(
    "is the stage between the deck's two zones, inside the margin, the stick on the right %s",
    (stickOnRight) => {
      const room = roomOn(viewport(780, 390), {
        ...DECK,
        marginCss: 12,
        stickOnRight,
      });

      expect(room).toEqual({ x: 142, y: 12, width: 496, height: 366 });
    },
  );

  it.each([
    [
      "the deck takes it whole",
      viewport(20, 20),
      DECK,
      { x: 0, y: 0, width: 20, height: 0 },
    ],
    [
      "it is narrower than its margins",
      viewport(20, 400),
      { ...NO_DECK, marginCss: 12 },
      { x: 12, y: 12, width: 0, height: 376 },
    ],
  ])("is no room at all where %s", (_, canvas, board, room) => {
    expect(roomOn(canvas, board)).toEqual(room);
  });
});

describe("fieldShape", () => {
  it("makes the short side 40 units and the long as many as the room holds at that unit", () => {
    // 404 by 604 less a frame of 2 each side leaves 400 by 600.
    const torus = fieldShape(viewport(404, 604), NO_DECK, SQUARE);

    expect(torus).toEqual({ width: 40, height: 60 });
  });

  it("lays a field on its side in a room wider than tall", () => {
    const torus = fieldShape(viewport(604, 404), NO_DECK, SQUARE);

    expect(torus).toEqual({ width: 60, height: 40 });
  });

  it("stops the long side at 88 units", () => {
    const torus = fieldShape(viewport(1004, 204), NO_DECK, SQUARE);

    expect(torus).toEqual({ width: FIELD_LONGEST_SIDE, height: 40 });
  });

  it("shapes the field for the room the deck leaves", () => {
    // 588 less the frames is 584 down, 386 across.
    const torus = fieldShape(viewport(390, 784), DECK, SQUARE);

    expect(torus.height).toBeCloseTo((40 * 584) / 386);
  });

  // At 677 by 600 inside a margin of 24, a field shaped afresh gets a
  // larger unit beside the deck, though the field kept from 676 fits better
  // under it.
  it("shapes the field for the way the deck leaves a field shaped afresh the larger unit, whatever it had", () => {
    const board = { ...DECK, marginCss: 24 };
    const kept = fieldShape(viewport(676, 600), board, SQUARE);

    const torus = fieldShape(viewport(677, 600), board, kept);

    expect([kept.height, torus.width]).toEqual([40, 40]);
  });

  it.each([
    ["a canvas of no size", viewport(0, 0), NO_DECK],
    ["a room just its frame wide", viewport(4, 104), NO_DECK],
    ["a room the deck takes whole", viewport(100, 130), DECK],
    ["a canvas too small for the deck either way", viewport(20, 20), DECK],
  ])("keeps the field it had on %s", (_, canvas, board) => {
    const last = { width: 40, height: 61 };

    const torus = fieldShape(canvas, board, last);

    expect(torus).toBe(last);
  });
});

describe("fieldMetrics", () => {
  it("fits a field of its shape to its room, inside its frame", () => {
    const metrics = fieldMetrics(viewport(404, 604), NO_DECK, {
      width: 40,
      height: 60,
    });

    expect(metrics).toMatchObject({
      unit: 10,
      x: 2,
      y: 2,
      width: 400,
      height: 600,
      frame: 2,
    });
  });

  it("fits the field inside its margin", () => {
    const metrics = fieldMetrics(
      viewport(428, 628),
      { ...NO_DECK, marginCss: 12 },
      { width: 40, height: 60 },
    );

    expect(metrics).toMatchObject({ unit: 10, x: 14, y: 14 });
  });

  // 363 by 600 holds 40 by 66.1… units of 9.075, the field's room whole,
  // the unit's rounding leaving the long side a hair under 600.
  it.each([
    ["upright", 367, 604, [363, 600]],
    ["on its side", 604, 367, [600, 363]],
  ])(
    "makes a unit whatever fraction of a device pixel fits the field, %s",
    (_, width, height, size) => {
      const canvas = viewport(width, height);
      const torus = fieldShape(canvas, NO_DECK, SQUARE);

      const metrics = fieldMetrics(canvas, NO_DECK, torus);

      expect([metrics.unit, metrics.width, metrics.height]).toEqual([
        expect.closeTo(363 / 40),
        ...size,
      ]);
    },
  );

  // 800 by 400 inside the frame holds 40 by 60 at a unit of 400 / 60, 266
  // pixels across.
  it.each([
    ["across", 804, 404, { width: 40, height: 60 }, [266, 400, 269, 2]],
    ["down", 404, 804, { width: 60, height: 40 }, [400, 266, 2, 269]],
  ])(
    "fits a field kept from another room whole, centered %s this one",
    (_, width, height, torus, at) => {
      const metrics = fieldMetrics(viewport(width, height), NO_DECK, torus);

      expect([metrics.width, metrics.height, metrics.x, metrics.y]).toEqual(at);
    },
  );

  it("lays the field and its frame on whole device pixels at any pixel ratio", () => {
    const canvas = viewport(517, 517, 2.625);

    const metrics = fieldMetrics(canvas, NO_DECK, SQUARE);

    expect(
      [
        metrics.x,
        metrics.y,
        metrics.width,
        metrics.height,
        metrics.frame,
      ].every((n) => Number.isInteger(n)),
    ).toBe(true);
  });

  it.each([
    [3, 6],
    [0.2, 1],
  ])(
    "scales the frame by a pixel ratio of %f to %i device pixels, one at least",
    (ratio, frame) => {
      const metrics = fieldMetrics(viewport(400, 400, ratio), NO_DECK, SQUARE);

      expect(metrics.frame).toBe(frame);
    },
  );

  it("gives the field in CSS pixels", () => {
    const metrics = fieldMetrics(viewport(400, 300, 2), NO_DECK, SQUARE);

    expect(metrics.css).toEqual({
      x: metrics.x / 2,
      y: metrics.y / 2,
      width: metrics.width / 2,
      height: metrics.height / 2,
    });
  });

  it("keeps a unit a device pixel at least on a canvas with no room", () => {
    expect(fieldMetrics(viewport(0, 0), NO_DECK, SQUARE).unit).toBe(1);
  });
});

describe("the layout", () => {
  const boards = [1, 2, 3].flatMap((ratio) =>
    shapesAt(ratio, [...SHAPES, SMALLEST]).flatMap((shape) =>
      [false, true].map((deck) => {
        const { canvas, marginCss } = boardOf(shape);
        return [
          shape.name,
          ratio,
          deck ? "with" : "without",
          canvas,
          { marginCss, deck, stickOnRight: false, fireByItself: false },
        ] as const;
      }),
    ),
  );

  // A field capped at 88 units long spans its room along its short side
  // alone.
  it.each(boards)(
    "fills the room of a %s at %f× %s the deck with a field 40 units on its short side, a unit of 6 CSS px or more",
    (_, ratio, __, canvas, board) => {
      const torus = fieldShape(canvas, board, SQUARE);
      const metrics = fieldMetrics(canvas, board, torus);
      const room = fieldRoom(canvas, board, torus);
      const frame = framed(metrics);
      const across = torus.width > torus.height;

      expect({
        short: Math.min(torus.width, torus.height),
        unit: metrics.unit / ratio >= 6,
        inside: inside(frame, room),
        fills:
          spans(frame, room, across ? "y" : "x") &&
          (Math.max(torus.width, torus.height) === FIELD_LONGEST_SIDE ||
            spans(frame, room, across ? "x" : "y")),
      }).toEqual({ short: 40, unit: true, inside: true, fills: true });
    },
  );

  it.each(boards)(
    "gives the room of a %s at %f× %s the deck inside the frame of the room the field lies in",
    (_, __, ___, canvas, board) => {
      const torus = fieldShape(canvas, board, SQUARE);

      const { room, frame } = fieldMetrics(canvas, board, torus);

      expect({
        x: room.x - frame,
        y: room.y - frame,
        width: room.width + 2 * frame,
        height: room.height + 2 * frame,
      }).toEqual(fieldRoom(canvas, board, torus));
    },
  );

  it.each(boards.filter(([, , , , board]) => board.deck))(
    "lays the deck of a %s at %f× out at its least size or more, on the canvas and clear of the field",
    (_, ratio, __, canvas, board) => {
      const layout = deckOn(canvas, board);
      const whole = { x: 0, y: 0, width: canvas.width, height: canvas.height };
      const room = roomOn(canvas, board);

      expect({
        least: layout?.under
          ? layout.stick.height / ratio >= DECK_HEIGHT_CSS_PX.least
          : (layout?.stick.width ?? 0) / ratio >= DECK_WIDTH_CSS_PX.least,
        onCanvas:
          layout !== null &&
          inside(layout.stick, whole) &&
          inside(layout.buttons, whole),
        apart:
          layout !== null &&
          apart(layout.stick, layout.buttons) &&
          apart(layout.stick, room) &&
          apart(layout.buttons, room),
      }).toEqual({ least: true, onCanvas: true, apart: true });
    },
  );
});

describe("toCanvas and toField", () => {
  const metrics = fieldMetrics(viewport(404, 604), NO_DECK, {
    width: 40,
    height: 60,
  });

  it("toCanvas places a point of the field on the canvas", () => {
    expect(toCanvas(metrics, { x: 4, y: 59.5 }, { x: 0, y: 0 })).toEqual({
      x: 2 + 40,
      y: 2 + 595,
    });
  });

  it("toField places a point of the canvas on the field, off it too", () => {
    expect(toField(metrics, { x: 0, y: 612 }, { x: 0, y: 0 })).toEqual({
      x: -0.2,
      y: 61,
    });
  });

  it("toField undoes toCanvas at any pixel ratio", () => {
    const fine = fieldMetrics(viewport(517, 517, 2.625), NO_DECK, SQUARE);
    const place = { x: 0, y: 0 };

    toField(fine, toCanvas(fine, { x: 7.25, y: 21.5 }, place), place);

    expect([place.x, place.y]).toEqual([
      expect.closeTo(7.25),
      expect.closeTo(21.5),
    ]);
  });

  it("writes into the record each is given", () => {
    const into = { x: 0, y: 0 };

    const written = [
      toCanvas(metrics, { x: 1, y: 1 }, into),
      toField(metrics, { x: 1, y: 1 }, into),
    ];

    expect(written.every((record) => record === into)).toBe(true);
  });
});
