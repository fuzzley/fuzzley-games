import { Component, computed, inject, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import {
  LevelsComponent as FzLevelsComponent,
  type LevelMark,
  LevelSetNoteDirective,
  LevelTileDirective,
} from "@fz/game-ui/levels";
import { IconComponent } from "@fz/ui/icon";
import { STAR_IDS, type StarId } from "../../rules/run/stars";
import { GameService } from "../play/game.service";
import { GAME_LEVELS } from "../tokens";
import { ProgressService } from "../stats/progress.service";
import { StarsService } from "../stats/stars.service";
import { StatsService } from "../stats/stats.service";

/** What the dialog says first under its heading: what choosing a level does. */
const CHOOSING =
  "Choose a level to start a new game there. Clearing a level unlocks the next one. If you've cleared a level at this speed, it shows your best score.";

/** Describes one of a level's three stars as its tile draws it. */
interface StarShown {
  readonly id: StarId;
  readonly held: boolean;
  /** Filled where held, else its outline, so its shape tells it as well as its color. */
  readonly icon: "star" | "star-outline";
}

/** Describes what a level's tile shows of it beside its number and name, which the dialog offers. */
interface TileShown {
  /** Whether it has been cleared, at any speed, which a tick beside its number says. */
  readonly cleared: boolean;
  /** Its three stars, in the order they are shown. */
  readonly stars: readonly StarShown[];
  /** What its tile says under its stars: "Locked", its best at the speed in play, "Cleared", or nothing. */
  readonly status: string | null;
}

/** Describes what the dialog is handed of the levels played so far, and what the game's own tile and set's note show in it. */
interface LevelsShown {
  /** What it says under its heading: what choosing a level does, and what stars are for and how many every level holds. */
  readonly intro: readonly string[];
  /** How far each level has been played, by its id: open, the stars it holds, and its best at the speed in play. */
  readonly marks: Readonly<Record<string, LevelMark>>;
  /** What each level's tile shows, by its id. */
  readonly tiles: Readonly<Record<string, TileShown>>;
  /** The stars each set's levels hold, of all they have, by the set's id: "5 of 30". */
  readonly setStars: Readonly<Record<string, string>>;
}

/**
 * Shows the Levels dialog, `@fz/game-ui/levels`' own, over the game's levels
 * and its records: each set under its name and the count of the stars its
 * levels hold, each level's tile with its number and name, a tick once
 * cleared, its three stars, lit where held, and its best at the speed in
 * play; and, under the heading, the stars every level holds together.
 *
 * Choosing an open level starts a run there, asking first if one is under
 * way, and closes the dialog once it has; backing out leaves it open.
 */
@Component({
  selector: "app-levels",
  imports: [
    FzLevelsComponent,
    IconComponent,
    LevelSetNoteDirective,
    LevelTileDirective,
  ],
  templateUrl: "./levels.component.html",
  styleUrl: "./levels.component.scss",
})
export class LevelsComponent {
  private readonly game = inject(GameService);
  private readonly progress = inject(ProgressService);
  private readonly stars = inject(StarsService);
  private readonly stats = inject(StatsService);

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close, or has started a run. */
  readonly closed = output();

  /** The levels offered, in the order played. */
  protected readonly levels = inject(GAME_LEVELS);

  /** The most stars a level holds. */
  protected readonly mostStars = STAR_IDS.length;

  /** The number of the level of the run on the board. */
  protected readonly current = computed(() => this.game.level().number);

  /** What the dialog shows of the levels played so far. */
  protected readonly shown = computed<LevelsShown>(() => {
    const speed = this.game.speed();
    const cleared = this.progress.cleared();
    const bests = this.stats.stats().levels;
    const marks: Record<string, LevelMark> = {};
    const tiles: Record<string, TileShown> = {};
    const bySet = new Map<string, { held: number; levels: number }>();
    let held = 0;
    for (const { number, set, data } of this.levels) {
      const open = this.progress.isOpen(number);
      const starsHeld = this.stars.heldBy(data.id);
      const best = bests[data.id]?.[speed] ?? null;
      marks[data.id] = { open, stars: starsHeld.length, best };
      tiles[data.id] = {
        cleared: cleared.has(data.id),
        stars: STAR_IDS.map((id) => starShown(id, starsHeld.includes(id))),
        status: statusOf(open, cleared.has(data.id), best),
      };
      const inSet = bySet.get(set.id) ?? { held: 0, levels: 0 };
      bySet.set(set.id, {
        held: inSet.held + starsHeld.length,
        levels: inSet.levels + 1,
      });
      held += starsHeld.length;
    }
    return {
      intro: [CHOOSING, starsLine(held)],
      marks,
      tiles,
      setStars: Object.fromEntries(
        [...bySet].map(([id, { held, levels }]) => [
          id,
          `${String(held)} of ${String(levels * STAR_IDS.length)}`,
        ]),
      ),
    };
  });

  /** Starts a run at the level chosen, asking first if one is under way, and closes once it has. */
  protected async startAt(level: number): Promise<void> {
    if (await this.game.startAt(level)) this.closed.emit();
  }
}

/** Returns what the dialog says of stars under its heading, with how many every level holds together. */
function starsLine(held: number): string {
  return `Each level has 3 stars: 1 for clearing it, 1 for not losing a life, and 1 for reaching the streak shown before the level starts. Stars don't unlock anything. You have ${String(held)}.`;
}

/** Returns what a level's tile says under its stars, or null for nothing. */
function statusOf(
  open: boolean,
  cleared: boolean,
  best: number | null,
): string | null {
  if (!open) return "Locked";
  if (best !== null) return `Best ${formatPoints(best)}`;
  return cleared ? "Cleared" : null;
}

/** Returns one of a level's stars as its tile draws it, held or not. */
function starShown(id: StarId, held: boolean): StarShown {
  return { id, held, icon: held ? "star" : "star-outline" };
}
