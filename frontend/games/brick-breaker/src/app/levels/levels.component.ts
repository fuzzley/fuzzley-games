import { Component, computed, inject, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { STAR_IDS, type StarId } from "../../rules/run/stars";
import { GameService } from "../play/game.service";
import { GAME_LEVELS } from "../tokens";
import { ProgressService } from "../stats/progress.service";
import { StarsService } from "../stats/stars.service";
import { StatsService } from "../stats/stats.service";

/** Describes one of a level's three stars as its tile draws it. */
interface StarShown {
  readonly id: StarId;
  readonly held: boolean;
  /** Filled where held, else its outline, so its shape tells it as well as its color. */
  readonly icon: "star" | "star-outline";
}

/** Describes a level as the dialog offers it. */
interface LevelChoice {
  readonly number: number;
  readonly name: string;
  /** Whether it is the level of the run on the board. */
  readonly current: boolean;
  /** Whether a run may start there. */
  readonly open: boolean;
  /** Whether it has been cleared, at any speed. */
  readonly cleared: boolean;
  /** Its three stars, in the order they are shown. */
  readonly stars: readonly StarShown[];
  /** What its stars say to a screen reader: "2 of 3 stars". */
  readonly starsWords: string;
  /** What its tile says under its name: "Locked", its best at the speed in play, "Cleared", or nothing. */
  readonly status: string | null;
}

/** Describes a set of levels as the dialog lists it, under its name. */
interface SetChoice {
  readonly id: string;
  readonly name: string;
  /** The id of its heading, which names its section. */
  readonly headingId: string;
  readonly levels: readonly LevelChoice[];
  /** The stars its levels hold, of all they have: "5 of 30". */
  readonly starsCount: string;
}

/**
 * Shows the Levels dialog: each set of levels under its name and the count
 * of the stars its levels hold, its levels as buttons in a grid, each with
 * its number and name, its three stars, lit where held, a tick once cleared
 * with its best at the speed in play, and the run's own marked; and the
 * stars held of all there are.
 *
 * Choosing an open one starts a run there, asking first if one is under way,
 * and closes the dialog once it has; backing out leaves it open. A level
 * not yet open is shown, locked, and can't be chosen.
 */
@Component({
  selector: "app-levels",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./levels.component.html",
  styleUrl: "./levels.component.scss",
})
export class LevelsComponent {
  private readonly game = inject(GameService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly progress = inject(ProgressService);
  private readonly stars = inject(StarsService);
  private readonly stats = inject(StatsService);

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close, or has started a run. */
  readonly closed = output();

  protected readonly sets = computed<readonly SetChoice[]>(() => {
    const current = this.game.level().number;
    const speed = this.game.speed();
    const cleared = this.progress.cleared();
    const bests = this.stats.stats().levels;
    const bySet = new Map<string, { name: string; levels: LevelChoice[] }>();
    for (const { number, set, data } of this.levels) {
      const choice = bySet.get(set.id) ?? { name: set.name, levels: [] };
      const open = this.progress.isOpen(number);
      const best = bests[data.id]?.[speed];
      const held = this.stars.heldBy(data.id);
      choice.levels.push({
        number,
        name: data.name,
        current: number === current,
        open,
        cleared: cleared.has(data.id),
        stars: STAR_IDS.map((id) => starShown(id, held.includes(id))),
        starsWords: `${starsOf(held.length, 1)} stars`,
        status: statusOf(open, cleared.has(data.id), best),
      });
      bySet.set(set.id, choice);
    }
    return [...bySet].map(([id, { name, levels }]) => ({
      id,
      name,
      headingId: `levels-${id}`,
      levels,
      starsCount: starsOf(heldIn(levels), levels.length),
    }));
  });

  /** The stars every level holds, of all there are: "5 of 120". */
  protected readonly starsTotal = computed(() => {
    const levels = this.sets().flatMap((set) => set.levels);
    return starsOf(heldIn(levels), levels.length);
  });

  /** Starts a run at an open level, asking first if one is under way, and closes once it has. */
  protected async choose(level: LevelChoice): Promise<void> {
    if (!level.open) return;
    if (await this.game.startAt(level.number)) this.closed.emit();
  }
}

/** Returns what a level's tile says under its name, or null for nothing. */
function statusOf(
  open: boolean,
  cleared: boolean,
  best: number | undefined,
): string | null {
  if (!open) return "Locked";
  if (best !== undefined) return `Best ${formatPoints(best)}`;
  return cleared ? "Cleared" : null;
}

/** Returns one of a level's stars as its tile draws it, held or not. */
function starShown(id: StarId, held: boolean): StarShown {
  return { id, held, icon: held ? "star" : "star-outline" };
}

/** Returns how many stars some levels hold. */
function heldIn(levels: readonly LevelChoice[]): number {
  return levels.reduce(
    (sum, level) => sum + level.stars.filter((star) => star.held).length,
    0,
  );
}

/** Writes the stars held of all some levels have: "5 of 30". */
function starsOf(held: number, levels: number): string {
  return `${String(held)} of ${String(levels * STAR_IDS.length)}`;
}
