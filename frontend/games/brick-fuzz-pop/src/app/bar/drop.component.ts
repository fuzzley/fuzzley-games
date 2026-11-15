import { Component, input, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";

/**
 * Makes a button among the bar's actions its Drop, which brings every
 * fuzzball in the air straight down where it is: round, and dimmed while a
 * press would do nothing.
 *
 * Dimmed is `aria-disabled` rather than disabled, as `@fz/game-ui`'s Pause
 * is, so the focus never falls off it, and a press on it then does nothing.
 * A press with a mouse or a finger leaves the focus where it was, on the
 * board, so the keys go on steering.
 */
@Component({
  selector: "button[appDrop]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary fz-button-circle",
    title: "Drop",
    "[attr.aria-disabled]": "droppable() ? null : 'true'",
    "(pointerdown)": "$event.preventDefault()",
    "(click)": "press()",
  },
  template: '<fz-icon name="drop" />',
})
export class DropComponent {
  /**
   * Whether a drop would bring the flight in the air down, paused or not:
   * only then does a press do anything. Paused counts, since a player who
   * tabs here from the board leaves the play room, which pauses the run.
   */
  readonly droppable = input.required<boolean>();

  /** Emits as the player presses the button while a drop would bring the flight down. */
  readonly dropFlight = output();

  protected press(): void {
    if (this.droppable()) this.dropFlight.emit();
  }
}
