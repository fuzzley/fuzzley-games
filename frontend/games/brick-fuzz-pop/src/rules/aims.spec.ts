import { readFileSync } from "node:fs";
import {
  AIMS_FILE,
  aimsSource,
  angleOf,
  degreesOf,
} from "../../tools/build-aims.mjs";
import { AIMS } from "./aims";
import { AIM_COUNT } from "./tuning";

/** How far a heading's length may stray from 1, or two neighbours' turn from a quarter of a degree. */
const WITHIN = 1e-15;

/** Returns the aims for which a measure of their heading is true, by index. */
function aimsWhere(
  measure: (dx: number, dy: number, angle: number) => boolean,
): number[] {
  return AIMS.flatMap(([dx, dy], aim) =>
    measure(dx, dy, angleOf(aim)) ? [aim] : [],
  );
}

describe("AIMS", () => {
  it("holds a heading for each aim", () => {
    expect(AIMS).toHaveLength(AIM_COUNT);
  });

  it.each([
    [0, 8],
    [1, 8.25],
    [3, 8.75],
    [328, 90],
    [656, 172],
  ])("points aim %i at %f°", (aim, degrees) => {
    expect(degreesOf(aim)).toBe(degrees);
  });

  // Exactly, as this Node wrote them: a number written to fewer digits than
  // String() writes would still lie within 1e-15.
  it("points each aim across by its angle's cosine", () => {
    expect(aimsWhere((dx, _, angle) => dx !== Math.cos(angle))).toEqual([]);
  });

  it("points each aim up by its angle's sine", () => {
    expect(aimsWhere((_, dy, angle) => dy !== Math.sin(angle))).toEqual([]);
  });

  it("makes each heading a unit long", () => {
    const astray = aimsWhere(
      (dx, dy) => Math.abs(Math.hypot(dx, dy) - 1) > WITHIN,
    );

    expect(astray).toEqual([]);
  });

  // Read from the headings alone, so an angle the script works out wrong,
  // such as a degree's four aims alike, fails here.
  it("turns each aim a quarter of a degree from the one before", () => {
    const quarter = Math.cos(Math.PI / 720);
    const astray = AIMS.slice(1).flatMap(([dx, dy], i) => {
      const [beforeX, beforeY] = AIMS[i] ?? [0, 0];
      const dot = dx * beforeX + dy * beforeY;
      return Math.abs(dot - quarter) > WITHIN ? [i + 1] : [];
    });

    expect(astray).toEqual([]);
  });

  it("is what tools/build-aims.mjs writes now", () => {
    expect(readFileSync(AIMS_FILE, "utf8")).toBe(aimsSource());
  });
});
