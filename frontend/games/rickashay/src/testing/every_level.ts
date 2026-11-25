// What holds Rickashay's levels beatable, a spec file at a time
// (docs/rickashay/design.md, "The guarantee"), over @fz/brick-wall's
// holders: every level's certificate and rally line replayed on the depth
// its file in every_level/ is named for; the careless player held to its
// set's floor on the set and the depth its file in every_floor/ is named
// for; and the blind ceiling, the sweet spot and the rally mark checked on
// the set and the depth its file in every_check/ is named for. Vitest plays
// the files side by side, and a file plays no depth but its own.

import { type Aim, isAim } from "@fz/brick-wall/rules/aims";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { parOf } from "@fz/brick-wall/rules/par";
import type { PlayedCarelessly } from "@fz/brick-wall/testing/careless";
import * as holders from "@fz/brick-wall/testing/holders";
import type { Line } from "@fz/brick-wall/testing/solver";
import { variantOfSpec } from "@fz/core/testing";
import { describe, expect, it } from "vitest";
import type { KindId } from "../rules/catalog/kinds";
import type { RoundStart } from "../rules/flight/events";
import warmUp from "../rules/levels/certificates/warm-up.json";
import warmUpLines from "../rules/levels/lines/warm-up.json";
import warmUpMarks from "../rules/levels/marks/warm-up.json";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { type Marks, marksOf } from "../rules/run/stars";
import { BLIND_CEILING, blindClears } from "./blind";
import { CERTIFY_API } from "./certify_api";
import { CARELESS_FLOORS, type RoundPlay, levelPlayOf } from "./line_play";
import { ralliesOf, rallyLineHolds, rallyMarkFrom } from "./rally_mark";
import { LEAST_SWEET_SPOT, sweetSpotOf } from "./sweet_spot";
import { SIM_TIMEOUT_MS } from "./timing";

export { FLOOR_SEEDS } from "@fz/brick-wall/testing/holders";

/** Every set's certificates, by the set's id, as `yarn certify:levels` writes them. */
export const CERTIFICATES: Readonly<Record<string, holders.Certificates>> = {
  "warm-up": warmUp,
};

/** Every set's rally lines, by the set's id, as `yarn certify:levels` writes them: each level's line to its rally mark, by its id, then by the depth. */
export const RALLY_LINES: Readonly<Record<string, holders.Certificates>> = {
  "warm-up": warmUpLines,
};

/** Every level's par and rally mark on every depth, from each set's marks as `yarn certify:levels` writes them. */
export const MARKS: Marks = marksOf([warmUpMarks]);

/** The depths the careless player is held to its floors on: the two shapes of the shallowest fields, and the deepest. */
export const FLOOR_DEPTHS = [11, 13, 22] as const;

/**
 * The depth each set's blind ceiling, sweet spots and rally marks are
 * checked on: the one where its drafts came nearest a check
 * (docs/rickashay/sketch/results.md), Warm-up's and Angles' blind on 18
 * (First bounce cleared 38 times in 100, here 45, and Springboard 70),
 * Tricks' sweet spot on 21 (Kaleidoscope, 0.75°) and Long rallies' on 12
 * (Greenhouse, 0.83°). One depth a set keeps its share of `sim` in CI's
 * budget; `yarn report:levels` checks every depth.
 */
export const CHECK_DEPTHS = {
  "warm-up": 18,
  angles: 18,
  tricks: 21,
  "long-rallies": 12,
} as const satisfies Readonly<Record<string, number>>;

/** Every spec in `every_floor/`, a set and a depth each, named `<set>_<depth>`. */
export const FLOOR_SPECS: readonly holders.FloorSpec[] = holders.floorSpecsOf(
  LEVELS,
  FLOOR_DEPTHS,
);

/** Every spec in `every_check/`, one for each set the game plays, on its depth in {@link CHECK_DEPTHS} and in that record's order, named `<set>_<depth>`: none of a set with no depth there. */
export const CHECK_SPECS: readonly holders.FloorSpec[] = Object.entries(
  CHECK_DEPTHS,
)
  .filter(([setId]) => LEVELS.some(({ set }) => set.id === setId))
  .map(([setId, depth]) => ({
    name: `${setId}_${String(depth)}`,
    setId,
    depth,
  }));

/** A level, so far as the checks name it and find what its set keeps of it. */
export type CheckedLevel = Pick<holders.HeldLevel, "number" | "set" | "data">;

/** Holds the rally marks and the lines that reach them, as their files keep them. */
export interface RallyFiles {
  /** Each level's rally mark, by its id, then by the depth. */
  readonly marks: Pick<Marks, "rally">;
  /** Each set's rally lines, by the set's id. */
  readonly lines: Readonly<Record<string, holders.Certificates>>;
}

/** The game's rally marks and their lines. */
export const RALLY_FILES: RallyFiles = { marks: MARKS, lines: RALLY_LINES };

/** What a failed check of a line or a mark says to do. */
const CERTIFY_AGAIN = "run `yarn certify:levels` to find them again";

/** The levels as their certificates are replayed: each shot read back by {@link readShot}, each par from the marks. */
const CERTIFIED: holders.CertifiedLevels<LevelEntry, KindId, RoundStart, Aim> =
  {
    levels: LEVELS,
    certificates: CERTIFICATES,
    readShot,
    linePlayOf: levelPlayOf,
    parOf: (entry, depth) => parOf(entry.data.id, depth, MARKS.par),
    parFrom: CERTIFY_API.parFrom,
  };

/** The levels as the careless player is held to their sets' floors, on {@link FLOOR_DEPTHS}: the games `yarn report:levels` plays first. */
export const FLOORED: holders.FlooredLevels<
  LevelEntry,
  KindId,
  RoundStart,
  Aim
> = {
  levels: LEVELS,
  floors: CARELESS_FLOORS,
  depths: FLOOR_DEPTHS,
  linePlayOf: levelPlayOf,
  timeoutMs: SIM_TIMEOUT_MS,
};

/** Returns a shot of a certificate or a rally line as its file keeps it, an aim's index alone, or throws for one that isn't: the files' codec. */
function readShot(kept: unknown): Aim {
  if (isAim(kept)) {
    return kept;
  }
  throw new Error(
    `A line's shot is an aim's index, from 0 to 656, not ${JSON.stringify(kept)}.`,
  );
}

/**
 * Returns a level's line in some files on a depth, each shot an aim's
 * index, or null where its set's file has none, or throws for a shot that
 * isn't one: the game's certificates by default.
 */
export function certificateOf(
  entry: CheckedLevel,
  depth: number,
  certificates: Readonly<Record<string, holders.Certificates>> = CERTIFICATES,
): Line<Aim> | null {
  return holders.certificateOf({ certificates, readShot }, entry, depth);
}

/** Returns a level's name in a check's sentence, and the field it was checked on. */
function namedOn(entry: CheckedLevel, play: RoundPlay): string {
  return `level "${entry.data.id}" on a field ${String(play.opening.depth)} deep`;
}

/**
 * Returns what keeps a level's rally line on the play's depth from reaching
 * its rally mark, a sentence that says how to mend it, or null where it
 * does: the line replayed from the level's opening, every round of it
 * played and the last rallying the mark or more (`rallyLineHolds()`).
 */
export function rallyLineProblem(
  files: RallyFiles,
  entry: CheckedLevel,
  play: RoundPlay,
): string | null {
  const { depth } = play.opening;
  const line = certificateOf(entry, depth, files.lines);
  const mark = files.marks.rally[entry.data.id]?.[String(depth)];
  if (line === null || mark === undefined) {
    return `The ${namedOn(entry, play)} has no ${line === null ? "rally line" : "rally mark"}: ${CERTIFY_AGAIN}.`;
  }
  const rallies = ralliesOf(play, line);
  if (rallyLineHolds(line, rallies, mark)) {
    return null;
  }
  const named = `The rally line of ${namedOn(entry, play)}, of ${String(line.length)} shots,`;
  if (rallies.length < line.length) {
    return `${named} ended the level after ${String(rallies.length)} rounds, before its last shot: ${CERTIFY_AGAIN}.`;
  }
  return `${named} rallied ${String(rallies.at(-1))} at its last round, short of its mark of ${String(mark)}: ${CERTIFY_AGAIN}.`;
}

/**
 * Returns what keeps a level's rally mark and rally line on the play's
 * depth from those the careless player's games set there, a sentence that
 * says how to mend them, or null where they are those
 * (`rallyMarkFrom()`): the games are its floor's, and a change to the
 * flight, the careless player or the level moves them.
 */
export function rallyMarkProblem(
  files: RallyFiles,
  entry: CheckedLevel,
  play: RoundPlay,
  games: readonly Pick<PlayedCarelessly<Aim>, "line">[],
): string | null {
  const { depth } = play.opening;
  const set = rallyMarkFrom(play, games);
  const mark = files.marks.rally[entry.data.id]?.[String(depth)];
  const line = certificateOf(entry, depth, files.lines);
  if (mark === set.mark && JSON.stringify(line) === JSON.stringify(set.line)) {
    return null;
  }
  const kept =
    mark === undefined || line === null
      ? "keeps no rally mark and line"
      : `keeps a rally mark of ${String(mark)} reached by ${JSON.stringify(line)}`;
  return `The ${namedOn(entry, play)} ${kept}, where its floor games set ${String(set.mark)} reached by ${JSON.stringify(set.line)}: ${CERTIFY_AGAIN}.`;
}

/**
 * Returns what puts a level over the blind ceiling on the play's depth, a
 * sentence, or null where it isn't: aims drawn blind, over the blind
 * player's games from the level's own seeds, cleared it more than
 * `BLIND_CEILING` times in 100, so it plays itself.
 */
export function blindProblem(
  entry: CheckedLevel,
  play: RoundPlay,
): string | null {
  const cleared = blindClears(play, entry.number * holders.SEED_STRIDE);
  if (cleared <= BLIND_CEILING) {
    return null;
  }
  return `Aims drawn blind cleared ${namedOn(entry, play)} ${String(cleared)} times in 100, more than ${String(BLIND_CEILING)}: redraw it, and \`yarn report:levels\` shows it on every depth.`;
}

/**
 * Returns what leaves a level too narrow a sweet spot on the play's depth,
 * a sentence, or null where it isn't: less than `LEAST_SWEET_SPOT` as it
 * opens, so its long flights are a pixel hunt.
 */
export function sweetSpotProblem(
  entry: CheckedLevel,
  play: RoundPlay,
): string | null {
  const spot = sweetSpotOf(play);
  if (spot >= LEAST_SWEET_SPOT) {
    return null;
  }
  return `The sweet spot of ${namedOn(entry, play)} is ${spot.toFixed(2)}°, under ${String(LEAST_SWEET_SPOT)}°: redraw it, and \`yarn report:levels\` shows it on every depth.`;
}

/**
 * Holds every level's certificate on the depth its spec file is named for,
 * as `@fz/brick-wall/testing/holders` holds one: clearing the level through
 * `playRound()` in as many rounds as it has shots, no brick the level needs
 * ever coming down to the row over the floor's, at the par its marks give
 * it, the one its rounds earn at `PAR_SHARE`; and every level's rally line
 * there to {@link rallyLineProblem}: none.
 *
 * Each depth's spec in `src/rules/levels/every_level/` calls it with its
 * own file (`import.meta.filename`).
 */
export function holdEveryCertificate(specFile: string): void {
  holders.holdEveryCertificate(specFile, CERTIFIED);
  const depth = variantOfSpec(specFile, DEPTHS, "every_level");
  describe(`every level's rally line on a field ${String(depth)} deep`, () => {
    it.each(holders.levelRows(LEVELS))(
      "reaches level %i, %s's rally mark at its last round",
      (_, __, entry) => {
        const play = levelPlayOf(entry, depth);

        expect(rallyLineProblem(RALLY_FILES, entry, play)).toBeNull();
      },
    );
  });
}

/**
 * Holds every level of a set to its floor, the times in 100 the careless
 * player must clear it (`CARELESS_FLOORS`), over `FLOOR_SEEDS` games on a
 * field of a depth, the set and the depth those its spec file is named for.
 *
 * Each spec in `src/rules/levels/every_floor/` calls it with its own file
 * (`import.meta.filename`).
 */
export function holdEveryFloor(specFile: string): void {
  holders.holdEveryFloor(specFile, FLOORED);
}

/**
 * Holds every level of a set, on a field of a depth, the set and the depth
 * those its spec file is named for, to the checks the certificates and the
 * floors don't hold: {@link blindProblem}, {@link sweetSpotProblem} and
 * {@link rallyMarkProblem}, the mark set by the level's floor games there.
 *
 * Each spec in `src/rules/levels/every_check/` calls it with its own file
 * (`import.meta.filename`). It throws for a file named for no set and
 * depth of {@link CHECK_SPECS}.
 */
export function holdEveryCheck(specFile: string): void {
  const name = variantOfSpec(
    specFile,
    CHECK_SPECS.map((spec) => spec.name),
    "every_check",
  );
  const { setId, depth } = CHECK_SPECS.find((spec) => spec.name === name)!;
  const rows = holders.levelRows(LEVELS.filter(({ set }) => set.id === setId));
  const suite = `every level on a field ${String(depth)} deep`;
  describe(suite, { timeout: SIM_TIMEOUT_MS }, () => {
    it.each(rows)(
      `leaves level %i, %s, cleared blind at most ${String(BLIND_CEILING)} times in 100`,
      (_, __, entry) => {
        expect(blindProblem(entry, levelPlayOf(entry, depth))).toBeNull();
      },
    );

    it.each(rows)(
      `leaves level %i, %s, a sweet spot of ${String(LEAST_SWEET_SPOT)}° or more`,
      (_, __, entry) => {
        expect(sweetSpotProblem(entry, levelPlayOf(entry, depth))).toBeNull();
      },
    );

    it.each(rows)(
      "keeps level %i, %s's rally mark and line as its floor games set them",
      (_, __, entry) => {
        const play = levelPlayOf(entry, depth);
        const games = holders.floorGames(levelPlayOf, entry, depth);

        expect(rallyMarkProblem(RALLY_FILES, entry, play, games)).toBeNull();
      },
    );
  });
}
