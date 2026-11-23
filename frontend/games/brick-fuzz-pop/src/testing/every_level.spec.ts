import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { LEVELS, LEVEL_SETS } from "../rules/levels/levels";
import { floorGames } from "@fz/brick-wall/testing/holders";
import { SEED_STRIDE } from "@fz/dev/report";
import {
  CERTIFICATES,
  FLOORED,
  FLOOR_SEEDS,
  FLOOR_SPECS,
  certificateOf,
} from "./every_level";
import { REPORT_API } from "./report_api";

/** Returns the files in a folder of `src/rules/levels/`. */
function filesIn(folder: string): Set<string> {
  return new Set(
    readdirSync(join(import.meta.dirname, "../rules/levels", folder)),
  );
}

// Vitest plays the specs of a file one after another, so the specs that
// replay the certificates and hold the floors keep a file for each depth,
// and for each set and depth, which it plays side by side.
describe("the specs that replay the certificates and hold the floors", () => {
  it("keep a file in every_level for each depth, and only those", () => {
    expect(filesIn("every_level")).toEqual(
      new Set(DEPTHS.map((depth) => `${String(depth)}.spec.ts`)),
    );
  });

  it("keep a file in every_floor for each set on 11, 13 and 22 deep, and only those", () => {
    expect(filesIn("every_floor")).toEqual(
      new Set([
        ...LEVEL_SETS.flatMap(({ id }) =>
          [11, 13, 22].map((depth) => `${id}_${String(depth)}.spec.ts`),
        ),
      ]),
    );
  });

  it("name each floor's spec for its set and depth", () => {
    expect(FLOOR_SPECS).toContainEqual({
      name: "warm-up_13",
      setId: "warm-up",
      depth: 13,
    });
  });
});

describe("CERTIFICATES", () => {
  it("holds every set's certificates, by its id", () => {
    expect(Object.keys(CERTIFICATES)).toEqual(LEVEL_SETS.map(({ id }) => id));
  });
});

describe("certificateOf", () => {
  const [entry] = LEVELS;
  const id = entry!.data.id;

  it("reads a level's line on a depth as shots of an aim and a charge", () => {
    const certificates = {
      "warm-up": {
        [id]: {
          "11": [
            [100, 3],
            [4, 0],
          ],
        },
      },
    };

    const line = certificateOf(entry!, 11, certificates);

    expect(line).toEqual([
      [100, 3],
      [4, 0],
    ]);
  });

  it("gives none for a depth its set's certificates lack", () => {
    const certificates = { "warm-up": { [id]: { "11": [[100, 3]] } } };

    expect(certificateOf(entry!, 12, certificates)).toBeNull();
  });

  it("reads the game's certificates by default", () => {
    expect(certificateOf(entry!, 11)).toEqual(
      CERTIFICATES["warm-up"]?.[id]?.["11"],
    );
  });

  it.each([[[100]], [[100, 3, 1]], [["100", 3]]])(
    "throws for a shot of %j, which isn't an aim and a charge",
    (shot) => {
      const certificates = { "warm-up": { [id]: { "11": [shot] } } };

      expect(() => certificateOf(entry!, 11, certificates)).toThrow(
        `A certificate's shot is an aim and a charge, not ${JSON.stringify(shot)}.`,
      );
    },
  );
});

describe("FLOORED", () => {
  it("plays a level's games on a depth as yarn report:levels plays its first, from the same seeds", () => {
    const [entry] = LEVELS;
    const seeds = Array.from(
      { length: FLOOR_SEEDS },
      (_, game) => entry!.number * SEED_STRIDE + game,
    );

    const games = floorGames(FLOORED.linePlayOf, entry!, 13);

    expect(games).toEqual(
      seeds.map((seed) => REPORT_API.playCasually(entry!.number, 13, seed)),
    );
  });
});
