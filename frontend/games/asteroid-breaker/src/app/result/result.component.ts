import { Component, computed, inject, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { whereLost } from "../../rules/describe";
import { wavesCleared } from "../../rules/run";
import { SPEED_INFO } from "../../rules/speed";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: the wave it was lost on and
 * at what speed, the score and the best, with "New best" when it set one,
 * the wave reached and the waves cleared, and the fuzzballs it brought
 * home, each in its color.
 *
 * The game opens it once the last ship's burst has faded. It offers to try
 * again from the sector the run started in, or to choose a sector instead,
 * or to close the card to look at the board.
 */
@Component({
  selector: "app-result",
  imports: [DialogComponent, IconComponent, PilotRowComponent],
  templateUrl: "./result.component.html",
  styleUrl: "./result.component.scss",
})
export class ResultComponent {
  protected readonly game = inject(GameService);

  /** Emitted when the player asks for the sectors, to start at one. */
  readonly chooseSector = output();

  /** Where the run was lost, and at what speed. */
  protected readonly subtitle = computed(() => {
    const run = this.game.run();
    return `${whereLost(run)}, at ${SPEED_INFO[run.speed].name} speed`;
  });

  protected readonly figures = computed<readonly Figure[]>(() => {
    const run = this.game.run();
    return [
      { term: "Score", value: formatPoints(run.score) },
      { term: "Best", value: formatPoints(this.game.best()) },
      { term: "Wave", value: String(run.wave) },
      { term: "Cleared", value: String(wavesCleared(run)) },
    ];
  });

  /** Whether the run brought any fuzzball home, for the card to draw. */
  protected readonly broughtAny = computed(
    () => this.game.broughtHome().length > 0,
  );

  /** What the card says of the fuzzballs brought home, since their pictures say nothing. */
  protected readonly homeWords = computed(
    () =>
      `${count(this.game.broughtHome().length, "fuzzball", "fuzzballs")} brought home`,
  );

  /** What the card's first button says: the sector the run started in, to try again from. */
  protected readonly againLabel = computed(
    () => `Try again from ${this.game.firstSector().name}`,
  );

  /** Puts the card away, and asks for the sectors. */
  protected chooseFromSectors(): void {
    this.game.closeResult();
    this.chooseSector.emit();
  }
}
