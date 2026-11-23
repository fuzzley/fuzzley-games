import { Component, input, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";

/**
 * Makes a button among the bar's actions its Fast-forward, a switch: round,
 * and pressed, in the accent, while fast-forward is on, which a press turns
 * on or off whenever the bar shows it.
 *
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
    "(pointerdown)": "$event.preventDefault()",
    "(click)": "fastForward.emit()",
  },
  template: '<fz-icon name="fast-forward" />',
  styleUrl: "./fast_forward.component.scss",
})
export class FastForwardComponent {
  /** Whether fast-forward is on, which shows the button pressed. */
  readonly fast = input.required<boolean>();

  /** Emits as the player presses the button, to switch fast-forward on or off. */
  readonly fastForward = output();
}
