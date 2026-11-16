import { PICTURE_TORUS } from "../../testing/field_picture";
import { MOST_CREW, STRAY_RADIUS } from "../../rules/tuning";
import { type TowLine, createTowLine } from "../field/tow_line";
import {
  RESCUE_RING,
  type RescueRing,
  SPRING,
  createSprungLine,
  rescueRingAt,
  springShare,
  sprungLine,
} from "./rescue";
import { RESCUE_MS } from "./timing";

/** Returns a record a fuzzball caught's soft ring is written into. */
function ring(): RescueRing {
  return { radius: 0, softWidth: 0, shown: 0 };
}

/** Returns a line in tow through places on the field, each the short way from the one before, as `towLineAt()` writes it. */
function lineThrough(
  ...places: readonly (readonly [number, number])[]
): TowLine {
  const line = createTowLine();
  places.forEach(([x, y], i) => {
    const at = line.at[i];
    if (at) Object.assign(at, { x, y });
  });
  line.count = places.length;
  return line;
}

/** Returns the places a line in tow runs through, in order. */
function placesOf(
  line: Readonly<TowLine>,
): readonly (readonly [number, number])[] {
  return line.at.slice(0, line.count).map(({ x, y }) => [x, y]);
}

describe("rescueRingAt", () => {
  it("shows no ring before it opens or once it is gone", () => {
    expect([rescueRingAt(-1, ring()), rescueRingAt(RESCUE_MS, ring())]).toEqual(
      [null, null],
    );
  });

  it("starts at a stray's bubble's rim, whole, its soft outside at its widest", () => {
    expect(rescueRingAt(0, ring())).toEqual({
      radius: STRAY_RADIUS,
      softWidth: RESCUE_RING.softWidth,
      shown: 1,
    });
  });

  it("opens most of the way in its first half, its soft outside narrowing and the whole fading", () => {
    const halfway = rescueRingAt(RESCUE_MS / 2, ring());

    expect([halfway?.radius, halfway?.softWidth, halfway?.shown]).toEqual([
      STRAY_RADIUS + RESCUE_RING.opens * (7 / 8),
      RESCUE_RING.softWidth * (3 / 4),
      1 / 2,
    ]);
  });

  it("writes the ring into the record it is given", () => {
    const into = ring();

    expect(rescueRingAt(0, into)).toBe(into);
  });
});

describe("springShare", () => {
  it("is straight before one joins, as one joins and once its time is over", () => {
    expect([springShare(-1), springShare(0), springShare(RESCUE_MS)]).toEqual([
      0, 0, 0,
    ]);
  });

  it("swings one way and back the other, as many times as it swings", () => {
    const quarters = Array.from({ length: SPRING.swings * 2 }, (_, i) =>
      Math.sign(springShare(((i + 1 / 2) * RESCUE_MS) / (SPRING.swings * 2))),
    );

    expect(quarters).toEqual([1, -1, 1, -1, 1, -1]);
  });

  it("dies away as it swings", () => {
    const peaks = Array.from({ length: SPRING.swings }, (_, i) =>
      springShare(((i + 1 / 4) * RESCUE_MS) / SPRING.swings),
    );

    expect(
      peaks.every((peak, i) => i === 0 || peak < (peaks[i - 1] ?? 0)),
    ).toBe(true);
  });
});

describe("createSprungLine", () => {
  it("has room for the hook and each stretch's steps, with the most in tow", () => {
    expect(createSprungLine().at).toHaveLength(
      1 + (MOST_CREW - 1) * SPRING.steps,
    );
  });
});

describe("sprungLine", () => {
  it("hands back the line as it is with no share of a spring", () => {
    const line = lineThrough([10, 10], [10, 12]);

    expect(sprungLine(line, 0, PICTURE_TORUS, createSprungLine())).toBe(line);
  });

  it("hands back the line as it is with no stretch", () => {
    const line = lineThrough([10, 10]);

    expect(sprungLine(line, 1, PICTURE_TORUS, createSprungLine())).toBe(line);
  });

  it("draws each stretch in steps along half a turn, bowed aside by the share of its reach, each the other way from the one before", () => {
    const line = lineThrough([10, 10], [10, 14], [10, 18]);
    const aside = SPRING.reach / 2;
    const middle = aside * Math.SQRT1_2;

    const sprung = sprungLine(line, 1 / 2, PICTURE_TORUS, createSprungLine());

    expect(placesOf(sprung).map(([x, y]) => [Number(x.toFixed(9)), y])).toEqual(
      [
        [10, 10],
        [Number((10 - middle).toFixed(9)), 11],
        [10 - aside, 12],
        [Number((10 - middle).toFixed(9)), 13],
        [10, 14],
        [Number((10 + middle).toFixed(9)), 15],
        [10 + aside, 16],
        [Number((10 + middle).toFixed(9)), 17],
        [10, 18],
      ],
    );
  });

  it("copies the line past the edge it reaches across as it bows", () => {
    const line = lineThrough([0.1, 10], [0.1, 14]);

    const sprung = sprungLine(line, 1, PICTURE_TORUS, createSprungLine());

    expect(sprung.shift).toEqual({ x: PICTURE_TORUS.width, y: 0 });
  });

  it("copies the line past no edge it doesn't reach", () => {
    const line = lineThrough([30, 10], [30, 14]);

    const sprung = sprungLine(line, 1, PICTURE_TORUS, createSprungLine());

    expect(sprung.shift).toEqual({ x: 0, y: 0 });
  });

  it("copies the line past the edge below as it runs down across it", () => {
    const line = lineThrough([30, 38], [30, 42]);

    const sprung = sprungLine(line, 1, PICTURE_TORUS, createSprungLine());

    expect(sprung.shift).toEqual({ x: 0, y: -PICTURE_TORUS.height });
  });

  it("stops at the room its record has", () => {
    const line = lineThrough([10, 10], [10, 14], [10, 18]);

    const sprung = sprungLine(line, 1, PICTURE_TORUS, createTowLine());

    expect(sprung.count).toBe(MOST_CREW);
  });

  it("stops at the places the line has", () => {
    const line = lineThrough([10, 10], [10, 14]);
    line.count = MOST_CREW + 1;

    const sprung = sprungLine(line, 1, PICTURE_TORUS, createSprungLine());

    expect(sprung.count).toBe(1 + (MOST_CREW - 1) * SPRING.steps);
  });

  it("writes the line into the record it is given", () => {
    const into = createSprungLine();

    expect(
      sprungLine(lineThrough([10, 10], [10, 14]), 1, PICTURE_TORUS, into),
    ).toBe(into);
  });
});
