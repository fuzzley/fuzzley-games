import { Component, computed, input } from "@angular/core";
import { IconComponent, type IconName } from "@fz/ui/icon";

/**
 * Makes a button among a game bar's actions its Sound: a round speaker,
 * pressed while the sound is on.
 *
 * A press with a mouse or a finger leaves the focus where it was, on the
 * board, so the keys go on reaching the game. The app turns the sound on or
 * off as the button is clicked, and where the bar has no room for it offers
 * `soundMenuAction()` in its overflow menu instead.
 */
@Component({
  selector: "button[fzBarSound]",
  imports: [IconComponent],
  host: {
    class: "fz-button fz-button-secondary fz-button-circle",
    "aria-label": "Sound",
    title: "Sound",
    "[attr.aria-pressed]": "soundOn()",
    "(pointerdown)": "$event.preventDefault()",
  },
  template: '<fz-icon [name]="icon()" />',
})
export class BarSoundComponent {
  /** Whether the sound is on, which shows the button pressed. */
  readonly soundOn = input.required<boolean>();

  protected readonly icon = computed<IconName>(() =>
    this.soundOn() ? "sound" : "sound-off",
  );
}
