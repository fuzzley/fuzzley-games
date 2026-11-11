import { variantOfSpec } from "@fz/core/testing";
import { SEED_STRIDE } from "@fz/dev/report";
import sparks from "../rules/levels/certificates/sparks.json";
import warmUp from "../rules/levels/certificates/warm-up.json";
import {
  LEVELS,
  LEVEL_SETS,
  type LevelEntry,
  parseLevel,
} from "../rules/levels/levels";
import { parFrom, parOf } from "../rules/run/stars";
import { DEPTHS } from "../rules/wall/wall";
import { CASUAL_FLOORS, playCasually } from "./casual";
import { type CertifiedShot, type Line, lineHolds, replayLine } from "./solver";
import { SIM_TIMEOUT_MS } from "./timing";

/** Holds each level's line on each depth, by the level's id, then by the depth, as `yarn certify:levels` writes them. */
export type Certificates = Readonly<
  Record<string, Readonly<Record<string, readonly (readonly number[])[]>>>
>;

/** Every set's certificates, by the set's id. */
export const CERTIFICATES: Readonly<Record<string, Certificates>> = {
  "warm-up": warmUp,
  sparks,
};

/** The depths the careless player is held to its floors on: the two shapes of the shallowest fields, and the deepest. */
export const FLOOR_DEPTHS = [11, 13, 22] as const;

/** How many games the careless player plays each level on each of those depths. */
export const FLOOR_SEEDS = 20;

/** Describes the levels a spec in `every_floor/` holds to their set's floor: the set's and the depth's, named for both. */
interface FloorSpec {
  readonly name: string;
  readonly setId: string;
  readonly depth: number;
}

/** Every spec in `every_floor/`, a set and a depth each, named `<set>_<depth>`. */
export const FLOOR_SPECS: readonly FloorSpec[] = LEVEL_SETS.flatMap(({ id }) =>
  FLOOR_DEPTHS.map((depth) => ({
    name: `${id}_${String(depth)}`,
    setId: id,
    depth,
  })),
);

/** What a failed replay or a missing line says to do. */
const CERTIFY_AGAIN = "run `yarn certify:levels` to find the lines again";

/**
 * Returns a level's certificate on a depth as a line of shots, or null
 * where its set's certificates have none, or throws for a shot that isn't
 * an aim and a charge.
 */
export function certificateOf(
  entry: LevelEntry,
  depth: number,
  certificates: Readonly<Record<string, Certificates>> = CERTIFICATES,
): Line | null {
  const shots = certificates[entry.set.id]?.[entry.data.id]?.[String(depth)];
  return shots?.map(pairOf) ?? null;
}

/** Returns a shot of a certificate as an aim and a charge, or throws for one that isn't a pair. */
function pairOf(shot: readonly number[]): CertifiedShot {
  const [aim, charge, ...rest] = shot;
  if (aim === undefined || charge === undefined || rest.length > 0) {
    throw new Error(
      `A certificate's shot is an aim and a charge, not ${JSON.stringify(shot)}.`,
    );
  }
  return [aim, charge];
}

/** Returns each level of the game as a spec's row: its number, its name and the level. */
function levelRows(levels: readonly LevelEntry[]) {
  return levels.map((entry) => [entry.number, entry.data.name, entry] as const);
}

/**
 * Holds every level's certificate, on the depth its spec file is named
 * for, to holding (`lineHolds()`): clearing the level through
 * `playRound()` in as many rounds as it has shots, no brick the level
 * needs ever coming down to the row over the floor's; and its par to half
 * as many rounds again.
 *
 * Each depth's spec in `src/rules/levels/every_level/` calls it with its
 * own file (`import.meta.filename`), so Vitest replays the depths side by
 * side and a file replays no depth but its own.
 */
export function holdEveryCertificate(specFile: string): void {
  const depth = variantOfSpec(specFile, DEPTHS, "every_level");
  describe(`every level's certificate on a field ${String(depth)} deep`, () => {
    it.each(levelRows(LEVELS))(
      "clears level %i, %s, with a row to spare, its par half its rounds again",
      (_, __, entry) => {
        const line = certificateOf(entry, depth);
        expect(
          line,
          `Level "${entry.data.id}" has no certificate on a field ${String(depth)} deep: ${CERTIFY_AGAIN}.`,
        ).not.toBeNull();
        const shots = line ?? [];

        const played = replayLine(parseLevel(entry.data), depth, shots);

        expect(
          {
            holds: lineHolds(shots, played),
            par: parOf(entry.data.id, depth),
          },
          `Level "${entry.data.id}"'s certificate on a field ${String(depth)} deep, of ${String(shots.length)} shots, ${played.cleared ? "cleared" : "didn't clear"} it in ${String(played.rounds)} rounds, its needed bricks down to row ${String(played.leastRow)}: ${CERTIFY_AGAIN}.`,
        ).toEqual({ holds: true, par: parFrom(shots.length) });
      },
    );
  });
}

/**
 * Holds every level of a set to its floor, the times in 100 the careless
 * player must clear it, over {@link FLOOR_SEEDS} games on a field of a
 * depth, the set and the depth those its spec file is named for. The games'
 * seeds are a level's own, as `yarn report:levels` numbers them, so the
 * report's first games are the spec's.
 *
 * Each spec in `src/rules/levels/every_floor/` calls it with its own file
 * (`import.meta.filename`), so Vitest plays the sets and depths side by
 * side.
 */
export function holdEveryFloor(specFile: string): void {
  const name = variantOfSpec(
    specFile,
    FLOOR_SPECS.map((spec) => spec.name),
    "every_floor",
  );
  const { setId, depth } = FLOOR_SPECS.find((spec) => spec.name === name)!;
  const floor = CASUAL_FLOORS[setId];
  if (floor === undefined) {
    throw new Error(`The set "${setId}" has no floor in CASUAL_FLOORS.`);
  }
  const suite = `the careless player on a field ${String(depth)} deep`;
  describe(suite, { timeout: SIM_TIMEOUT_MS }, () => {
    it.each(levelRows(LEVELS.filter((entry) => entry.set.id === setId)))(
      `clears level %i, %s, at least ${String(floor)} times in 100`,
      (_, __, entry) => {
        const level = parseLevel(entry.data);

        const cleared = Array.from({ length: FLOOR_SEEDS }, (_, game) =>
          playCasually(level, depth, entry.number * SEED_STRIDE + game),
        ).filter((played) => played.cleared).length;

        expect(
          (cleared * 100) / FLOOR_SEEDS,
          `The careless player cleared level "${entry.data.id}" on a field ${String(depth)} deep ${String(cleared)} times in ${String(FLOOR_SEEDS)}: \`yarn report:levels\` shows it over more games.`,
        ).toBeGreaterThanOrEqual(floor);
      },
    );
  });
}
