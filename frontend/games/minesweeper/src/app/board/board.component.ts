import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
} from "@angular/core";
import { Grid, GridCell, GridRow } from "@angular/aria/grid";
import { IconComponent } from "@fz/ui/icon";
import { GameViewportService } from "@fz/game-ui/viewport";
import { describeSquare, type Showing, showing } from "../../rules/describe";
import { GameService } from "../play/game.service";
import { LANDING_RUN_MS, landings } from "./landing";
import { LongPressDirective } from "./long_press.directive";

/** Describes one square as the board draws it. */
interface CellView {
  /** The square's place in the field, which the rules know it by. */
  readonly index: number;
  readonly showing: Showing;
  /** The number it shows, or null. */
  readonly count: number | null;
  readonly label: string;
  /** Whether the last move stepped on it, which flashes it. */
  readonly hit: boolean;
  /**
   * How long after the move that ended the game it lands, showing how, as a
   * CSS time; null when it doesn't, or once the card is open.
   */
  readonly landsIn: string | null;
}

/**
 * Draws the minefield as a grid the keyboard can walk, and turns clicks,
 * taps, long presses and keys on it into moves.
 *
 * On an upright screen, a field wider than it is tall turns, its rows
 * becoming the board's columns, so it stands up the screen. The rules never
 * know: each square still names its place in the field.
 *
 * The board listens once for each kind of event and finds the square from
 * its target, rather than on each of up to 900 squares.
 */
@Component({
  selector: "app-board",
  imports: [Grid, GridRow, GridCell, IconComponent, LongPressDirective],
  host: {
    "[style.--landing-run]": "landingRun",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly landingRun = `${LANDING_RUN_MS}ms`;

  /** Whether the board stands a wide field on end, to fit an upright screen. */
  protected readonly turned = computed(() => {
    const { rows, cols } = this.game.field().size;
    return this.viewport.isPortrait() && cols > rows;
  });

  /** The board's rows and columns, which a turned board swaps. */
  protected readonly shape = computed(() => {
    const { rows, cols } = this.game.field().size;
    return this.turned() ? { rows: cols, cols: rows } : { rows, cols };
  });

  protected readonly label = computed(() => {
    const { rows, cols } = this.shape();
    return `Minefield, ${rows} rows by ${cols} columns`;
  });

  /** The squares, a row of the board at a time. */
  protected readonly rows = computed<CellView[][]>(() => {
    const field = this.game.field();
    const { cols } = field.size;
    const shape = this.shape();
    const turned = this.turned();
    const move = this.game.lastMove();
    const landing =
      move && this.game.ending() ? landings(field, move.before, move.at) : null;
    return Array.from({ length: shape.rows }, (_, row) =>
      Array.from({ length: shape.cols }, (_, col) => {
        const index = turned ? col * cols + row : row * cols + col;
        const shown = showing(field, index);
        const landsIn = landing?.get(index);
        return {
          index,
          showing: shown,
          count:
            shown === "number" ? (field.layout?.counts[index] ?? null) : null,
          label: describeSquare(field, index),
          hit:
            shown === "tripped" &&
            move !== null &&
            move.before.squares[index] !== "tripped",
          landsIn: landsIn === undefined ? null : `${landsIn}ms`,
        };
      }),
    );
  });

  /**
   * Puts the focus on the board's tab stop once it has drawn, as after a new
   * deal replaces the square that had it.
   */
  focus(): void {
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Reveals the square clicked or tapped, or flags it in Flag mode. */
  protected onClick(event: MouseEvent): void {
    const index = squareOf(event);
    if (index !== null) this.game.play(index);
  }

  /**
   * Flags the square a mouse right-clicks. A finger's long press, which some
   * browsers also report this way, never gets here.
   */
  protected onContextMenu(event: MouseEvent): void {
    const index = squareOf(event);
    if (index === null) return;
    event.preventDefault();
    this.game.flag(index);
  }

  /** Flags the square a finger or a pen rests on. */
  protected onLongPress(event: PointerEvent): void {
    const index = squareOf(event);
    if (index !== null) this.game.flag(index);
  }

  /**
   * Reveals the square in focus on Enter or Space, and flags it on F. The
   * grid itself moves the focus.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const index = squareOf(event);
    if (index === null || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.game.reveal(index);
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      this.game.flag(index);
    }
  }
}

/** Returns the field index of the square an event happened on, or null. */
function squareOf(event: Event): number | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const index = target.closest<HTMLElement>("[data-index]")?.dataset["index"];
  return index === undefined ? null : Number(index);
}
