import { Component, ElementRef, computed, inject } from "@angular/core";
import type { GridShown } from "../../view/run_state";
import { GameService } from "../play/game.service";

/** The keys needed to play, one at a time, which describe the board. */
const BOARD_KEYS: readonly string[] = [
  "Arrow keys: move the ring, or swap the fuzzball you hold that way.",
  "Space or Enter: pick up the fuzzball under the ring, or set off the special you hold.",
  "Esc: put the fuzzball down.",
  "H: show a hint.",
];

/** Describes a square of the board as the grid over it shows it. */
interface CellView {
  /** Its index on the board as the screen shows it. */
  readonly index: number;
  /** Its column, from 1. */
  readonly column: number;
  /** 0 for the square that holds the board's one tab stop, -1 for every other. */
  readonly tabIndex: number;
}

/** Describes a row of the board as the grid over it shows it. */
interface RowView {
  /** Its row, from 1. */
  readonly line: number;
  /** Its squares, from the left, a gap none. */
  readonly cells: readonly CellView[];
}

/**
 * Lays a grid of the board's squares over the canvas, where the scene draws
 * them, for the keys and screen readers: the board named for the level on
 * it and described by its keys, one tab stop, and a cell for each square,
 * a gap none, ringed while it has the focus from the keyboard. It takes no
 * press: each goes through to the canvas beneath, which reads it.
 *
 * Its roles are ARIA's own rather than Angular Aria's grid, which takes the
 * arrow keys to move the focus itself, and stops them there, cancelled: the
 * scene hears the board's keys around the grid.
 */
@Component({
  selector: "app-board-grid",
  host: {
    "[style.--across]": "grid().width",
    "[style.--down]": "grid().height",
  },
  templateUrl: "./board_grid.component.html",
  styleUrl: "./board_grid.component.scss",
})
export class BoardGridComponent {
  private readonly game = inject(GameService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The keys needed to play, which describe the board. */
  protected readonly keys = BOARD_KEYS;

  /** Names the board for the level on it, as "Fuzz Flux, level 16: Checkerboard". */
  protected readonly label = computed(() => {
    const { number, name } = this.game.state().level;
    return `Fuzz Flux, level ${String(number)}: ${name}`;
  });

  /** The board of the level in play, as the screen shows it. */
  protected readonly grid = computed(() => this.game.state().grid);

  /** The board's rows that hold a square, each with its squares. */
  protected readonly rows = computed(() => rowsOf(this.grid()));

  /** Puts the focus on the board's tab stop. */
  focus(options?: FocusOptions): void {
    this.host.nativeElement
      .querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')
      ?.focus(options);
  }
}

/**
 * Returns the rows of a board that hold a square, each with its squares,
 * the first square in reading order holding the tab stop.
 */
function rowsOf({ width, height, squares }: GridShown): readonly RowView[] {
  const tabStop = squares.findIndex((square) => square !== null);
  const rows = Array.from({ length: height }, (_, y) => ({
    line: y + 1,
    cells: squares.slice(y * width, (y + 1) * width).flatMap((square, x) => {
      const index = y * width + x;
      if (square === null) return [];
      return [{ index, column: x + 1, tabIndex: index === tabStop ? 0 : -1 }];
    }),
  }));
  return rows.filter(({ cells }) => cells.length > 0);
}
