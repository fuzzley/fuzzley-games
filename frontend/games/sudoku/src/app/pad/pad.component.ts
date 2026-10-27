import { Component, computed, inject, output } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import { DIGITS } from "../../rules/digits";
import { remaining } from "../../rules/grid";
import { GameService } from "../play/game.service";

/** Describes one digit's key. */
interface KeyView {
  readonly digit: number;
  /** How many of the digit are left to place, or null once all nine are. */
  readonly left: number | null;
  readonly label: string;
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
  imports: [IconComponent],
  host: { "[class.notes]": "game.notesMode()" },
  templateUrl: "./pad.component.html",
  styleUrl: "./pad.component.scss",
})
export class PadComponent {
  protected readonly game = inject(GameService);

  /** Emits after a key is pressed with a pointer, for the board to take the focus. */
  readonly pressed = output();

  protected readonly keys = computed<KeyView[]>(() => {
    const grid = this.game.grid();
    return DIGITS.map((digit) => {
      const left = remaining(grid, digit);
      return left === 0
        ? { digit, left: null, label: `${digit}, all placed` }
        : { digit, left, label: `${digit}, ${left} left` };
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
    this.handBack(event);
  }

  protected onNotes(event: MouseEvent): void {
    this.game.toggleNotesMode();
    this.handBack(event);
  }

  protected onErase(event: MouseEvent): void {
    this.game.erase();
    this.handBack(event);
  }

  protected onUndo(event: MouseEvent): void {
    this.game.undo();
    this.handBack(event);
  }

  protected onHint(event: MouseEvent): void {
    this.game.useHint();
    this.handBack(event);
  }

  /**
   * Hands the focus back to the board after a press with a pointer, which
   * reports how many times it clicked; Enter and Space report none.
   */
  private handBack(event: MouseEvent): void {
    if (event.detail > 0) this.pressed.emit();
  }
}
