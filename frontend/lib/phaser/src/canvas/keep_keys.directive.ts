import { Directive } from "@angular/core";

/**
 * Keeps a key pressed or let go on its element, such as a button on a card
 * over a game's board, from the board, so the element takes the key itself.
 *
 * The board is Phaser's keyboard target: a key that bubbles up to it reaches
 * the scene, and Phaser cancels a captured key's default there, such as
 * Space's keyup, at which a browser clicks a button.
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
