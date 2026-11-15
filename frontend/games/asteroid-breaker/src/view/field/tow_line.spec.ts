import type { Field } from "../../rules/field/field";
import { layTow } from "../../rules/ship/tow";
import type { Moving } from "../../rules/torus";
import { TOW_HOOK, TOW_LINK } from "../../rules/tuning";
import { fieldFrom, shipOf } from "../../testing/field_picture";
import type { Drawn } from "./frame";
import {
  type TowLine,
  createTowLine,
  towLineAt,
  towLineWidth,
} from "./tow_line";

/** The way a pod points nose up, nose right and nose down and right. */
const UP = -Math.PI / 2;
const RIGHT = 0;
const DOWN_RIGHT = Math.PI / 4;

/**
 * Returns a field of 72 by 40 with the pod flying at a place, pointing a
 * way, the first crew's two in tow laid straight out behind it.
 */
function lineField(x: number, y: number, angle: number): Field {
  const field = fieldFrom(["...", ".^.", "..."]);
  const ship = shipOf(field);
  ship.x = x;
  ship.y = y;
  ship.angle = angle;
  layTow(field);
  return field;
}

/** Returns where a field's pod is drawn, as it stands. */
function podOf(field: Field): Drawn {
  const { x, y, angle } = shipOf(field);
  return { x, y, angle };
}

/** Returns a number to six places, so sums written two ways agree. */
function round(value: number): number {
  return Number(value.toFixed(6));
}

/** Returns the places a line runs through, each to six places. */
function placesOf(line: TowLine): Moving[] {
  return line.at
    .slice(0, line.count)
    .map(({ x, y }) => ({ x: round(x), y: round(y) }));
}

describe("towLineAt", () => {
  it("runs from the hook behind the pod through each in tow", () => {
    const field = lineField(30, 20, UP);

    const line = towLineAt(field, podOf(field), 1, createTowLine());

    expect(placesOf(line)).toEqual([
      { x: 30, y: round(20 + TOW_HOOK) },
      { x: 30, y: round(20 + TOW_HOOK + TOW_LINK) },
      { x: 30, y: round(20 + TOW_HOOK + 2 * TOW_LINK) },
    ]);
  });

  it("hangs from the pod where it is drawn", () => {
    const field = lineField(30, 20, UP);

    const line = towLineAt(
      field,
      { x: 31, y: 20, angle: RIGHT },
      1,
      createTowLine(),
    );

    expect(placesOf(line)[0]).toEqual({ x: round(31 - TOW_HOOK), y: 20 });
  });

  it("draws each in tow between where it was a step ago and where it is", () => {
    const field = lineField(30, 20, UP);
    const link = field.tow[1];
    if (link) link.lastX = link.x - 1;

    const line = towLineAt(field, podOf(field), 0.25, createTowLine());

    expect(placesOf(line)[2]).toEqual({
      x: 29.25,
      y: round(20 + TOW_HOOK + 2 * TOW_LINK),
    });
  });

  it("lays each the short way across the edge from the one ahead, and draws a copy across", () => {
    const field = lineField(2, 20, RIGHT);

    const line = towLineAt(field, podOf(field), 1, createTowLine());

    expect({ at: placesOf(line).map(({ x }) => x), shift: line.shift }).toEqual(
      {
        at: [
          round(2 - TOW_HOOK),
          round(2 - TOW_HOOK - TOW_LINK),
          round(2 - TOW_HOOK - 2 * TOW_LINK),
        ],
        shift: { x: 72, y: 0 },
      },
    );
  });

  it("draws a copy above as it reaches past the field's bottom edge", () => {
    const field = lineField(30, 38, UP);

    const line = towLineAt(field, podOf(field), 1, createTowLine());

    expect({ last: placesOf(line)[2], shift: line.shift }).toEqual({
      last: { x: 30, y: round(38 + TOW_HOOK + 2 * TOW_LINK) },
      shift: { x: 0, y: -40 },
    });
  });

  it("draws copies across, down and at the corner as it reaches past two edges", () => {
    const field = lineField(1, 1, DOWN_RIGHT);

    const line = towLineAt(field, podOf(field), 1, createTowLine());

    expect(line.shift).toEqual({ x: 72, y: 40 });
  });

  it("draws no copy within the field", () => {
    const field = lineField(30, 20, UP);

    const line = towLineAt(field, podOf(field), 1, createTowLine());

    expect(line.shift).toEqual({ x: 0, y: 0 });
  });

  it("draws none with no pod, and no copy", () => {
    const field = lineField(2, 20, RIGHT);
    const line = towLineAt(field, podOf(field), 1, createTowLine());

    towLineAt(field, null, 1, line);

    expect({ count: line.count, shift: line.shift }).toEqual({
      count: 0,
      shift: { x: 0, y: 0 },
    });
  });

  it("draws none with no one in tow", () => {
    const field = lineField(30, 20, UP);
    field.crew = { ...field.crew, tow: [] };

    expect(towLineAt(field, podOf(field), 1, createTowLine()).count).toBe(0);
  });

  it("writes into the record it is handed", () => {
    const field = lineField(30, 20, UP);
    const line = createTowLine();

    expect(towLineAt(field, podOf(field), 1, line)).toBe(line);
  });
});

describe("towLineWidth", () => {
  it("draws the line a twentieth of a unit wide", () => {
    expect(towLineWidth({ unit: 60, pixelRatio: 1 })).toBe(3);
  });

  it("draws it a CSS pixel wide at least", () => {
    expect(towLineWidth({ unit: 6, pixelRatio: 2 })).toBe(2);
  });
});
