import { isCount, isRecord } from "@fz/core/json";
import { keysOf } from "@fz/core/records";
import type { Field } from "../field/field";
import { isCleanClear } from "../field/scoring";
import type { LevelEntry } from "../levels/levels";

/**
 * The stars a level can win, each a bit of what the record keeps of it:
 * clearing it, clearing it without losing a life, and reaching its mark.
 */
export const STAR = { clear: 1, clean: 2, streak: 4 } as const;

/** Names one of a level's three stars. */
export type StarId = keyof typeof STAR;

/** The three stars, in the order they are shown. */
export const STAR_IDS: readonly StarId[] = keysOf(STAR);

/** No star, as bits of {@link STAR}. */
const NO_STAR = 0;

/** Every star a level can win, as bits of {@link STAR}. */
const EVERY_STAR = STAR.clear | STAR.clean | STAR.streak;

/** Holds the stars each level has won, each kept for good once won. */
export interface StarsRecord {
  /**
   * The stars each level has won, by the level's id, as bits of
   * {@link STAR}, leaving out a level that has won none.
   */
  readonly levels: Readonly<Record<string, number>>;
}

/**
 * Returns the stars a level's play has won, as its field stands, as bits of
 * {@link STAR}: none until it is cleared, then the clear, the clean clear if
 * it lost no life, and the streak if its best streak reached the level's
 * mark.
 */
export function starsWon(
  field: Pick<Field, "state" | "level" | "livesLost" | "bestStreak">,
): number {
  if (field.state !== "cleared") return NO_STAR;
  return (
    STAR.clear |
    (isCleanClear(field.livesLost) ? STAR.clean : NO_STAR) |
    (field.bestStreak >= field.level.mark ? STAR.streak : NO_STAR)
  );
}

/** Returns the stars among some bits of {@link STAR}, in their order. */
export function starsIn(stars: number): StarId[] {
  return STAR_IDS.filter((id) => (stars & STAR[id]) !== NO_STAR);
}

/** Returns the stars a level holds in the record, as bits of {@link STAR}, none where it holds none. */
export function starsHeld(record: StarsRecord, id: string): number {
  return record.levels[id] ?? NO_STAR;
}

/**
 * Returns the record with the stars a level has won, as {@link starsWon}
 * returns them, added to those it holds, whatever the speed, layout or mark
 * they were won at, or the same record, not a copy, where it held them all.
 */
export function withStars(
  record: StarsRecord,
  id: string,
  won: number,
): StarsRecord {
  const held = starsHeld(record, id);
  const stars = held | won;
  if (stars === held) return record;
  return { levels: { ...record.levels, [id]: stars } };
}

/**
 * Returns the stars record as stored, keeping the stars of each level the
 * game has where they are stars a play wins, and giving every level the
 * progress has cleared its first star, as one cleared before stars were.
 */
export function starsRecordOf(
  value: unknown,
  levels: readonly LevelEntry[],
  cleared: ReadonlySet<string>,
): StarsRecord {
  const stored =
    isRecord(value) && isRecord(value["levels"]) ? value["levels"] : {};
  return {
    levels: Object.fromEntries(
      levels.flatMap(({ data: { id } }) => {
        const stars =
          wonOf(stored[id]) | (cleared.has(id) ? STAR.clear : NO_STAR);
        return stars === NO_STAR ? [] : [[id, stars]];
      }),
    ),
  };
}

/**
 * Returns the stars stored for a level, or none where they are no stars a
 * play wins: anything but bits of {@link STAR} with the clear among them.
 */
function wonOf(value: unknown): number {
  const isStars =
    isCount(value) &&
    value <= EVERY_STAR &&
    (value & STAR.clear) === STAR.clear;
  return isStars ? value : NO_STAR;
}
