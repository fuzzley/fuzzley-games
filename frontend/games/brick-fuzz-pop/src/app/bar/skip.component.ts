import { Component, input, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";

/**
 * Makes a button among the bar's actions its Skip, which lands the flight at
 * once: round, and dimmed while there is no flight.
 *
 * Dimmed is `aria-disabled` rather than disabled, as `@fz/game-ui`'s Pause
 * is, so the focus never falls off it, and a press on it then does nothing.
 * A press with a mouse or a finger leaves the focus where it was, on the
 * board, so the keys go on steering.
 */
@Component({
  selector: "button[appSkip]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary fz-button-circle",
    title: "Skip",
    "[attr.aria-disabled]": "flying() ? null : 'true'",
    "(pointerdown)": "$event.preventDefault()",
    "(click)": "press()",
  },
  template: '<fz-icon name="skip" />',
})
export class SkipComponent {
  /**
   * Whether a flight is under way, paused or not: only then does a press do
   * anything. Paused counts, since a player who tabs here from the board
   * leaves the play room, which pauses the run.
   */
  readonly flying = input.required<boolean>();

  /** Emits as the player presses the button while a flight is under way, to land it at once. */
  readonly skipFlight = output();

  protected press(): void {
    if (this.flying()) this.skipFlight.emit();
  }
}
