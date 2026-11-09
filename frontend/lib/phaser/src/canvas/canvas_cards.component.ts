import { DOCUMENT } from "@angular/common";
import { Component, computed, inject, input } from "@angular/core";
import { KeepKeysDirective } from "./keep_keys.directive";
import type { PhaserCanvasComponent } from "./phaser_canvas.component";

/** Names a card a canvas's own cards show: still loading, or couldn't be drawn. */
export type CanvasCard = "slow" | "failed";

/**
 * What the Still loading card says, its title and the line under it, which
 * its status region says too.
 */
const STILL_LOADING = {
  title: "Still loading the board",
  line: "It can take a while on a slow connection.",
} as const;

/**
 * Names the card a canvas's own cards show for its scene, if any: `failed`
 * once it has failed, `slow` while it is slow, else null.
 *
 * A board reads it to show none of its own cards meanwhile. It reads the
 * canvas's state, which needs the scene the canvas is given, so a board's
 * template reads it after `<fz-phaser-canvas>`, never a host binding.
 */
export function canvasCardOf(canvas: PhaserCanvasComponent): CanvasCard | null {
  if (canvas.state() === "failed") return "failed";
  return canvas.slow() ? "slow" : null;
}

/**
 * Shows the card a canvas's scene calls for over its board, if any: that the
 * board is still loading on a slow connection, or that it couldn't be drawn,
 * with a button that loads the page again.
 *
 * It lays out as its contents, so the app places it in the layer its own
 * cards show in, the toolkit's `board-card-layer()`, where a card sits as
 * theirs do, and shows none of its own while {@link card} shows one. The app
 * sets how a card sits through custom properties on the element or around
 * it: `--fz-canvas-card-room`, the room the board keeps around its field,
 * which the toolkit's `board-card()` narrows a card by, and
 * `--fz-canvas-card-drop`, how far below the layer's middle a card sits; and
 * the toolkit's `board-card-small` on it or around it, in the app's own
 * container query, sets a card smaller for a small board. Reload keeps its
 * keys from the board, as `fzKeepKeys` keeps a card's buttons'.
 */
@Component({
  selector: "fz-canvas-cards",
  imports: [KeepKeysDirective],
  templateUrl: "./canvas_cards.component.html",
  styleUrl: "./canvas_cards.component.scss",
})
export class CanvasCardsComponent {
  private readonly document = inject(DOCUMENT);

  /** The canvas whose scene the cards report on. */
  readonly canvas = input.required<PhaserCanvasComponent>();

  /** The card over the board, if any: the one {@link canvasCardOf} names. */
  readonly card = computed(() => canvasCardOf(this.canvas()));

  /** What the Still loading card says, its title and the line under it. */
  protected readonly stillLoading = STILL_LOADING;

  /**
   * What the Still loading card's status region says: its words while the
   * card shows, else nothing.
   */
  protected readonly loadingWords = computed(() =>
    this.card() === "slow"
      ? `${STILL_LOADING.title}. ${STILL_LOADING.line}`
      : "",
  );

  /** Loads the page again, for a board that couldn't be drawn. */
  protected reload(): void {
    this.document.defaultView?.location.reload();
  }
}
