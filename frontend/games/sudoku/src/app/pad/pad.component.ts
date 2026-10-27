import { Component, computed, inject, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import { DIGITS } from "../../rules/digits";
import { remaining } from "../../rules/grid";
import { HintComponent } from "../hint/hint.component";
import { GameService } from "../play/game.service";

/** Describes one digit's key. */
interface KeyView {
  readonly digit: number;
  /** How many of the digit are left to place, or null once all nine are. */
  readonly left: number | null;
  /** The count in words, which follow the digit in the key's name. */
  readonly status: string;
}

/**
 * Shows the number pad: a key for each digit, saying how many are left to
 * place, the tools (Notes, Erase, Undo and Hint), and the words of the hint
 * showing.
 *
 * A key pressed with a mouse or a finger hands the focus back to the board,
 * so the player can go on typing; one pressed from the keyboard keeps it.
 */
@Component({
  selector: "app-pad",
  imports: [HintComponent, IconComponent],
  host: { "[class.notes]": "game.notesMode()" },
  templateUrl: "./pad.component.html",
  styleUrl: "./pad.component.scss",
})
export class PadComponent {
  protected readonly game = inject(GameService);

  /**
   * Emits when the board should take the focus back: after a key is pressed
   * with a pointer, or once the hint's sheet closes on its hint filled in.
   */
  readonly handBack = output();

  protected readonly keys = computed<KeyView[]>(() => {
    const grid = this.game.grid();
    return DIGITS.map((digit) => {
      const left = remaining(grid, digit);
      return left === 0
        ? { digit, left: null, status: ", all placed" }
        : { digit, left, status: `, ${left} left` };
    });
  });

  /** Whether a hint can be shown, or the one showing filled in. */
  protected readonly canHint = computed(
    () => this.game.grid().outcome === "playing",
  );

  /** What the hint tool does: shows a hint, or fills in the one showing. */
  protected readonly hintLabel = computed(() => {
    const hint = this.game.hint();
    if (!hint) return "Hint";
    return hint.kind === "step" ? "Fill in" : "Take out";
  });

  protected onDigit(event: MouseEvent, digit: number): void {
    this.game.enter(digit);
    this.afterPress(event);
  }

  protected onNotes(event: MouseEvent): void {
    this.game.toggleNotesMode();
    this.afterPress(event);
  }

  protected onErase(event: MouseEvent): void {
    this.game.erase();
    this.afterPress(event);
  }

  protected onUndo(event: MouseEvent): void {
    this.game.undo();
    this.afterPress(event);
  }

  protected onHint(event: MouseEvent): void {
    this.game.useHint();
    this.afterPress(event);
  }

  /**
   * Hands the focus back to the board after a press with a pointer, which
   * reports how many times it clicked; Enter and Space report none.
   */
  private afterPress(event: MouseEvent): void {
    if (event.detail > 0) this.handBack.emit();
  }
}
