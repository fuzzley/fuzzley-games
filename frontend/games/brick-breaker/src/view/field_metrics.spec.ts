import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { FIELD_HEIGHT, TALLEST_FIELD } from "../rules/tuning";
import {
  FINGER_ROOM_CSS_PX,
  fieldHeightFor,
  fieldMetrics,
  fingerRoomOf,
  toCanvasX,
  toCanvasY,
  toFieldX,
  toFieldY,
} from "./field_metrics";

/** Returns a viewport of a CSS size at a pixel ratio, with no chrome over it. */
function viewport(width: number, height: number, pixelRatio = 1): Viewport {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    pixelRatio,
    insets: NO_INSETS,
  };
}

describe("fieldMetrics", () => {
  it("fits the field of 26 by 30 units, the largest the canvas holds with its wall", () => {
    // 300 less a wall of 2 at the top and the bottom leaves 296: 30 units of 9.
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect(metrics).toMatchObject({
      unit: 9,
      width: 234,
      height: 270,
      wall: 2,
    });
  });

  it("centers the field on the canvas", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([metrics.x, metrics.y]).toEqual([83, 15]);
  });

  it("makes a unit whole device pixels at any pixel ratio", () => {
    const metrics = fieldMetrics(viewport(517, 517, 2.625), FIELD_HEIGHT);

    expect(
      [metrics.unit, metrics.x, metrics.y, metrics.wall].every((n) =>
        Number.isInteger(n),
      ),
    ).toBe(true);
  });

  it("gives the wall and the pixel ratio in device pixels", () => {
    const metrics = fieldMetrics(viewport(400, 300, 2), FIELD_HEIGHT);

    expect({ wall: metrics.wall, ratio: metrics.pixelRatio }).toEqual({
      wall: 4,
      ratio: 2,
    });
  });

  it("fits a taller field to the same canvas, its unit as large as its height allows", () => {
    // 296 over 37 units: a unit of 8, and 26 of them across.
    const metrics = fieldMetrics(viewport(400, 300), 37);

    expect(metrics).toMatchObject({ unit: 8, width: 208, height: 296 });
  });

  it("gives the field in CSS pixels", () => {
    const metrics = fieldMetrics(viewport(400, 300, 2), FIELD_HEIGHT);

    expect(metrics.css).toEqual({
      x: metrics.x / 2,
      y: metrics.y / 2,
      width: metrics.width / 2,
      height: metrics.height / 2,
    });
  });
});

describe("fieldHeightFor", () => {
  it("has a wide canvas lay out a field of the least height", () => {
    expect(fieldHeightFor(viewport(1280, 720))).toBe(FIELD_HEIGHT);
  });

  it("has an upright phone's canvas lay out the tallest field", () => {
    expect(fieldHeightFor(viewport(390, 772))).toBe(TALLEST_FIELD);
  });

  it("lays out as many units as fit above a finger's room, a CSS pixel in hand", () => {
    // 400 less the walls makes units of 15; 669 less the walls, the finger's
    // room and the pixel in hand leaves 600: 40 units.
    expect(fieldHeightFor(viewport(400, 669))).toBe(40);
  });

  it("counts the chrome over the canvas out of the room", () => {
    const chrome = { top: 12, right: 12, bottom: 12, left: 12 };

    expect(fieldHeightFor({ ...viewport(424, 693), insets: chrome })).toBe(40);
  });

  it("keeps a field of the least height where a finger's room would take the rest", () => {
    // Units of 15: 500 has room for 32 units, but 28 above a finger's room.
    expect(fieldHeightFor(viewport(400, 500))).toBe(FIELD_HEIGHT);
  });

  it.each([
    [390, 60],
    [0, 0],
  ])(
    "keeps a field of the least height on a canvas %i by %i, with no room for any",
    (width, height) => {
      expect(fieldHeightFor(viewport(width, height))).toBe(FIELD_HEIGHT);
    },
  );

  it("fits the field at its width's unit on a canvas a pixel shorter than measured", () => {
    const height = fieldHeightFor(viewport(400, 669));
    const shorter = {
      ...viewport(400, 668),
      insets: { ...NO_INSETS, bottom: FINGER_ROOM_CSS_PX },
    };

    expect(fieldMetrics(shorter, height).unit).toBe(15);
  });

  it("fits the field at its width's unit on a canvas a pixel wider than measured", () => {
    // 393 less the walls is a pixel short of 26 units of 15, which 394 holds.
    const height = fieldHeightFor(viewport(393, 669));
    const wider = {
      ...viewport(394, 669),
      insets: { ...NO_INSETS, bottom: FINGER_ROOM_CSS_PX },
    };

    expect(fieldMetrics(wider, height).unit).toBe(15);
  });
});

describe("fingerRoomOf", () => {
  it.each([
    [FIELD_HEIGHT, 0],
    [FIELD_HEIGHT + 1, FINGER_ROOM_CSS_PX],
    [TALLEST_FIELD, FINGER_ROOM_CSS_PX],
  ])(
    "leaves a board with room for a field %i tall %i CSS px for a finger",
    (roomFor, room) => {
      expect(fingerRoomOf(roomFor)).toBe(room);
    },
  );
});

describe("toCanvasX and toCanvasY", () => {
  it("place a point of the field on the canvas", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([toCanvasX(metrics, 13), toCanvasY(metrics, 30)]).toEqual([
      83 + 13 * 9,
      15 + 30 * 9,
    ]);
  });
});

describe("toFieldX and toFieldY", () => {
  it("place a point of the canvas on the field", () => {
    const metrics = fieldMetrics(viewport(400, 300), FIELD_HEIGHT);

    expect([toFieldX(metrics, 83 + 4.5), toFieldY(metrics, 15 + 18)]).toEqual([
      0.5, 2,
    ]);
  });

  it("undo toCanvasX and toCanvasY", () => {
    const metrics = fieldMetrics(viewport(517, 517, 2.625), FIELD_HEIGHT);

    expect([
      toFieldX(metrics, toCanvasX(metrics, 7.25)),
      toFieldY(metrics, toCanvasY(metrics, 21.5)),
    ]).toEqual([7.25, 21.5]);
  });
});
