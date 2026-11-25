import { parOf } from "@fz/brick-wall/rules/par";
import * as holders from "@fz/brick-wall/testing/holders";
import { SIM_TIMEOUT_MS } from "@fz/brick-wall/testing/timing";
import { isFiniteNumber, isListOf } from "@fz/core/json";
import type { BrickKindId } from "../rules/catalog/bricks";
import type { CertifiedShot, Line } from "../rules/levels/certificate";
import sparks from "../rules/levels/certificates/sparks.json";
import thickWalls from "../rules/levels/certificates/thick-walls.json";
import tricks from "../rules/levels/certificates/tricks.json";
import warmUp from "../rules/levels/certificates/warm-up.json";
import { LEVELS, type LevelEntry, parseLevel } from "../rules/levels/levels";
import type { RoundStart } from "../rules/round/round";
import { PARS } from "../rules/run/stars";
import { CASUAL_FLOORS } from "./casual";
import { CERTIFY_API } from "./certify_api";
import { linePlayOf } from "./solver";

export { FLOOR_SEEDS } from "@fz/brick-wall/testing/holders";

/**
 * Holds each level's line on each depth, by the level's id, then by the
 * depth, as `yarn certify:levels` writes them: the holders' `Certificates`
 * narrowed to the shape this game's files hold, each shot a list of
 * numbers, which `readShot()` reads as a pair.
 */
export type Certificates = Readonly<
  Record<string, Readonly<Record<string, readonly (readonly number[])[]>>>
>;

/** Every set's certificates, by the set's id. */
export const CERTIFICATES: Readonly<Record<string, Certificates>> = {
  "warm-up": warmUp,
  sparks,
  tricks,
  "thick-walls": thickWalls,
};

/** The depths the careless player is held to its floors on: the two shapes of the shallowest fields, and the deepest. */
export const FLOOR_DEPTHS = [11, 13, 22] as const;

/** Every spec in `every_floor/`, a set and a depth each, named `<set>_<depth>`. */
export const FLOOR_SPECS: readonly holders.FloorSpec[] = holders.floorSpecsOf(
  LEVELS,
  FLOOR_DEPTHS,
);

/** Returns how the game plays a level of its own on a field of a depth. */
const linePlayOfEntry: holders.LinePlayOf<
  LevelEntry,
  BrickKindId,
  RoundStart,
  CertifiedShot
> = (entry, depth) => linePlayOf(parseLevel(entry.data), depth);

/** The levels as their certificates are replayed: each read back by {@link readShot}, and each par from `par.json`. */
const CERTIFIED: holders.CertifiedLevels<
  LevelEntry,
  BrickKindId,
  RoundStart,
  CertifiedShot
> = {
  levels: LEVELS,
  certificates: CERTIFICATES,
  readShot,
  linePlayOf: linePlayOfEntry,
  parOf: (entry, depth) => parOf(entry.data.id, depth, PARS),
  parFrom: CERTIFY_API.parFrom,
};

/** The levels as the careless player is held to their sets' floors, on {@link FLOOR_DEPTHS}: the games `yarn report:levels` plays first. */
export const FLOORED: holders.FlooredLevels<
  LevelEntry,
  BrickKindId,
  RoundStart,
  CertifiedShot
> = {
  levels: LEVELS,
  floors: CASUAL_FLOORS,
  depths: FLOOR_DEPTHS,
  linePlayOf: linePlayOfEntry,
  timeoutMs: SIM_TIMEOUT_MS,
};

/**
 * Returns a level's certificate on a depth as a line of shots, or null
 * where its set's certificates have none, or throws for a shot that isn't
 * an aim and a charge.
 */
export function certificateOf(
  entry: LevelEntry,
  depth: number,
  certificates: Readonly<Record<string, holders.Certificates>> = CERTIFICATES,
): Line | null {
  return holders.certificateOf({ certificates, readShot }, entry, depth);
}

/** Returns a shot of a certificate as its file keeps it, an aim and a charge, or throws for one that isn't a pair: the certificates' codec. */
function readShot(kept: unknown): CertifiedShot {
  if (isListOf(kept, isFiniteNumber)) {
    const [aim, charge, ...rest] = kept;
    if (aim !== undefined && charge !== undefined && rest.length === 0) {
      return [aim, charge];
    }
  }
  throw new Error(
    `A certificate's shot is an aim and a charge, not ${JSON.stringify(kept)}.`,
  );
}

/**
 * Holds every level's certificate, on the depth its spec file is named
 * for, as `@fz/brick-wall/testing/holders` holds one: clearing the level
 * through `playRound()` in as many rounds as it has shots, no brick the
 * level needs ever coming down to the row over the floor's, at the par
 * `par.json` gives it, the one its rounds earn at `PAR_SHARE`.
 *
 * Each depth's spec in `src/rules/levels/every_level/` calls it with its
 * own file (`import.meta.filename`), so Vitest replays the depths side by
 * side and a file replays no depth but its own.
 */
export function holdEveryCertificate(specFile: string): void {
  holders.holdEveryCertificate(specFile, CERTIFIED);
}

/**
 * Holds every level of a set to its floor, the times in 100 the careless
 * player must clear it, over `FLOOR_SEEDS` games on a field of a depth,
 * the set and the depth those its spec file is named for. The games' seeds
 * are a level's own, as `yarn report:levels` numbers them, so the report's
 * first games are the spec's.
 *
 * Each spec in `src/rules/levels/every_floor/` calls it with its own file
 * (`import.meta.filename`), so Vitest plays the sets and depths side by
 * side.
 */
export function holdEveryFloor(specFile: string): void {
  holders.holdEveryFloor(specFile, FLOORED);
}
