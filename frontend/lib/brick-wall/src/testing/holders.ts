// What holds a wall game's levels beatable, a spec file at a time: every
// level's certificate replayed on the depth its file is named for, and the
// careless player held to a set's floor on the set and the depth its file is
// named for, so Vitest plays the files side by side and a file plays no
// depth but its own.

import { variantOfSpec } from "@fz/core/testing";
import { describe, expect, it } from "vitest";
import { DEPTHS } from "../rules/field";
import { type PlayedCarelessly, playCarelessly } from "./careless";
import {
  type Line,
  type LinePlay,
  type WallStart,
  lineHolds,
  replayLine,
} from "./solver";

/**
 * How far apart two levels' careless games' seeds stand: a level's are its
 * number times this, and on, as `@fz/dev/report` numbers a report's games,
 * so a report's first games are the floors' own.
 *
 * It is `@fz/dev/report`'s own, kept here, which its spec holds equal,
 * since the library's compile can't read `@fz/dev`'s modules, which import
 * one another with their extensions for Node.
 */
export const SEED_STRIDE = 1000;

/** How many games the careless player plays each level on each depth its floor is held on. */
export const FLOOR_SEEDS = 20;

/** Describes a level of a wall game, so far as the holders name it. */
export interface HeldLevel {
  /** Its place in the game, from 1, which numbers its careless games' seeds. */
  readonly number: number;
  readonly set: { readonly id: string };
  readonly data: { readonly id: string; readonly name: string };
}

/** Holds each level's certificate on each depth, as a set's file keeps them: by the level's id, then by the depth. */
export type Certificates = Readonly<
  Record<string, Readonly<Record<string, readonly unknown[]>>>
>;

/** Holds a wall game's certificates as their files keep them, and the codec that reads a shot of one back. */
export interface CertificateFiles<C> {
  /** Each set's certificates, by the set's id. */
  readonly certificates: Readonly<Record<string, Certificates>>;
  /** Returns a shot as a certificate's file keeps it, or throws for one that isn't. */
  readonly readShot: (kept: unknown) => C;
}

/** Returns how a wall game plays one of its levels on a field of a depth. */
export type LinePlayOf<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
> = (entry: E, depth: number) => LinePlay<K, T, C>;

/** Holds what a wall game's certificates are replayed with: its levels and their certificates, how a level plays, and its par. */
export interface CertifiedLevels<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
> extends CertificateFiles<C> {
  /** Every level, in the order played. */
  readonly levels: readonly E[];
  readonly linePlayOf: LinePlayOf<E, K, T, C>;
  /** Returns a level's par on a field of a depth, as the game keeps it. */
  readonly parOf: (entry: E, depth: number) => number;
  /** Returns the par a certificate of so many rounds earns. */
  readonly parFrom: (rounds: number) => number;
}

/** Holds what the careless player is held to its floors with: a wall game's levels, the floors of their sets, the depths they are held on and how a level plays. */
export interface FlooredLevels<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
> {
  /** Every level, in the order played. */
  readonly levels: readonly E[];
  /** The times in 100 the careless player must clear each level of a set, by the set's id. */
  readonly floors: Readonly<Record<string, number>>;
  /** The depths the floors are held on, shallowest first. */
  readonly depths: readonly number[];
  readonly linePlayOf: LinePlayOf<E, K, T, C>;
  /** How long a test of a level's games may take, in milliseconds. */
  readonly timeoutMs: number;
}

/** Describes the levels a floor's spec file holds to their set's floor: the set's and the depth's, named for both. */
export interface FloorSpec {
  /** The spec file's name, `<set>_<depth>`, without `.spec.ts`. */
  readonly name: string;
  readonly setId: string;
  readonly depth: number;
}

/** What a failed replay or a missing line says to do. */
const CERTIFY_AGAIN = "run `yarn certify:levels` to find the lines again";

/** Returns the floors' spec files of levels' sets on some depths, a file a set and depth, the sets in the order played. */
export function floorSpecsOf(
  levels: readonly HeldLevel[],
  depths: readonly number[],
): readonly FloorSpec[] {
  const sets = [...new Set(levels.map((entry) => entry.set.id))];
  return sets.flatMap((setId) =>
    depths.map((depth) => ({
      name: `${setId}_${String(depth)}`,
      setId,
      depth,
    })),
  );
}

/**
 * Returns a level's certificate on a depth as a line, each shot read back by
 * the codec, or null where its set's certificates have none; the codec
 * throws for a shot it can't read.
 */
export function certificateOf<C>(
  files: CertificateFiles<C>,
  entry: HeldLevel,
  depth: number,
): Line<C> | null {
  const shots =
    files.certificates[entry.set.id]?.[entry.data.id]?.[String(depth)];
  return shots?.map((shot) => files.readShot(shot)) ?? null;
}

/**
 * Returns what keeps a level's certificate on a depth from holding, a
 * sentence that says how to mend it, or null for one that holds: a line that
 * clears the level in as many rounds as it has shots, no brick the level
 * needs ever coming down to the row over the floor's (`lineHolds()`), at the
 * par its rounds earn.
 */
export function certificateProblem<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
>(
  certified: CertifiedLevels<E, K, T, C>,
  entry: E,
  depth: number,
): string | null {
  const level = `Level "${entry.data.id}"`;
  const field = `a field ${String(depth)} deep`;
  const line = certificateOf(certified, entry, depth);
  if (line === null) {
    return `${level} has no certificate on ${field}: ${CERTIFY_AGAIN}.`;
  }
  const shots = `${String(line.length)} shots`;
  const played = replayLine(certified.linePlayOf(entry, depth), line);
  if (!lineHolds(line, played)) {
    return `${level}'s certificate on ${field}, of ${shots}, ${played.cleared ? "cleared" : "didn't clear"} it in ${String(played.rounds)} rounds, its needed bricks down to row ${String(played.leastRow)}: ${CERTIFY_AGAIN}.`;
  }
  const par = certified.parOf(entry, depth);
  const earned = certified.parFrom(line.length);
  if (par !== earned) {
    return `${level}'s par on ${field} is ${String(par)}, where its certificate of ${shots} earns ${String(earned)}: ${CERTIFY_AGAIN}.`;
  }
  return null;
}

/**
 * Returns the careless player's games of a level on a field of a depth, the
 * {@link FLOOR_SEEDS} a floor is held over, each from a seed of the level's
 * own: its number times {@link SEED_STRIDE}, and on.
 */
export function floorGames<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
>(
  linePlayOf: LinePlayOf<E, K, T, C>,
  entry: E,
  depth: number,
): readonly PlayedCarelessly<C>[] {
  const play = linePlayOf(entry, depth);
  return Array.from({ length: FLOOR_SEEDS }, (_, game) =>
    playCarelessly(play, entry.number * SEED_STRIDE + game),
  );
}

/**
 * Holds every level's certificate on the depth its spec file is named for
 * to {@link certificateProblem}: none.
 *
 * Each depth's spec file in a folder named `every_level`, `11.spec.ts` to
 * `22.spec.ts`, calls it with its own name (`import.meta.filename`), so
 * Vitest replays the depths side by side. It throws for a file named for no
 * depth there.
 */
export function holdEveryCertificate<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
>(specFile: string, certified: CertifiedLevels<E, K, T, C>): void {
  const depth = variantOfSpec(specFile, DEPTHS, "every_level");
  describe(`every level's certificate on a field ${String(depth)} deep`, () => {
    it.each(levelRows(certified.levels))(
      "clears level %i, %s, with a row to spare, at the par its rounds earn",
      (_, __, entry) => {
        expect(certificateProblem(certified, entry, depth)).toBeNull();
      },
    );
  });
}

/**
 * Holds every level of a set to its floor, the times in 100 the careless
 * player must clear it, over its {@link floorGames} on a field of a depth,
 * the set and the depth those its spec file is named for.
 *
 * Each spec file in a folder named `every_floor`, `<set>_<depth>.spec.ts`
 * as {@link floorSpecsOf} names them, calls it with its own name
 * (`import.meta.filename`), so Vitest plays the sets and depths side by
 * side. It throws for a file named for no set and depth there, or for a set
 * with no floor.
 */
export function holdEveryFloor<
  E extends HeldLevel,
  K extends string,
  T extends WallStart<K>,
  C,
>(specFile: string, floored: FlooredLevels<E, K, T, C>): void {
  const specs = floorSpecsOf(floored.levels, floored.depths);
  const name = variantOfSpec(
    specFile,
    specs.map((spec) => spec.name),
    "every_floor",
  );
  const { setId, depth } = specs.find((spec) => spec.name === name)!;
  const floor = floored.floors[setId];
  if (floor === undefined) {
    throw new Error(`The set "${setId}" has no floor.`);
  }
  const suite = `the careless player on a field ${String(depth)} deep`;
  describe(suite, { timeout: floored.timeoutMs }, () => {
    it.each(levelRows(floored.levels.filter(({ set }) => set.id === setId)))(
      `clears level %i, %s, at least ${String(floor)} times in 100`,
      (_, __, entry) => {
        const cleared = floorGames(floored.linePlayOf, entry, depth).filter(
          (played) => played.cleared,
        ).length;

        expect(
          (cleared * 100) / FLOOR_SEEDS,
          `The careless player cleared level "${entry.data.id}" on a field ${String(depth)} deep ${String(cleared)} times in ${String(FLOOR_SEEDS)}: \`yarn report:levels\` shows it over more games.`,
        ).toBeGreaterThanOrEqual(floor);
      },
    );
  });
}

/** Returns each level as a spec's row: its number, its name and the level. */
export function levelRows<E extends HeldLevel>(
  levels: readonly E[],
): readonly (readonly [number, string, E])[] {
  return levels.map((entry) => [entry.number, entry.data.name, entry] as const);
}
