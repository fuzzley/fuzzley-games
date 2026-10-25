import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from "@angular/core";
import { Grid, GridCell, GridRow } from "@angular/aria/grid";
import { IconComponent } from "@fz/ui/icon";
import { describeSquare, type Showing, showing } from "../../game/describe";
import { GameService } from "../service/game.service";
import { ViewportService } from "../service/viewport.service";

/** How long a finger rests on a square before it flags it. */
export const LONG_PRESS_MS = 450;

/** How far a finger can drift during a long press, as when it starts a scroll. */
const PRESS_SLOP_PX = 10;

/** Describes one square as the board draws it. */
interface CellView {
  /** The square's place in the field, which the rules know it by. */
  readonly index: number;
  readonly showing: Showing;
  /** The number it shows, or null. */
  readonly count: number | null;
  readonly label: string;
}

/** A finger resting on a square, which flags it if it stays. */
interface Press {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Draws the minefield as a grid the keyboard can walk, and turns clicks,
 * taps, long presses and keys on it into moves.
 *
 * On a phone held upright, a field wider than it is tall turns, its rows
 * becoming the board's columns, so it stands up the screen. The rules never
 * know: each square still names its place in the field.
 *
 * The board listens once for each kind of event and finds the square from
 * its target, rather than on each of up to 900 squares.
 */
@Component({
  selector: "app-board",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Grid, GridRow, GridCell, IconComponent],
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(ViewportService);

  private press: Press | null = null;
  /** Whether a long press just flagged, so the click that follows is not a reveal. */
  private pressed = false;
  /** Whether the last pointer down was a finger or a pen, not a mouse. */
  private touching = false;

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
    return Array.from({ length: shape.rows }, (_, row) =>
      Array.from({ length: shape.cols }, (_, col) => {
        const index = turned ? col * cols + row : row * cols + col;
        const shown = showing(field, index);
        return {
          index,
          showing: shown,
          count:
            shown === "number" ? (field.layout?.counts[index] ?? null) : null,
          label: describeSquare(field, index),
        };
      }),
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelPress();
    });
  }

  /** Reveals the square clicked or tapped, or flags it in Flag mode. */
  protected onClick(event: MouseEvent): void {
    const index = squareOf(event);
    if (index === null) return;
    if (this.pressed) {
      this.pressed = false;
      return;
    }
    this.game.play(index);
  }

  /**
   * Flags the square a mouse right-clicks. A finger's long press, which some
   * browsers also report this way, is the timer's to handle.
   */
  protected onContextMenu(event: MouseEvent): void {
    const index = squareOf(event);
    if (index === null) return;
    event.preventDefault();
    if (!this.touching) this.game.flag(index);
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

  /** Starts timing a finger or pen resting on a square. */
  protected onPointerDown(event: PointerEvent): void {
    this.touching = event.pointerType !== "mouse";
    this.pressed = false;
    this.cancelPress();
    const index = squareOf(event);
    if (!this.touching || index === null) return;
    const timer = setTimeout(() => {
      this.press = null;
      this.pressed = true;
      this.game.flag(index);
    }, LONG_PRESS_MS);
    this.press = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer,
    };
  }

  /** Gives up a long press once the finger moves, as when it scrolls. */
  protected onPointerMove(event: PointerEvent): void {
    const press = this.press;
    if (press?.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > PRESS_SLOP_PX) this.cancelPress();
  }

  /** Ends a long press when the finger lifts before it counts. */
  protected onPointerEnd(): void {
    this.cancelPress();
  }

  private cancelPress(): void {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
  }
}

/** Returns the field index of the square an event happened on, or null. */
function squareOf(event: Event): number | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const index = target.closest<HTMLElement>("[data-index]")?.dataset["index"];
  return index === undefined ? null : Number(index);
}
