import { FEEL } from "../timeline/feel";
import { type Fluff, type TuftFlight, tuftAt } from "./tufts";

/** A fluff of 6 tufts thrown at a power of 1 from the middle of the square 2 across and 1 down, 100 ms into a move. */
const FLUFF: Fluff = {
  what: "fluff",
  atMs: 100,
  at: { x: 2, y: 1 },
  tuft: "tuft-red",
  count: 6,
  power: 1,
};

/** Returns where a tuft of the fluff is a time after it flew, or null once it flies no more. */
function flightOf(
  index: number,
  sinceMs: number,
  fluff: Fluff = FLUFF,
): TuftFlight | null {
  const into: TuftFlight = {
    x: 0,
    y: 0,
    rotation: 0,
    length: 0,
    width: 0,
    alpha: 0,
    frizzy: false,
  };
  return tuftAt(fluff, index, sinceMs, FEEL, into) ? into : null;
}

/** Returns how far a tuft of the fluff is from where it flew from, in squares, a time after. */
function distanceOf(index: number, sinceMs: number): number {
  const flight = flightOf(index, sinceMs);
  return flight === null
    ? Number.NaN
    : Math.hypot(flight.x - FLUFF.at.x, flight.y - FLUFF.at.y);
}

describe("tuftAt", () => {
  it("sets a tuft out from its fluff's place, opaque and as long as it is drawn", () => {
    const flight = flightOf(1, 0);

    expect({
      x: flight?.x,
      y: flight?.y,
      alpha: flight?.alpha,
    }).toEqual({ x: 2, y: 1, alpha: 1 });
  });

  it("flies the same every time", () => {
    expect(flightOf(4, 250)).toEqual(flightOf(4, 250));
  });

  it("flies each tuft of a fluff its own way", () => {
    const places = [0, 1, 2, 3, 4, 5].map((index) => {
      const flight = flightOf(index, 200);
      return `${String(flight?.x)},${String(flight?.y)}`;
    });

    expect(new Set(places).size).toBe(6);
  });

  it("slows as it flies out", () => {
    const first = distanceOf(2, 50);
    const second = distanceOf(2, 100) - first;

    expect(second).toBeLessThan(first);
  });

  it("flies harder for a fluff thrown harder", () => {
    const hard = flightOf(3, 100, { ...FLUFF, power: 2 });
    const soft = flightOf(3, 100);

    expect(Math.hypot((hard?.x ?? 0) - 2, (hard?.y ?? 0) - 1)).toBeGreaterThan(
      Math.hypot((soft?.x ?? 0) - 2, (soft?.y ?? 0) - 1),
    );
  });

  it("drifts down once it has slowed", () => {
    const late = flightOf(1, FEEL.tuftLifeMs - 10);
    const later = flightOf(1, FEEL.tuftLifeMs);

    expect((later?.y ?? 0) - (late?.y ?? 0)).toBeGreaterThan(0);
  });

  it("fades and thins only toward its life's end, and flies no more past it", () => {
    const most = FEEL.tuftLifeMs + FEEL.tuftLifeSpreadMs;

    expect([
      flightOf(0, 100)?.alpha,
      (flightOf(0, FEEL.tuftLifeMs - 1)?.alpha ?? 1) < 1,
      flightOf(0, most),
    ]).toEqual([1, true, null]);
  });

  it("thins as it flies", () => {
    expect(flightOf(5, 300)?.width).toBeLessThan(flightOf(5, 0)?.width ?? 0);
  });

  it("draws every third tuft in the frizzball's color, from the first", () => {
    expect(
      [0, 1, 2, 3, 4, 5].map((index) => flightOf(index, 0)?.frizzy),
    ).toEqual([true, false, false, true, false, false]);
  });

  it("draws no tuft larger than its frame, which is the largest", () => {
    const sizes = [0, 1, 2, 3, 4, 5].flatMap((index) => {
      const flight = flightOf(index, 0);
      return [flight?.length ?? 2, flight?.width ?? 2];
    });

    expect(sizes.every((size) => size > 0 && size <= 1)).toBe(true);
  });
});
