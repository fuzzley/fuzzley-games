import {
  Component,
  computed,
  contentChild,
  inject,
  input,
  output,
} from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { CanvasCardsComponent, KeepKeysDirective } from "@fz/phaser/canvas";
import { IconComponent } from "@fz/ui/icon";
import { END_TITLE } from "../../rules/run/describe";
import { pilotsAboard } from "../../rules/ship/pilots";
import { cardCrewWords } from "../../view/crew_line";
import type { BoardSetting } from "../../view/field/field_metrics";
import {
  type TallyShown,
  endWords,
  nextWaveWords,
  tallyShownAt,
} from "../../view/tally";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";
import type { SectorCard } from "../play/sector_card";

/** Describes a card laid over the field, by its kind, with what the sector's and the Cleared card show; or none. */
type Card =
  | { readonly kind: "sector"; readonly sector: SectorCard }
  | { readonly kind: "cleared"; readonly sum: TallyShown }
  | { readonly kind: "paused" | "ended" }
  | null;

/**
 * Shows the card over the field, if any: the sector, what is new there and
 * the wave, while a wave waits for its first move at the start of the run
 * or of a sector, with how to fly at the run's; that the wave is paused,
 * the crew aboard and knocked loose, and who waits at home; how a wave
 * cleared added up, counting up, the crew cheering and the wave to come;
 * or that everyone is home and how to start again, once an ended run's
 * result is put away. A wave gone on to within a sector waits with no card
 * over it.
 *
 * Its element is the layer the cards show in, which the board lays over the
 * field. It shows what the board hands it first, the canvas's own cards
 * (`<fz-canvas-cards>`), that the board is still loading or couldn't be
 * drawn, and none of its own while they show one. Its buttons keep their
 * keys from the board, Phaser's keyboard target, and Resume and Next wave
 * hand the board back the focus, which their button would take away with
 * its card.
 */
@Component({
  selector: "app-board-card",
  imports: [IconComponent, KeepKeysDirective, PilotRowComponent],
  templateUrl: "./board_card.component.html",
  styleUrl: "./board_card.component.scss",
})
export class BoardCardComponent {
  protected readonly game = inject(GameService);

  /** The canvas's own cards, which the board hands it, if it does. */
  private readonly canvasCards = contentChild(CanvasCardsComponent);

  /** How the board lays the field and the deck out, which says how the ship flies. */
  readonly board = input.required<BoardSetting>();

  /** Emitted when the board should take the focus, as a wave goes on. */
  readonly handBack = output();

  /** Its own card over the field, if any, and none while the canvas's shows. */
  protected readonly card = computed<Card>(() => {
    if (this.canvasCards()?.card()) return null;
    switch (this.game.outcome()) {
      case "ready": {
        const sector = this.game.sectorCard();
        return sector && { kind: "sector", sector };
      }
      case "playing":
        return null;
      case "paused":
        return { kind: "paused" };
      case "cleared": {
        const tally = this.game.tally();
        if (!this.game.clearedOpen() || !tally) return null;
        return {
          kind: "cleared",
          sum: tallyShownAt(tally, this.game.tallyMs()),
        };
      }
      case "over":
        return this.game.resultClosed() ? { kind: "ended" } : null;
    }
  });

  /**
   * What the card over the run's first wave says flies the ship: the deck
   * where it shows, its stick on the side the settings say, else the keys;
   * and how it fires.
   */
  protected readonly flyWords = computed(() => {
    const { deck, stickOnRight, fireByItself } = this.board();
    if (!deck) {
      return fireByItself
        ? "Arrows or W A D to fly."
        : "Arrows or W A D to fly, Space to fire.";
    }
    const [stick, buttons] = stickOnRight
      ? ["right", "left"]
      : ["left", "right"];
    return fireByItself
      ? `Steer with the ${stick} stick.`
      : `Steer with the ${stick} stick, fire with the ${buttons}.`;
  });

  /** The run's score, as the cards write it. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** Every fuzzball gone home in the run, as the Paused card draws them. */
  protected readonly home = computed(() => this.game.crew().home);

  /** Whether any fuzzball waits at home, for the Paused card to draw. */
  protected readonly hasHome = computed(() => this.home().length > 0);

  /** What the Paused card says of the fuzzballs at home, since their pictures say nothing. */
  protected readonly homeWords = computed(
    () =>
      `${count(this.home().length, "fuzzball", "fuzzballs")} waiting at home`,
  );

  /** What the Cleared card calls the wave, or the last sector and Endless after it. */
  protected readonly clearedTitle = computed(() => {
    const { number, sector } = this.game.wave();
    return this.game.beforeEndless()
      ? `${sector.name} cleared! Endless begins.`
      : `Wave ${String(number)} cleared!`;
  });

  /** The crew aboard as the run holds it, the one at the controls first, as the Paused and the Cleared card draw them. */
  protected readonly crew = computed(() => pilotsAboard(this.game.crew()));

  /** What the Paused card says of the crew aboard and knocked loose, since their pictures say nothing. */
  protected readonly pausedCrewWords = computed(() =>
    cardCrewWords(this.game.crew(), this.game.loose()),
  );

  /** What the Cleared card says of the crew, since their pictures say nothing. */
  protected readonly clearedCrewWords = computed(
    () => `${count(this.crew().length, "fuzzball", "fuzzballs")} in the crew`,
  );

  /** What the Cleared card says comes next: the wave by its number and its name. */
  protected readonly nextWords = computed(() =>
    nextWaveWords(this.game.waveAfter()),
  );

  /** What the card over an ended run is called, as the result card and the announcer call the run's end. */
  protected readonly endTitle = END_TITLE;

  /** What the card over an ended run says of where it ended: the wave by its number and its name. */
  protected readonly endedWhere = computed(() => endWords(this.game.wave()));

  /** Goes on with the paused wave, and hands the board back the focus. */
  protected resume(): void {
    this.game.resume();
    this.handBack.emit();
  }

  /** Goes on to the next wave, and hands the board back the focus. */
  protected nextWave(): void {
    this.game.nextWave();
    this.handBack.emit();
  }

  /** Starts another run, from the card over an ended one. */
  protected newGame(): void {
    void this.game.newGame();
  }
}
