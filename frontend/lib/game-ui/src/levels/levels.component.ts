import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  computed,
  contentChild,
  input,
  output,
} from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import type { LevelMark } from "./level_marks";
import { LevelSetNoteDirective } from "./level_set_note.directive";
import { LevelTileDirective } from "./level_tile.directive";

/** Describes a level as the Levels dialog lists it: by its number, its set and its own name and id. */
export interface ListedLevel {
  readonly number: number;
  readonly set: { readonly id: string; readonly name: string };
  readonly data: { readonly id: string; readonly name: string };
}

/** What a level not marked shows: locked, never cleared. */
const UNMARKED: LevelMark = { open: false, stars: 0, best: null };

/** Describes a level as the Levels dialog offers it, which a game's tile is handed. */
export interface OfferedLevel {
  readonly number: number;
  /** The id its data gives it, by which a game's tile finds what else it shows of it. */
  readonly id: string;
  readonly name: string;
  /** Whether it is the level of the run on the board. */
  readonly current: boolean;
  /** Whether a run may start there. */
  readonly open: boolean;
  /** Whether it has been cleared, so it shows its stars and its best. */
  readonly cleared: boolean;
  /** Each star it has earned, by its place from 1: one at least once cleared. */
  readonly stars: readonly number[];
  /** What its stars say to a screen reader, such as "2 of 3 stars". */
  readonly starsWords: string;
  /** What its tile says under its name: "Locked", its best once cleared, or nothing. */
  readonly status: string | null;
}

/** Describes a set of levels as the Levels dialog lists it, under its name, which a game's note on it is handed. */
export interface OfferedSet {
  readonly id: string;
  readonly name: string;
  readonly levels: readonly OfferedLevel[];
}

/** Describes a set of levels as the dialog lays it out, a section its heading names. */
interface SetSection extends OfferedSet {
  /** The id of its heading, which names its section. */
  readonly headingId: string;
}

/**
 * Shows a game's Levels dialog: what choosing a level does, in the game's
 * words, then each set of levels under its name, its levels as buttons in a
 * grid, each with its number and name, the stars it earned and its best of
 * the figure the game names once cleared, "Locked" until the one before it
 * is, and the run's own marked.
 *
 * A game that shows more of a level draws its tile itself, from an
 * `<ng-template fzLevelTile let-level>` inside `<fz-levels>`, and one that
 * says more of a set ends its heading with a note, from an
 * `<ng-template fzLevelSetNote let-set>`.
 *
 * Choosing an open level hands its number on through `chosen`; the game
 * starts a run there, asking first if one is under way, and closes the
 * dialog once it has. A locked level is shown and can't be chosen.
 */
@Component({
  selector: "fz-levels",
  imports: [DialogComponent, IconComponent, NgTemplateOutlet],
  templateUrl: "./levels.component.html",
  styleUrl: "./levels.component.scss",
})
export class LevelsComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /**
   * What choosing a level does, said under the heading: the text of each
   * paragraph, which the dialog sets in a `<p>` of its own, so it takes the
   * dialog's styles rather than the game's.
   */
  readonly intro = input.required<readonly string[]>();

  /** How far each level has been played, by its id; a level not here is locked. */
  readonly marks = input.required<Readonly<Record<string, LevelMark>>>();

  /** The number of the level of the run on the board, or null for none. */
  readonly current = input<number | null>(null);

  /** The levels to offer, in the order played. */
  readonly levels = input.required<readonly ListedLevel[]>();

  /** The most stars a level earns. */
  readonly mostStars = input.required<number>();

  /** What a level's tile calls its best once cleared, before its value, such as "Best". */
  readonly figure = input.required<string>();

  /** Emitted with an open level's number when it is chosen. */
  readonly chosen = output<number>();

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  /** The template the game draws each level's tile with, if it hands one in. */
  protected readonly tile = contentChild(LevelTileDirective);

  /** The template the game draws each set's note with, if it hands one in. */
  protected readonly setNote = contentChild(LevelSetNoteDirective);

  protected readonly sets = computed<readonly SetSection[]>(() => {
    const marks = this.marks();
    const current = this.current();
    const words = { mostStars: this.mostStars(), figure: this.figure() };
    const bySet = new Map<string, { name: string; levels: OfferedLevel[] }>();
    for (const { number, set, data } of this.levels()) {
      const choices = bySet.get(set.id) ?? { name: set.name, levels: [] };
      choices.levels.push(
        offeredLevel(number, data, marks[data.id] ?? UNMARKED, current, words),
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
  protected choose(level: OfferedLevel): void {
    if (level.open) this.chosen.emit(level.number);
  }
}

/** Describes the words a level's tile is told in: how many stars a level earns, and what its best is called. */
interface TileWords {
  readonly mostStars: number;
  readonly figure: string;
}

/** Returns a level as the dialog offers it, from its mark. */
function offeredLevel(
  number: number,
  { id, name }: ListedLevel["data"],
  { open, stars, best }: LevelMark,
  current: number | null,
  { mostStars, figure }: TileWords,
): OfferedLevel {
  const cleared = stars > 0;
  return {
    number,
    id,
    name,
    current: number === current,
    open,
    cleared,
    stars: Array.from({ length: stars }, (_, index) => index + 1),
    starsWords: `${String(stars)} of ${String(mostStars)} stars`,
    status: statusOf(open, cleared, best, figure),
  };
}

/** Returns what a level's tile says under its name, or null for nothing. */
function statusOf(
  open: boolean,
  cleared: boolean,
  best: number | null,
  figure: string,
): string | null {
  if (!open) return "Locked";
  return cleared && best !== null ? `${figure} ${formatPoints(best)}` : null;
}
