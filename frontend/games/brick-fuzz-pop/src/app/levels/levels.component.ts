import { Component, computed, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { LEVELS, type LevelEntry } from "../../rules/levels/levels";

/** The most stars a level earns: three for clearing it within par. */
export const MOST_STARS = 3;

/**
 * Describes how far a level has been played, as the Levels dialog shows it:
 * the board works it out from the progress and the stats kept.
 */
export interface LevelMark {
  /** Whether a run may start there: the first level, or the one after a level cleared. */
  readonly open: boolean;
  /** The most stars it has earned: 1 to 3 once it is cleared, which it is once it has one, else 0. */
  readonly stars: number;
  /** Its best points, or null for none. */
  readonly best: number | null;
}

/** What a level not marked shows: locked, never cleared. */
const UNMARKED: LevelMark = { open: false, stars: 0, best: null };

/** Describes a level as the dialog offers it. */
interface LevelChoice {
  readonly number: number;
  readonly name: string;
  /** Whether it is the level of the run on the board. */
  readonly current: boolean;
  /** Whether a run may start there. */
  readonly open: boolean;
  /** Whether it has been cleared, so it shows its stars and its best. */
  readonly cleared: boolean;
  /** Each star it has earned, by its place from 1: one to three once cleared. */
  readonly stars: readonly number[];
  /** What its stars say to a screen reader, such as "2 of 3 stars". */
  readonly starsWords: string;
  /** What its tile says under its name: "Locked", its best once cleared, or nothing. */
  readonly status: string | null;
}

/** Describes a set of levels as the dialog lists it, under its name. */
interface SetChoice {
  readonly id: string;
  readonly name: string;
  /** The id of its heading, which names its section. */
  readonly headingId: string;
  readonly levels: readonly LevelChoice[];
}

/**
 * Shows the Levels dialog: each set of levels under its name, its levels as
 * buttons in a grid, each with its number and name, the stars it earned
 * and its best once cleared, "Locked" until the one before it is, and the
 * run's own marked.
 *
 * Choosing an open level hands its number on through `chosen`; the board
 * starts a run there, asking first if one is under way, and closes the
 * dialog once it has. A locked level is shown and can't be chosen.
 */
@Component({
  selector: "app-levels",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./levels.component.html",
  styleUrl: "./levels.component.scss",
})
export class LevelsComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** How far each level has been played, by its id; a level not here is locked. */
  readonly marks = input.required<Readonly<Record<string, LevelMark>>>();

  /** The number of the level of the run on the board, or null for none. */
  readonly current = input<number | null>(null);

  /** The levels to offer, in the order played: the game's, unless a spec hands others. */
  readonly levels = input<readonly LevelEntry[]>(LEVELS);

  /** Emitted with an open level's number when it is chosen. */
  readonly chosen = output<number>();

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly sets = computed<readonly SetChoice[]>(() => {
    const marks = this.marks();
    const current = this.current();
    const bySet = new Map<string, { name: string; levels: LevelChoice[] }>();
    for (const { number, set, data } of this.levels()) {
      const choices = bySet.get(set.id) ?? { name: set.name, levels: [] };
      choices.levels.push(
        choiceOf(number, data.name, marks[data.id] ?? UNMARKED, current),
      );
      bySet.set(set.id, choices);
    }
    return [...bySet].map(([id, { name, levels }]) => ({
      id,
      name,
      headingId: `levels-${id}`,
      levels,
    }));
  });

  /** Hands an open level's number on; a locked one does nothing. */
  protected choose(level: LevelChoice): void {
    if (level.open) this.chosen.emit(level.number);
  }
}

/** Returns a level as the dialog offers it, from its mark. */
function choiceOf(
  number: number,
  name: string,
  { open, stars, best }: LevelMark,
  current: number | null,
): LevelChoice {
  const cleared = stars > 0;
  return {
    number,
    name,
    current: number === current,
    open,
    cleared,
    stars: Array.from({ length: stars }, (_, index) => index + 1),
    starsWords: `${String(stars)} of ${String(MOST_STARS)} stars`,
    status: statusOf(open, cleared, best),
  };
}

/** Returns what a level's tile says under its name, or null for nothing. */
function statusOf(
  open: boolean,
  cleared: boolean,
  best: number | null,
): string | null {
  if (!open) return "Locked";
  return cleared && best !== null ? `Best ${formatPoints(best)}` : null;
}
