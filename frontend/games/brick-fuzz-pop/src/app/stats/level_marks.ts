import type { LevelEntry } from "../../rules/levels/levels";
import { isOpen } from "../../rules/run/progress";
import type { Stats } from "../../rules/run/stats";
import type { LevelMark } from "../levels/levels.component";

/**
 * Returns how far each level has been played, by its id, as the Levels
 * dialog shows it: open as the progress opens it, and, once the progress
 * has it cleared, its most stars and best points from the stats.
 *
 * The progress alone says what is cleared, as it alone opens levels: a
 * level with records it doesn't have cleared, which two stores kept apart
 * can come to, shows none of them, rather than stars beside "Locked".
 */
export function levelMarksOf(
  levels: readonly LevelEntry[],
  cleared: ReadonlySet<string>,
  stats: Pick<Stats, "levels">,
): Readonly<Record<string, LevelMark>> {
  return Object.fromEntries(
    levels.map(({ number, data: { id } }): [string, LevelMark] => {
      const records = cleared.has(id) ? stats.levels[id] : undefined;
      return [
        id,
        {
          open: isOpen(levels, cleared, number),
          stars: records?.stars ?? 0,
          best: records?.points ?? null,
        },
      ];
    }),
  );
}
