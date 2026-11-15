import { strip } from "./cut";
import type { Corner } from "./cut";

/** Returns a ring of corners evenly round, at a height. */
function ring(count: number, radius: number, z: number): readonly Corner[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    return {
      p: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
      z,
      angle,
    };
  });
}

describe("strip()", () => {
  it("joins two rings in a triangle for each corner of either", () => {
    const triangles = strip(ring(8, 1, 0), ring(5, 0.5, 0.5));

    expect(triangles).toHaveLength(13);
  });

  it("throws for a ring of no corners", () => {
    expect(() => strip([], ring(5, 0.5, 0.5))).toThrow(RangeError);
    expect(() => strip(ring(8, 1, 0), [])).toThrow(RangeError);
  });
});
