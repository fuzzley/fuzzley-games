import { type IdentifiedLevel, isOpen } from "../../rules/progress";

/**
 * Describes how far a level has been played, as the Levels dialog shows it,
 * which `levelMarksOf()` works out from the progress and the records kept.
 */
export interface LevelMark {
  /**
   * Whether a run may start there: the first level, the one after a level
   * cleared, or any while a debug menu opens every level.
   */
  readonly open: boolean;
  /** The most stars it has earned: at least one once it is cleared, which it is once it has one, else 0. */
  readonly stars: number;
  /** Its best of the figure the game names on its tile, or null for none. */
  readonly best: number | null;
}

/**
 * Returns how far each level has been played, by its id, as the Levels
 * dialog shows it: open as the progress opens it, or every level while
 * `everyOpen` is set, and, once the progress has it cleared, its stars and
 * its best as the game reads them from its record of the level, `L`.
 *
 * The progress alone says what is cleared, even while every level is
 * open: a level with records it doesn't have cleared, which two stores
 * kept apart can come to, shows none of them, rather than stars beside
 * "Locked".
 */
export function levelMarksOf<L>(
  levels: readonly IdentifiedLevel[],
  cleared: ReadonlySet<string>,
  records: Readonly<Record<string, L>>,
  markOf: (record: L) => Pick<LevelMark, "stars" | "best">,
  everyOpen = false,
): Readonly<Record<string, LevelMark>> {
  return Object.fromEntries(
    levels.map(({ data: { id } }, index): [string, LevelMark] => {
      const record =
        cleared.has(id) && Object.hasOwn(records, id) ? records[id] : undefined;
      const { stars, best } =
        record === undefined ? { stars: 0, best: null } : markOf(record);
      return [
        id,
        { open: everyOpen || isOpen(levels, cleared, index + 1), stars, best },
      ];
    }),
  );
}
