// Fuzz Flux's levels: the sets a player chooses from, numbered from 1 in
// the order they are played. Each set's file in this folder is the
// design's, docs/fuzz-flux/levels/, copied as it is and formatted, so a
// level is redrawn in docs/fuzz-flux/levels/drafts.mjs, its set built
// again by the sketch's scripts, and copied here again, never edited here
// alone.

import { type NumberedLevel, levelsOf } from "@fz/core/levels";
import bedtime from "./bedtime.json";
import { type Level, type LevelSet, levelSetOf } from "./level";
import warmUp from "./warm-up.json";

/** Describes a level of the game: its place in the game, from 1, its set, and the level. */
export type LevelEntry = NumberedLevel<LevelSet, Level>;

/** Every set of levels a player chooses from, in the order they are played. */
export const LEVEL_SETS: readonly LevelSet[] = [
  levelSetOf(warmUp),
  levelSetOf(bedtime),
];

/** Every level, in the order they are played. */
export const LEVELS: readonly LevelEntry[] = levelsOf(LEVEL_SETS);
