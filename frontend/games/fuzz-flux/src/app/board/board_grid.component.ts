import { DOCUMENT } from "@angular/common";
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  untracked,
  viewChildren,
} from "@angular/core";
import { type Square, indexOf, squareOf } from "../../rules/board/cells";
import { describeSquare } from "../../rules/run/describe";
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
  /** What it holds and the dust on it, as "Red, caged". */
  readonly name: string;
  /** 0 for the square that holds the board's one tab stop, -1 for every other. */
  readonly tabIndex: number;
  /** Whether it holds the fuzzball the board shows held. */
  readonly selected: boolean;
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
 * a gap none, named for what it holds and the dust on it, and selected
 * while it holds the fuzzball the board shows held. It takes no press:
 * each goes through to the canvas beneath, which reads it.
 *
 * The square with the focus is the ring the keys move (the view's `Ring`),
 * ringed while the focus is from the keyboard: the focus follows the ring
 * as the keys move it, and the ring the focus, where a screen reader moves
 * that, so a key always plays the square in focus.
 *
 * Its roles are ARIA's own rather than Angular Aria's grid, which takes the
 * arrow keys to move the focus itself, and stops them there, cancelled: the
 * scene hears the board's keys around the grid, and the ring they move
 * skips gaps and swaps the fuzzball held.
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
  private readonly document = inject(DOCUMENT);
  private readonly cells = viewChildren<ElementRef<HTMLElement>>("gridCell");

  /** The keys needed to play, which describe the board. */
  protected readonly keys = BOARD_KEYS;

  /** Names the board for the level on it, as "Fuzz Flux, level 16: Checkerboard". */
  protected readonly label = computed(() => {
    const { number, name } = this.game.state().level;
    return `Fuzz Flux, level ${String(number)}: ${name}`;
  });

  /** The board of the level in play, as the screen shows it. */
  protected readonly grid = computed(() => this.game.state().grid);

  /**
   * The index of the square that holds the board's one tab stop: the
   * ring's, or the board's first square before the board has a ring.
   */
  private readonly tabStop = computed(() => {
    const ring = this.game.ringSquare();
    const { width, squares } = this.grid();
    return ring === null
      ? squares.findIndex((square) => square !== null)
      : indexOf(ring, width);
  });

  /** The board's rows that hold a square, each with its squares. */
  protected readonly rows = computed(() =>
    rowsOf(this.grid(), this.tabStop(), this.game.heldSquare()),
  );

  constructor() {
    // The focus follows the ring as the keys move it, where the board has
    // the focus; after the render that moves the tab stop to it.
    afterRenderEffect({
      write: () => {
        this.tabStop();
        untracked(() => {
          if (this.host.nativeElement.contains(this.document.activeElement)) {
            this.focus({ preventScroll: true });
          }
        });
      },
    });
  }

  /** Puts the focus on the board's tab stop. */
  focus(options?: FocusOptions): void {
    const tabStop = String(this.tabStop());
    this.cells()
      .find(({ nativeElement }) => nativeElement.dataset["index"] === tabStop)
      ?.nativeElement.focus(options);
  }

  /** Moves the ring to the square the focus moved to, as a screen reader may move it. */
  protected followFocus(index: number): void {
    this.game.moveRing(squareOf(index, this.grid().width));
  }
}

/**
 * Returns the rows of a board that hold a square, each with its squares:
 * one holding the tab stop, by its index, and one the fuzzball held, if any.
 */
function rowsOf(
  { width, height, squares }: GridShown,
  tabStop: number,
  held: Square | null,
): readonly RowView[] {
  const heldAt = held === null ? null : indexOf(held, width);
  const rows = Array.from({ length: height }, (_, y) => ({
    line: y + 1,
    cells: squares.slice(y * width, (y + 1) * width).flatMap((square, x) => {
      const index = y * width + x;
      if (square === null) return [];
      return [
        {
          index,
          column: x + 1,
          name: describeSquare(square),
          tabIndex: index === tabStop ? 0 : -1,
          selected: index === heldAt,
        },
      ];
    }),
  }));
  return rows.filter(({ cells }) => cells.length > 0);
}
