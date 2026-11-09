import { Component, computed, inject, input, output } from "@angular/core";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { GameBarComponent } from "../game_bar";

/** Describes the button as the run stands. */
interface PauseView {
  readonly label: string;
  readonly icon: IconName;
  /** Whether a press does anything: the run is in play or paused. */
  readonly able: boolean;
}

/**
 * Makes a button among a game bar's actions its Pause: Pause while the run
 * is in play, Resume while it is paused, and dimmed while there is none.
 *
 * Dimmed is `aria-disabled` rather than disabled, so the focus never falls
 * off it, and a press on it then does nothing. A press with a mouse or a
 * finger leaves the focus where it was, on the board, so pressing it never
 * pauses the run by taking the focus; from the keyboard the focus is the
 * button's, which is why the app hands the board back the focus as the run
 * goes on (`resumeRun`). Inside a compact `fz-game-bar` it is round.
 */
@Component({
  selector: "button[fzBarPause]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary",
    "[class.fz-button-circle]": "round()",
    "[attr.aria-disabled]": "view().able ? null : 'true'",
    "(pointerdown)": "$event.preventDefault()",
    "(click)": "press()",
  },
  templateUrl: "./bar_pause.component.html",
})
export class BarPauseComponent {
  private readonly bar = inject(GameBarComponent, { optional: true });

  /**
   * How the game's run stands: one `playing` is paused by a press, one
   * `paused` goes on, and any other leaves the button dimmed.
   */
  readonly outcome = input.required<string>();

  /**
   * Whether the bar has room for the label beside the icon
   * (`GameViewportService.fitsActionLabels`); without it, the label is heard
   * but not seen.
   */
  readonly fitsLabel = input.required<boolean>();

  /**
   * Emits as the player presses Pause on a run shown in play.
   *
   * The button shows `outcome` as it stood when the page was last updated,
   * so the emit may arrive just after the run has moved on: the app's
   * handler ignores a run that is no longer in play.
   */
  readonly pauseRun = output();

  /**
   * Emits as the player presses Resume on a run shown paused.
   *
   * As with `pauseRun`, the run may have moved on by then: the app's handler
   * ignores a run that is no longer paused.
   */
  readonly resumeRun = output();

  protected readonly view = computed<PauseView>(() =>
    this.outcome() === "paused"
      ? { label: "Resume", icon: "play", able: true }
      : { label: "Pause", icon: "pause", able: this.outcome() === "playing" },
  );

  protected readonly round = computed(() => this.bar?.compact() ?? false);

  protected press(): void {
    const outcome = this.outcome();
    if (outcome === "playing") {
      this.pauseRun.emit();
    } else if (outcome === "paused") {
      this.resumeRun.emit();
    }
  }
}
