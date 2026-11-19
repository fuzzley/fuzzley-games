import { Component, computed, inject, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { END_TITLE } from "../../rules/run/describe";
import { wavesCleared } from "../../rules/run/run";
import { bestTerm } from "../../view/bests";
import { endDescription, endSubtitle } from "../../view/tally";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: that the game is over, the
 * wave it ended on and at what speed, the score and the best, said to be
 * under earlier rules where it was made under them, with "New best" when
 * it set one and "All 30 waves cleared!" when it cleared every
 * written wave, the wave reached and the waves cleared, and every
 * fuzzball who flew in it, each in its color.
 *
 * The game opens it once the pod's burst has faded and its pilot has
 * floated off home. It offers to try again from the sector the run started
 * in, or to choose a sector instead, or to close the card to look at the
 * board.
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

  /** What the card is called, as the announcer and the card over an ended run call the run's end. */
  protected readonly title = END_TITLE;

  /** Where the run ended, and at what speed. */
  protected readonly subtitle = computed(() =>
    endSubtitle(this.game.wave(), this.game.run().speed),
  );

  /**
   * What the card is described by as it opens: where the run ended and at
   * what speed, its score, and what it set.
   */
  protected readonly description = computed(() =>
    endDescription(this.game.run(), this.game.wave(), this.game.endMarks()),
  );

  protected readonly figures = computed<readonly Figure[]>(() => {
    const run = this.game.run();
    const best = this.game.best();
    return [
      { term: "Score", value: formatPoints(run.score) },
      {
        term: bestTerm(best, this.game.bestRules()),
        value: formatPoints(best),
      },
      { term: "Wave", value: String(run.wave) },
      { term: "Cleared", value: String(wavesCleared(run)) },
    ];
  });

  /** Every fuzzball who flew in the run, all home once it ends, in the order they went. */
  protected readonly flew = computed(() => this.game.crew().home);

  /**
   * What the card says of the fuzzballs who flew, since their pictures say
   * nothing: how many, and how many of them were strays brought home.
   */
  protected readonly flewWords = computed(() => {
    const flew = count(this.flew().length, "fuzzball", "fuzzballs");
    const strays = this.game.broughtHome().length;
    if (strays === 0) return flew;
    const caught = strays === 1 ? "a stray" : "strays";
    return `${flew}, ${String(strays)} of them ${caught} brought home`;
  });

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
