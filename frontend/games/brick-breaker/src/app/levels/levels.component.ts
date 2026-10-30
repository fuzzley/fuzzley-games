import { Component, computed, inject, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { GAME_LEVELS, GameService } from "../play/game.service";

/** Describes a level as the dialog offers it. */
interface LevelChoice {
  readonly number: number;
  readonly name: string;
  /** Whether it is the level of the run on the board. */
  readonly current: boolean;
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
 * buttons in a grid, each with its number and name, the run's own marked.
 *
 * Choosing one starts a run there, asking first if one is under way, and
 * closes the dialog once it has; backing out leaves it open.
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

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close, or has started a run. */
  readonly closed = output();

  protected readonly sets = computed<readonly SetChoice[]>(() => {
    const current = this.game.level().number;
    const sets = [...new Set(this.levels.map(({ set }) => set))];
    return sets.map(({ id, name }) => ({
      id,
      name,
      headingId: `levels-${id}`,
      levels: this.levels
        .filter((entry) => entry.set.id === id)
        .map(({ number, data }) => ({
          number,
          name: data.name,
          current: number === current,
        })),
    }));
  });

  /** Starts a run at a level, asking first if one is under way, and closes once it has. */
  protected async choose(level: number): Promise<void> {
    if (await this.game.startAt(level)) this.closed.emit();
  }
}
