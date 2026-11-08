import { DOCUMENT } from "@angular/common";
import { Component, computed, inject, input, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { type CanvasState, KeepKeysDirective } from "@fz/phaser/canvas";
import { IconComponent } from "@fz/ui/icon";
import { whereLost } from "../../rules/run/describe";
import type { BoardSetting } from "../../view/field/field_metrics";
import { tallyLines } from "../../view/tally";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";

/** Names a card laid over the field, or none. */
type Card = "ready" | "paused" | "cleared" | "ended" | "slow" | "failed" | null;

/**
 * Shows the card over the field, if any: how to fly, while a wave waits for
 * its first move; that the wave is paused, and who waits at home; how a wave
 * cleared added up; how to start again, once an ended run's result is put
 * away; that the board is still loading on a slow connection; or that it
 * couldn't be drawn.
 *
 * Its element is the layer the cards show in, which the board lays over the
 * field. Its buttons keep their keys from the board, Phaser's keyboard
 * target, and Resume and Next wave hand the board back the focus, which
 * their button would take away with its card.
 */
@Component({
  selector: "app-board-card",
  imports: [IconComponent, KeepKeysDirective, PilotRowComponent],
  templateUrl: "./board_card.component.html",
  styleUrl: "./board_card.component.scss",
})
export class BoardCardComponent {
  protected readonly game = inject(GameService);
  private readonly document = inject(DOCUMENT);

  /** Where the board's canvas is with its scene: still loading, drawn, or failed. */
  readonly canvasState = input.required<CanvasState>();

  /** Whether the scene is taking long enough to load for the card to say so. */
  readonly slow = input.required<boolean>();

  /** How the board lays the field and the deck out, which says how the ship flies. */
  readonly board = input.required<BoardSetting>();

  /** Emitted when the board should take the focus, as a wave goes on. */
  readonly handBack = output();

  /** The card over the field, if any. */
  protected readonly card = computed<Card>(() => {
    if (this.canvasState() === "failed") return "failed";
    if (this.slow()) return "slow";
    switch (this.game.outcome()) {
      case "ready":
        return "ready";
      case "playing":
        return null;
      case "paused":
        return "paused";
      case "cleared":
        return this.game.clearedOpen() ? "cleared" : null;
      case "over":
        return this.game.resultClosed() ? "ended" : null;
    }
  });

  /** What the Ready card calls the wave: its number and its name. */
  protected readonly waveTitle = computed(() => {
    const { number, data } = this.game.wave();
    return `Wave ${String(number)}: ${data.name}`;
  });

  /**
   * What the Ready card says flies the ship: the deck where it shows, its
   * stick on the side the settings say, else the keys; and how it fires.
   */
  protected readonly flyWords = computed(() => {
    const { deck, stickOnRight, fireByItself } = this.board();
    if (!deck) {
      return fireByItself
        ? "Arrows or W A D to fly; the ship fires by itself."
        : "Arrows or W A D to fly, Space to fire.";
    }
    const [stick, buttons] = stickOnRight
      ? ["right", "left"]
      : ["left", "right"];
    return fireByItself
      ? `Steer with the ${stick} pad; the ship fires by itself.`
      : `Steer with the ${stick} pad, fire with the ${buttons}.`;
  });

  /** The run's score, as the cards write it. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** The strays brought home, waiting to fly the next ships, as the Paused card draws them. */
  protected readonly home = computed(() => this.game.crew().home);

  /** Whether any stray waits at home, for the Paused card to draw. */
  protected readonly hasHome = computed(() => this.home().length > 0);

  /** What the Paused card says of the strays at home, since their pictures say nothing. */
  protected readonly homeWords = computed(
    () =>
      `${count(this.home().length, "fuzzball", "fuzzballs")} waiting at home`,
  );

  /** What the Cleared card calls the wave, or the last sector and Endless after it. */
  protected readonly clearedTitle = computed(() => {
    const { number, sector } = this.game.wave();
    return this.game.beforeEndless()
      ? `${sector.name} cleared. Endless begins.`
      : `Wave ${String(number)} cleared`;
  });

  /** What the Cleared card says goes on to the next wave, besides its button. */
  protected readonly nextWords = computed(
    () => `Move or fire for wave ${String(this.game.wave().number + 1)}.`,
  );

  /** How the wave just cleared added up, a line for each part, for its card. */
  protected readonly tallyLines = computed(() => {
    const tally = this.game.tally();
    return tally ? tallyLines(tally) : [];
  });

  /** What the card over an ended run calls it: the wave it was lost on. */
  protected readonly endTitle = computed(() => whereLost(this.game.wave()));

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

  /** Loads the page again, for a board that couldn't be drawn. */
  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}
