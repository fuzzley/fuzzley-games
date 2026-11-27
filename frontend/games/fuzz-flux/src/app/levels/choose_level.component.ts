import { Component, computed, inject, input, output } from "@angular/core";
import {
  type LevelMark,
  LevelsComponent,
  levelMarksOf,
} from "@fz/game-ui/levels";
import type { LevelRecords } from "../../rules/run/records";
import { MOST_STARS } from "../../rules/run/stars";
import { GameService } from "../play/game.service";
import { ProgressService } from "../stats/progress.service";
import { RecordsService } from "../stats/records.service";
import { GAME_LEVELS } from "../tokens";

/** What Choose a level says under its heading: how a level unlocks, and what its best is. */
const LEVELS_INTRO: readonly string[] = [
  "Clear a level to unlock the next one. Best is the most moves you've had to spare.",
];

/** Returns how far a level cleared has been played, as its tile shows it: its most stars, and its most moves to spare as its best. */
function markOf(
  record: LevelRecords[string],
): Pick<LevelMark, "stars" | "best"> {
  return { stars: record.stars ?? 0, best: record.spare ?? null };
}

/**
 * Shows Choose a level (`<fz-levels>`): each set by its name, its levels
 * open as the progress opens them (C4), each cleared one with its most
 * stars and its most moves to spare, and the level in play marked; and
 * plays the level chosen on its next deal, asking first while one is in
 * progress, closing once it does.
 */
@Component({
  selector: "app-choose-level",
  imports: [LevelsComponent],
  templateUrl: "./choose_level.component.html",
})
export class ChooseLevelComponent {
  private readonly game = inject(GameService);
  private readonly progress = inject(ProgressService);
  private readonly records = inject(RecordsService);

  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the dialog asks to close, or once the level chosen is in play. */
  readonly closed = output();

  protected readonly levels = inject(GAME_LEVELS);

  protected readonly intro = LEVELS_INTRO;

  protected readonly mostStars = MOST_STARS;

  /** The number of the level in play. */
  protected readonly current = computed(() => this.game.state().level.number);

  /** How far each level has been played, by its id. */
  protected readonly marks = computed(() =>
    levelMarksOf(
      this.levels,
      this.progress.cleared(),
      this.records.levels(),
      markOf,
    ),
  );

  /** Plays a level chosen, by its number, asking first while one is in progress, and closes once it is in play. */
  protected async play(level: number): Promise<void> {
    if (await this.game.startLevel(level)) this.closed.emit();
  }
}
