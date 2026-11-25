import { LEVELS, type LevelEntry } from "../rules/levels/levels";

/** Warm-up's levels, numbered 1 to 9: those whose marks `warm_up_marks.json`, the specs' fixture of Warm-up's, holds. */
export const WARM_UP_LEVELS: readonly LevelEntry[] = LEVELS.filter(
  ({ set }) => set.id === "warm-up",
);
