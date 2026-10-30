import { Directive } from "@angular/core";

/**
 * Stops key events on its element from reaching the board around it,
 * Phaser's keyboard target, so the element, such as a button on a card over
 * the board, takes the key itself.
 *
 * A key that bubbles up to the board reaches the scene, and Phaser cancels a
 * captured key's default there, such as Space's keyup, at which a browser
 * clicks a button.
 */
@Directive({
  selector: "[fzKeepKeys]",
  host: {
    "(keydown)": "keep($event)",
    "(keyup)": "keep($event)",
  },
})
export class KeepKeysDirective {
  /** Stops a key event at the element. */
  protected keep(event: KeyboardEvent): void {
    event.stopPropagation();
  }
}
