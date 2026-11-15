import { MOST_CHARGE } from "../../rules/tuning";
import { PIXEL_RATIOS, billionths } from "../../testing/art_frames";
import { boardCanvas } from "../../testing/canvases";
import { type Place, fieldMetrics, fieldShape } from "../field/field_metrics";
import {
  type GaugeField,
  type GaugePlace,
  createGaugePlace,
  gaugeOf,
} from "./gauge";

/**
 * Returns a phone's field at a pixel ratio, 9 units of 40 CSS px across and
 * 17 down, 360 × 680 CSS px at every ratio, its ceiling's left end on whole
 * device pixels 12 CSS px in and 40 down.
 */
function phoneField(pixelRatio: number): GaugeField {
  return {
    x: Math.round(12 * pixelRatio),
    y: Math.round(40 * pixelRatio),
    width: 360 * pixelRatio,
    height: 680 * pixelRatio,
    pixelRatio,
  };
}

/** Returns a place on a field's canvas some CSS pixels right of its left wall and down from its ceiling, in device pixels. */
function touchOn(field: GaugeField, across: number, down: number): Place {
  return {
    x: field.x + across * field.pixelRatio,
    y: field.y + down * field.pixelRatio,
  };
}

/** Returns where a touch puts the gauge, in a record of its own unless handed one. */
function placeOver(
  field: GaugeField,
  touch: Place,
  into: GaugePlace = createGaugePlace(),
): GaugePlace {
  return gaugeOf(field, touch.x, touch.y, into);
}

/** Returns places turned about another by some degrees, clockwise down the screen. */
function turnedAbout(
  places: readonly Place[],
  about: Place,
  degrees: number,
): readonly Place[] {
  const cos = Math.cos((degrees * Math.PI) / 180);
  const sin = Math.sin((degrees * Math.PI) / 180);
  return places.map(({ x, y }) => ({
    x: about.x + (x - about.x) * cos - (y - about.y) * sin,
    y: about.y + (x - about.x) * sin + (y - about.y) * cos,
  }));
}

/**
 * Returns whether every pip lies inside a field and under its ceiling, some
 * CSS pixels clear of each edge, 16 unless told, give or take a rounding.
 */
function fitsIn(
  field: GaugeField,
  pips: readonly Place[],
  roomCss = 16,
): boolean {
  const room = roomCss * field.pixelRatio - 1e-9;
  return pips.every(
    ({ x, y }) =>
      x >= field.x + room &&
      x <= field.x + field.width - room &&
      y >= field.y + room &&
      y <= field.y + field.height - room,
  );
}

/**
 * Returns how far the pip furthest from its room, 16 CSS px clear of a
 * field's edges, falls short of it, in CSS pixels: 0 where every pip is
 * clear.
 */
function shortOf(field: GaugeField, pips: readonly Place[]): number {
  const room = 16 * field.pixelRatio;
  let short = 0;
  for (const { x, y } of pips) {
    short = Math.max(
      short,
      field.x + room - x,
      x - (field.x + field.width - room),
      field.y + room - y,
      y - (field.y + field.height - room),
    );
  }
  return short / field.pixelRatio;
}

/**
 * Returns the least whole degree, from none to half a turn, that a
 * gauge's pips, turned about a touch toward the field's middle, clockwise
 * from left of it, fall least short of their room at, give or take a
 * rounding, as a turn of the gauge, clockwise down the screen.
 */
function leastShortTurn(
  field: GaugeField,
  place: GaugePlace,
  touch: Place,
): number {
  const toward = touch.x > field.x + field.width / 2 ? -1 : 1;
  const shorts = Array.from({ length: 181 }, (_, degrees) =>
    shortOf(
      field,
      turnedAbout(place.pips, touch, toward * degrees - place.turn),
    ),
  );
  const least = Math.min(...shorts);
  // Adding 0 turns -0, a turn of nothing the other way, into 0.
  return toward * shorts.findIndex((short) => short <= least + 1e-9) + 0;
}

/** Returns where a place lies about a touch: how far, in CSS pixels, and at what angle, in degrees clockwise from straight over it, from just over -180 to 180. */
function seenFrom(
  touch: Place,
  place: Place,
  pixelRatio: number,
): { reach: number; degrees: number } {
  return {
    reach: billionths(
      Math.hypot(place.x - touch.x, place.y - touch.y) / pixelRatio,
    ),
    degrees: billionths(
      (Math.atan2(place.x - touch.x, touch.y - place.y) * 180) / Math.PI,
    ),
  };
}

/** Returns an angle in degrees as from just over -180 to 180, as `Math.atan2()` gives one. */
function halfTurns(degrees: number): number {
  return billionths(180 - ((((180 - degrees) % 360) + 360) % 360));
}

/**
 * Touches on a phone's field, 360 CSS px across and 680 down, in CSS
 * pixels from its ceiling's left end, and the turn each puts the gauge at:
 * none in the middle; by a side wall, the least that keeps the first or
 * the last pip 16 px off it, sin(turn - 44°) ≥ -4/74; under the ceiling or
 * in a corner under it, the least that keeps every pip 16 px under it,
 * cos(turn - 44°) ≤ 24/74, toward the field's middle, clockwise from its
 * very middle; and over it, half a turn, cos(turn - 44°) ≤ -53/74.
 */
const TOUCHES = [
  ["in the middle", 180, 400, 0],
  ["right of the middle", 240, 400, 0],
  ["by the left wall", 20, 400, 41],
  ["by the right wall", 340, 400, -41],
  ["under the ceiling, left of the middle", 120, 40, 116],
  ["under the ceiling, right of the middle", 240, 40, -116],
  ["under the ceiling, at its very middle", 180, 40, 116],
  ["in the ceiling's left corner", 20, 40, 116],
  ["in the ceiling's right corner", 340, 40, -116],
  ["over the ceiling, in the lintel, hanging under it", 180, -37, 180],
] as const;

/**
 * Touches no turn keeps every pip 16 CSS px clear of the field's edges
 * for, in a corner of the field or off it, in CSS pixels from its
 * ceiling's left end, and the turn each puts the gauge at, the least that
 * leaves the pip furthest from its room the nearest to it: square across a
 * corner, 135 degrees, in the ceiling's corners; and none under the
 * floor's middle.
 */
const CORNERS = [
  ["in the ceiling's very left corner", 4, 4, 135],
  ["in the ceiling's very right corner", 356, 4, -135],
  ["past the left wall by the ceiling", -10, 4, 130],
  ["on the floor's band by the left wall", 20, 710, 25],
  ["on the floor's band by the right wall", 340, 710, -25],
  ["under the floor's middle", 180, 760, 0],
] as const;

describe.each(PIXEL_RATIOS)(
  "gaugeOf at %s device pixels to a CSS pixel",
  (pixelRatio) => {
    const field = phoneField(pixelRatio);

    it("lays the middle pip 74 CSS px straight over a touch in the middle", () => {
      const touch = touchOn(field, 180, 400);

      const place = placeOver(field, touch);

      expect(place.pips[2]).toEqual({
        x: touch.x,
        y: touch.y - 74 * pixelRatio,
      });
    });

    it.each(TOUCHES)(
      "turns the gauge over a touch %s by %i degrees",
      (_, across, down, turn) => {
        const place = placeOver(field, touchOn(field, across, down));

        expect(place.turn).toBe(turn);
      },
    );

    it.each(TOUCHES)(
      "lays the pips over a touch %s in an arc about it, 74 CSS px out, 22 degrees apart from the left as they light, turned as the gauge is",
      (_, across, down, turn) => {
        const touch = touchOn(field, across, down);

        const place = placeOver(field, touch);

        expect(
          place.pips.map((pip) => seenFrom(touch, pip, pixelRatio)),
        ).toEqual(
          [-44, -22, 0, 22, 44].map((degrees) => ({
            reach: 74,
            degrees: halfTurns(degrees + turn),
          })),
        );
      },
    );

    it.each(TOUCHES)(
      "keeps every pip over a touch %s inside the field and under its ceiling, 16 CSS px clear of each edge",
      (_, across, down) => {
        const place = placeOver(field, touchOn(field, across, down));

        expect(fitsIn(field, place.pips)).toBe(true);
      },
    );

    it.each(TOUCHES.filter(([, , , turn]) => turn !== 0))(
      "turns the gauge over a touch %s no more than it must: a degree less leaves a pip out",
      (_, across, down, turn) => {
        const touch = touchOn(field, across, down);
        const place = placeOver(field, touch);

        const less = turnedAbout(place.pips, touch, -Math.sign(turn));

        expect(fitsIn(field, less)).toBe(false);
      },
    );

    it.each(TOUCHES)(
      "puts the plate's middle over a touch %s straight toward the middle pip, halfway between it and the first and the last along the way",
      (_, across, down, turn) => {
        const touch = touchOn(field, across, down);

        const place = placeOver(field, touch);

        expect(seenFrom(touch, place.plate, pixelRatio)).toEqual({
          reach: billionths((74 * (1 + Math.cos((44 * Math.PI) / 180))) / 2),
          degrees: halfTurns(turn),
        });
      },
    );

    it.each(CORNERS)(
      "turns the gauge over a touch %s by %i degrees, the least that leaves its pips the least short of their room, where none leaves them clear",
      (_, across, down, turn) => {
        const touch = touchOn(field, across, down);

        const place = placeOver(field, touch);

        expect({
          turn: place.turn,
          leastShort: place.turn === leastShortTurn(field, place, touch),
          clear: fitsIn(field, place.pips),
        }).toEqual({ turn, leastShort: true, clear: false });
      },
    );

    it.each([
      ["left", 175],
      ["right", 185],
    ] as const)(
      "hangs the gauge straight under a touch over the ceiling %s of its middle, where no turn leaves it clear",
      (_, across) => {
        const touch = touchOn(field, across, -45);

        const place = placeOver(field, touch);

        expect({
          middlePip: Math.abs(
            seenFrom(touch, place.pips[2] ?? touch, pixelRatio).degrees,
          ),
          clear: fitsIn(field, place.pips),
        }).toEqual({ middlePip: 180, clear: false });
      },
    );

    it.each([
      [
        "turned clockwise from left of the middle, left of it again, as its side turns it",
        175,
        178,
        116,
      ],
      ["turned clockwise from left of the middle, past it", 175, 196, 116],
      [
        "turned the other way from right of the middle, past it",
        185,
        164,
        -116,
      ],
    ] as const)(
      "turns the gauge over a touch near the field's middle under its ceiling the way the record it is handed last turned, %s",
      (_, from, across, turn) => {
        const place = placeOver(field, touchOn(field, from, 40));

        placeOver(field, touchOn(field, across, 40), place);

        expect(place.turn).toBe(turn);
      },
    );

    it("keeps the gauge over a touch over the ceiling near its middle hanging the way the record it is handed last turned, where no turn leaves it clear", () => {
      const place = placeOver(field, touchOn(field, 175, -45));

      placeOver(field, touchOn(field, 185, -45), place);

      expect(place.turn).toBe(180);
    });

    it("turns the gauge over a touch near the middle of a narrow field the way the record last turned, where that fits, though the other way would leave it more room", () => {
      // 180 CSS px across, its middle 90 in: clockwise from 100 in, the
      // pips must swing round under the touch to clear the right wall.
      const narrow = { ...field, width: 180 * pixelRatio };
      const place = placeOver(narrow, touchOn(narrow, 80, 40));

      placeOver(narrow, touchOn(narrow, 100, 40), place);

      expect(place.turn).toBe(165);
    });

    it("turns the gauge over a touch near the middle of a field too narrow to turn it the way the record last turned toward the middle instead", () => {
      // 150 CSS px across, its middle 75 in: clockwise from 85 in, the
      // pips would cross the right wall before they cleared the ceiling.
      const narrow = { ...field, width: 150 * pixelRatio };
      const place = placeOver(narrow, touchOn(narrow, 65, 40));

      placeOver(narrow, touchOn(narrow, 85, 40), place);

      expect(place.turn).toBe(-156);
    });

    it("turns the gauge over a touch past the middle toward it, from a record turned the other way, once the touch is more than 16 CSS px past it", () => {
      const place = placeOver(field, touchOn(field, 175, 40));

      placeOver(field, touchOn(field, 197, 40), place);

      expect(place.turn).toBe(-116);
    });

    it("turns the gauge over a touch near the middle toward it, from a record left straight", () => {
      const place = placeOver(field, touchOn(field, 180, 400));

      placeOver(field, touchOn(field, 190, 40), place);

      expect(place.turn).toBe(-116);
    });

    it("turns the gauge over every touch on the field, its lintel, its band and past its walls the least that leaves its pips the least short of their room: the least that leaves them clear, where one does", () => {
      // Every 10 CSS px from 35 left of the field to 35 right of it, and
      // from 45 over the ceiling, past the lintel, to 45 under the floor,
      // past the band, clear of the edges a turn of a whole degree can
      // meet exactly, where a rounding would decide.
      const touches = Array.from({ length: 44 * 78 }, (_, i) =>
        touchOn(field, -35 + (i % 44) * 10, -45 + Math.floor(i / 44) * 10),
      );

      const wrong = touches.filter((touch) => {
        const place = placeOver(field, touch);
        return place.turn !== leastShortTurn(field, place, touch);
      });

      expect(wrong).toEqual([]);
    });
  },
);

describe("gaugeOf", () => {
  it("measures the gauge in CSS pixels on the field's metrics, so a field's unit leaves it as it is", () => {
    const canvas = boardCanvas(390, 600, 2);
    const small = fieldMetrics(canvas, fieldShape(canvas, 22));
    const touch = touchOn(small, 60, 200);

    const place = placeOver(small, touch);

    expect({
      unit: small.unit,
      reaches: place.pips.map((pip) => seenFrom(touch, pip, 2).reach),
    }).toEqual({ unit: 44, reaches: [74, 74, 74, 74, 74] });
  });

  it("writes the gauge's place into the record it is handed, its plate and pips the same places, and returns it", () => {
    const field = phoneField(2);
    const place = createGaugePlace();
    const [plate, pips] = [place.plate, [...place.pips]];

    const placed = [
      placeOver(field, touchOn(field, 180, 400), place),
      placeOver(field, touchOn(field, 20, 40), place),
    ];

    expect({
      placed: placed.every((each) => each === place),
      plate: place.plate === plate,
      pips: place.pips.every((pip, at) => pip === pips[at]),
      turn: place.turn,
    }).toEqual({ placed: true, plate: true, pips: true, turn: 116 });
  });

  it("turns the gauge the least of two turns that leave its pips equally short of their room", () => {
    // A field 80 × 150 CSS px, narrower than the gauge, and a touch 5 px
    // past its left wall: turned 79 or 101 degrees, the pips at 35 and 145
    // degrees lie as far from the wall and as far short of the ceiling and
    // the floor.
    const field = { x: 0, y: 0, width: 80, height: 150, pixelRatio: 1 };

    const place = placeOver(field, { x: -5, y: 75 });

    expect(place.turn).toBe(79);
  });

  it("throws for a record with more pips than the gauge has", () => {
    const place = createGaugePlace();
    const extra = { ...place, pips: [...place.pips, { x: 0, y: 0 }] };

    expect(() => gaugeOf(phoneField(1), 100, 100, extra)).toThrow(RangeError);
  });

  it("makes a record with a pip for each notch of charge", () => {
    expect(createGaugePlace().pips).toHaveLength(MOST_CHARGE);
  });
});
