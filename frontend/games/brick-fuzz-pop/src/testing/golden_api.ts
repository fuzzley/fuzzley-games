import sparks from "../rules/levels/certificates/sparks.json";
import thickWalls from "../rules/levels/certificates/thick-walls.json";
import tricks from "../rules/levels/certificates/tricks.json";
import warmUp from "../rules/levels/certificates/warm-up.json";
import type { Line } from "../rules/levels/certificate";
import {
  LEVELS,
  type LevelEntry,
  levelEntryOf,
  parseLevel,
} from "../rules/levels/levels";
import { DEPTHS } from "../rules/wall/wall";
import {
  drawnShots,
  lineRounds,
  openingRounds,
  roundsHash,
} from "./golden_flights";
import type { GoldenApi } from "./script_api";

/** Each level's line on each depth, by the level's id, then by the depth, as a set's certificates file holds them. */
type Certificates = Readonly<
  Record<string, Readonly<Record<string, readonly (readonly number[])[]>>>
>;

/**
 * Every set's certificates, by the set's id, as `src/testing/every_level.ts`
 * holds them for the replays, which imports what no file held as the rules
 * are may import, so a set added there is added here too.
 */
const CERTIFICATES: Readonly<Record<string, Certificates>> = {
  "warm-up": warmUp,
  sparks,
  tricks,
  "thick-walls": thickWalls,
};

/**
 * Returns a level's certificate on a depth as a line, from every set's
 * certificates, or throws where its set's have none, or for a shot that
 * isn't a pair.
 */
export function certificateLine(
  certificates: Readonly<Record<string, Certificates>>,
  { set, data }: LevelEntry,
  depth: number,
): Line {
  const shots = certificates[set.id]?.[data.id]?.[String(depth)];
  if (shots === undefined) {
    throw new Error(
      `Level "${data.id}" has no certificate on a field ${String(depth)} deep: is its set "${set.id}" in golden_api.ts's CERTIFICATES?`,
    );
  }
  return shots.map((shot) => {
    const [aim, charge, ...rest] = shot;
    if (aim === undefined || charge === undefined || rest.length > 0) {
      throw new Error(
        `A certificate's shot is an aim and a charge, not ${JSON.stringify(shot)}.`,
      );
    }
    return [aim, charge] as const;
  });
}

/**
 * What `tools/golden-flights.mjs` plays, which it loads through Vite, and
 * `src/rules/levels/golden/golden.spec.ts` plays again: the levels, the
 * depths, and the hash of the rounds each level's certificate and the shots
 * drawn at its opening play on each depth.
 */
export const GOLDEN_API: GoldenApi = {
  levels: LEVELS,
  depths: DEPTHS,
  certificateHash: (level, depth) => {
    const entry = levelEntryOf(LEVELS, level);
    return roundsHash(
      lineRounds(
        parseLevel(entry.data),
        depth,
        certificateLine(CERTIFICATES, entry, depth),
      ),
    );
  },
  shotsHash: (level, depth) =>
    roundsHash(
      openingRounds(
        parseLevel(levelEntryOf(LEVELS, level).data),
        depth,
        drawnShots(level, depth),
      ),
    ),
};
