import { Component, computed, inject, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { wavesCleared } from "../../rules/run/run";
import { SPEED_INFO } from "../../rules/speed";
import { endWords } from "../../view/tally";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: that everyone is home, the
 * wave it ended on and at what speed, the score and the best, with "New
 * best" when it set one and "Cleared all thirty" when it cleared every
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

  /** Where the run ended, and at what speed. */
  protected readonly subtitle = computed(() => {
    const run = this.game.run();
    return `${endWords(this.game.wave())}, at ${SPEED_INFO[run.speed].name} speed`;
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
