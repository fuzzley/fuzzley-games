import { DOCUMENT } from "@angular/common";
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
} from "@angular/core";
import { Grid, GridCell, GridRow } from "@angular/aria/grid";
import { CELLS, at, colOf, rowOf, sees } from "../../rules/cells";
import { describeSquare } from "../../rules/describe";
import { DIGITS, has } from "../../rules/digits";
import { isGiven, mistakes, repeats } from "../../rules/grid";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/**
 * Names how a square is shaded, the strongest reason first: a hint points at
 * it, it is selected, it holds the selected square's digit, it is one of the
 * squares a hint's words name, it is in the unit a hint's square is the one
 * place left in, or it shares a unit with the selected square.
 */
type Shade = "hinted" | "selected" | "same" | "pattern" | "unit" | "related";

/** Describes one place in a square's notes. */
interface NoteView {
  /** The digit noted there, or 0 for none. */
  readonly digit: number;
  /** Whether it is the selected square's digit, which stands out. */
  readonly match: boolean;
}

/** Describes one square as the board draws it. */
interface CellView {
  /** The square's place on the board, which the rules know it by. */
  readonly index: number;
  readonly row: number;
  readonly col: number;
  /** The digit it holds, or 0. */
  readonly digit: number;
  readonly given: boolean;
  /** Its notes, a place for each digit, or null with none to show. */
  readonly notes: readonly NoteView[] | null;
  readonly shade: Shade | null;
  /**
   * Whether its digit repeats in a unit, or is wrong with the assist on. A
   * marked square is never shaded, as the danger color clears 4.5:1 only on
   * the board's own color.
   */
  readonly marked: boolean;
  readonly selected: boolean;
  readonly label: string;
}

/** The digit keys, by the key's code: the top row and the number pad. */
const DIGIT_CODE = /^(Digit|Numpad)([1-9])$/;

/**
 * Draws the board as a grid the keyboard can walk, shading the selected
 * square and what it touches, and turns clicks and keys on it into moves.
 *
 * Digit keys are read by the key's code, not its character, so the top row
 * of an AZERTY keyboard places a digit without Shift, and Shift adds a note
 * on every layout; N and H are read by their character, as the layout
 * labels them. The board listens once for each kind of event and finds the
 * square from the target, rather than on each of 81 squares.
 */
@Component({
  selector: "app-board",
  imports: [Grid, GridRow, GridCell],
  host: { "[class.solved]": 'game.grid().outcome === "solved"' },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly settings = inject(SettingsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** The digit the selected square holds, whose notes stand out, or 0. */
  private readonly selectedDigit = computed(() =>
    at(this.game.grid().digits, this.game.selected()),
  );

  /** The squares, a row at a time. */
  protected readonly rows = computed<CellView[][]>(() => {
    const grid = this.game.grid();
    const selected = this.game.selected();
    const hint = this.game.hint();
    const { markMistakes } = this.settings.settings();
    const repeated = repeats(grid);
    const wrong = mistakes(grid);
    const digit = this.selectedDigit();
    const pattern = new Set(hint?.pattern);
    const unit = new Set(hint?.unit);
    const shadeOf = (index: number): Shade | null => {
      if (index === hint?.index) return "hinted";
      if (index === selected) return "selected";
      if (digit !== 0 && grid.digits[index] === digit) return "same";
      if (pattern.has(index)) return "pattern";
      if (unit.has(index)) return "unit";
      return sees(index, selected) ? "related" : null;
    };
    const cells = Array.from({ length: CELLS }, (_, index): CellView => {
      const given = isGiven(grid, index);
      const notes = at(grid.notes, index);
      const marked =
        repeated[index] === true ||
        (markMistakes && !given && wrong[index] === true);
      return {
        index,
        row: rowOf(index),
        col: colOf(index),
        digit: at(grid.digits, index),
        given,
        notes:
          notes === 0
            ? null
            : DIGITS.map((each) => ({
                digit: has(notes, each) ? each : 0,
                match: has(notes, each) && each === digit,
              })),
        shade: marked ? null : shadeOf(index),
        marked,
        selected: index === selected,
        label: describeSquare(grid, index, markMistakes),
      };
    });
    return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) =>
      cells.slice(row * 9, row * 9 + 9),
    );
  });

  constructor() {
    // A hint, or the pad, can select another square; when the board has the
    // focus, the focus follows.
    effect(() => {
      this.game.selected();
      untracked(() => {
        if (this.host.nativeElement.contains(this.document.activeElement)) {
          this.focus();
        }
      });
    });
  }

  /**
   * Puts the focus on the selected square once the board has drawn, as after
   * a new deal or a press on the pad.
   *
   * The pad hands the focus back with `preventScroll`, since scrolling the
   * square into view would move the pad under the finger on a stage that
   * scrolls.
   */
  focus(options?: FocusOptions): void {
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')
          ?.focus(options);
      },
      { injector: this.injector },
    );
  }

  /** Selects the square clicked or tapped. */
  protected onClick(event: MouseEvent): void {
    const index = squareOf(event);
    if (index !== null) this.game.select(index);
  }

  /** Selects the square the focus moves to, as the arrow keys move it. */
  protected onFocusIn(event: FocusEvent): void {
    const index = squareOf(event);
    if (index !== null) this.game.select(index);
  }

  /**
   * Makes the move a key asks of the selected square: a digit places it, or
   * adds a note with Shift or in Notes mode; Backspace, Delete or 0 erases;
   * N turns Notes mode on or off; H shows a hint, and H again or Enter fills
   * it in. The grid itself moves the focus.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (
      squareOf(event) === null ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const digit = digitOf(event);
    if (digit !== null) {
      event.preventDefault();
      if (event.shiftKey) {
        this.game.toggleNote(digit);
      } else {
        this.game.enter(digit);
      }
      return;
    }
    switch (event.code) {
      case "Backspace":
      case "Delete":
      case "Digit0":
      case "Numpad0":
        event.preventDefault();
        this.game.erase();
        return;
      case "Enter":
        if (this.game.hint()?.index === this.game.selected()) {
          event.preventDefault();
          this.game.useHint();
        }
        return;
    }
    switch (event.key.toLowerCase()) {
      case "n":
        event.preventDefault();
        this.game.toggleNotesMode();
        break;
      case "h":
        event.preventDefault();
        this.game.useHint();
        break;
    }
  }
}

/** Returns the index of the square an event happened on, or null. */
function squareOf(event: Event): number | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const index = target.closest<HTMLElement>("[data-index]")?.dataset["index"];
  return index === undefined ? null : Number(index);
}

/**
 * Returns the digit a key stands for, or null. A number pad's key counts
 * only while it types its digit: with Shift, Windows makes it a key that
 * moves, such as End.
 */
function digitOf(event: KeyboardEvent): number | null {
  const match = DIGIT_CODE.exec(event.code);
  if (!match) return null;
  const [, row, digit] = match;
  if (row === "Numpad" && event.key !== digit) return null;
  return Number(digit);
}
