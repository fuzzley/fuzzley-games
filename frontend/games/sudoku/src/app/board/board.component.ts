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
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { boardKey } from "./board_keys";
import { WAVE_RUN_MS, WAVE_STEP_MS, boardView } from "./board_view";

/**
 * Draws the board as a grid the keyboard can walk, shading the selected
 * square and what it touches, and turns clicks and keys on it into moves.
 *
 * The board listens once for each kind of event and finds the square from
 * the target, rather than on each of 81 squares.
 */
@Component({
  selector: "app-board",
  imports: [Grid, GridRow, GridCell],
  host: {
    "[class.solved]": "game.solved()",
    "[style.--wave-run]": "waveRun",
    "[style.--wave-step]": "waveStep",
  },
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly settings = inject(SettingsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly waveRun = `${WAVE_RUN_MS}ms`;
  protected readonly waveStep = `${WAVE_STEP_MS}ms`;

  /** The squares, a row at a time. */
  protected readonly rows = computed(() =>
    boardView({
      grid: this.game.grid(),
      selected: this.game.selected(),
      hint: this.game.hint(),
      markMistakes: this.settings.settings().markMistakes,
    }),
  );

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
   * Makes the move a key asks of the selected square (`boardKey()`). The
   * grid itself moves the focus.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const key = squareOf(event) === null ? null : boardKey(event);
    if (!key) return;
    switch (key.kind) {
      case "digit":
        if (key.note) {
          this.game.toggleNote(key.digit);
        } else {
          this.game.enter(key.digit);
        }
        break;
      case "erase":
        this.game.erase();
        break;
      case "notes":
        this.game.toggleNotesMode();
        break;
      case "hint":
        this.game.useHint();
        break;
      case "enter":
        if (this.game.hint()?.index !== this.game.selected()) return;
        this.game.useHint();
        break;
    }
    event.preventDefault();
  }
}

/** Returns the index of the square an event happened on, or null. */
function squareOf(event: Event): number | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const index = target.closest<HTMLElement>("[data-index]")?.dataset["index"];
  return index === undefined ? null : Number(index);
}
