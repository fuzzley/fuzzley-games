import { Component, input, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";

/**
 * Makes a button among the bar's actions its Skip, which lands the flight at
 * once: round, and dimmed while there is no flight.
 *
 * It dims and keeps the focus where it was as {@link FastForwardComponent}
 * does.
 */
@Component({
  selector: "button[appSkip]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary fz-button-circle",
    "aria-label": "Skip",
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
   * anything, as {@link FastForwardComponent}'s `flying` says.
   */
  readonly flying = input.required<boolean>();

  /** Emits as the player presses the button while a flight is under way, to land it at once. */
  readonly skipFlight = output();

  protected press(): void {
    if (this.flying()) this.skipFlight.emit();
  }
}
