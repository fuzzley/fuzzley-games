import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import { flatsOf, poolsAt, washAt } from "./marks";

/** A field wider than it is tall, with no draws. */
const SITE = {
  width: 90,
  height: 40,
  random: () => 0,
  strewn: () => 0,
};

describe("washAt", () => {
  it("lays a soft shape at shares of the field", () => {
    const soft = washAt(SITE, { x: 0.5, y: 0.25 }, 0.5, "ice", 0.7);

    expect([soft.at, soft.tint, soft.strength, soft.turn]).toEqual([
      { x: 45, y: 10 },
      "ice",
      0.7,
      0,
    ]);
  });

  it("sizes it by the field's short side, stretched the way the field is long", () => {
    const soft = washAt(SITE, { x: 0.5, y: 0.5 }, 0.5, "ice", 1);

    expect([soft.rx, soft.ry]).toEqual([
      0.5 * FIELD_SHORT_SIDE * Math.sqrt(90 / FIELD_SHORT_SIDE),
      0.5 * FIELD_SHORT_SIDE,
    ]);
  });
});

describe("poolsAt", () => {
  it("lays a round pool behind the shade in a dark palette, and one behind the lit side in a light one", () => {
    const pools = poolsAt({ x: 1, y: 2 }, { x: 3, y: 4 }, 0.5, "iron", 0.9);

    expect(pools.map(({ at, shows }) => [at, shows])).toEqual([
      [{ x: 1, y: 2 }, "dark"],
      [{ x: 3, y: 4 }, "light"],
    ]);
  });

  it("sizes both by the field's short side, whatever its shape", () => {
    const pools = poolsAt({ x: 1, y: 2 }, { x: 3, y: 4 }, 0.5, "iron", 0.9);

    expect(pools.map(({ rx, ry }) => [rx, ry])).toEqual([
      [20, 20],
      [20, 20],
    ]);
  });
});

describe("flatsOf", () => {
  /** A face of a radius of 1. */
  const FACE = {
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
    light: 0.8,
  };

  it("lays faces of a radius of 1 about a middle at a radius", () => {
    const [flat] = flatsOf([FACE], { x: 10, y: 20 }, 3, "stone");

    expect(flat).toEqual({
      kind: "flat",
      points: [
        { x: 10, y: 20 },
        { x: 13, y: 20 },
        { x: 10, y: 23 },
      ],
      light: 0.8,
      tint: "stone",
    });
  });

  it("marks them fine where asked", () => {
    const [flat] = flatsOf([FACE], { x: 0, y: 0 }, 1, "stone", true);

    expect(flat?.fine).toBe(true);
  });
});
