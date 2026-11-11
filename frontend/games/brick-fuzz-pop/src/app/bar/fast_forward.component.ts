import { Component, input, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";

/**
 * Makes a button among the bar's actions its Fast-forward: round, pressed,
 * in the accent, while the flight plays fast, and dimmed while there is no
 * flight.
 *
 * Dimmed is `aria-disabled` rather than disabled, as `@fz/game-ui`'s Pause
 * is, so the focus never falls off it, and a press on it then does nothing.
 * A press with a mouse or a finger leaves the focus where it was, on the
 * board, so the keys go on steering.
 */
@Component({
  selector: "button[appFastForward]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary fz-button-circle",
    title: "Fast-forward",
    "[attr.aria-pressed]": "fast()",
    "[attr.aria-disabled]": "flying() ? null : 'true'",
    "(pointerdown)": "$event.preventDefault()",
    "(click)": "press()",
  },
  template: '<fz-icon name="fast-forward" />',
  styleUrl: "./fast_forward.component.scss",
})
export class FastForwardComponent {
  /** Whether the flight plays fast, which shows the button pressed. */
  readonly fast = input.required<boolean>();

  /**
   * Whether a flight is under way, paused or not: only then does a press do
   * anything. Paused counts, since a player who tabs here from the board
   * leaves the play room, which pauses the run.
   */
  readonly flying = input.required<boolean>();

  /**
   * Emits whether the flight should play fast from now on, the opposite of
   * `fast`, as the player presses the button while a flight is under way.
   */
  readonly fastForward = output<boolean>();

  protected press(): void {
    if (this.flying()) this.fastForward.emit(!this.fast());
  }
}
