// Fuzz Flux's levels: the sets a player chooses from, numbered from 1 in
// the order they are played. Each set's file in this folder is the
// design's, docs/fuzz-flux/levels/, copied as it is and formatted, so a
// level is redrawn in docs/fuzz-flux/levels/drafts.mjs, its set built
// again by the sketch's scripts, and copied here again, never edited here
// alone.

import { type NumberedLevel, levelsOf } from "@fz/core/levels";
import type { BrickLayers } from "../catalog/elements";
import bedtime from "./bedtime.json";
import bricksAndBars from "./bricks-and-bars.json";
import { type Level, type LevelSet, levelSetOf } from "./level";
import warmUp from "./warm-up.json";
import windyDays from "./windy-days.json";

/** Describes a level of the game: its place in the game, from 1, its set, and the level. */
export type LevelEntry = NumberedLevel<LevelSet, Level>;

/** Every set of levels a player chooses from, in the order they are played. */
export const LEVEL_SETS: readonly LevelSet[] = [
  levelSetOf(warmUp),
  levelSetOf(bricksAndBars),
  levelSetOf(bedtime),
  levelSetOf(windyDays),
];

/** Every level, in the order they are played. */
export const LEVELS: readonly LevelEntry[] = levelsOf(LEVEL_SETS);

/**
 * The layers of the bricks on the levels' boards, fewest to most, which How
 * to play's brick and the line about thick bricks say: fewer than the
 * rules allow.
 */
export const LEVEL_BRICK_LAYERS = [
  1, 2, 3,
] as const satisfies readonly BrickLayers[];
