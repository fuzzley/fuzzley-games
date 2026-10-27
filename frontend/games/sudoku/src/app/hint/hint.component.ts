import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { FILL_LABELS, type Hint } from "../../rules/hint";
import { GameService } from "../play/game.service";

/**
 * Names how much of a hint's words fit their room: all of them, the title and
 * what to do, or none.
 */
export type HintFit = "full" | "short" | "none";

/**
 * Returns how much of a hint's words fit a room, from the heights in pixels of
 * the room, all the words, and the short form.
 */
export function fitOf(room: number, full: number, short: number): HintFit {
  // A pixel's grace, for heights that round differently.
  if (full <= room + 1) return "full";
  return short <= room + 1 ? "short" : "none";
}

/**
 * Shows the hint's words in the room the pad leaves them: all of them where
 * they fit, else the title and what to do, with "Why?" to open the rest in
 * a sheet over the pad, which opens by itself where not even that fits.
 *
 * It measures both forms in copies hidden from sight and from a screen
 * reader, which the announcer has read the words to already. The sheet
 * leaves the board in sight, shaded by the hint.
 */
@Component({
  selector: "app-hint",
  imports: [DialogComponent],
  templateUrl: "./hint.component.html",
  styleUrl: "./hint.component.scss",
})
export class HintComponent {
  protected readonly game = inject(GameService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Emitted when the sheet closes because its hint was filled in, which
   * takes away what had the focus before it opened, for the board to take
   * the focus back.
   */
  readonly handBack = output();

  private readonly fullRef =
    viewChild.required<ElementRef<HTMLElement>>("full");
  private readonly shortRef =
    viewChild.required<ElementRef<HTMLElement>>("short");

  // Heights in pixels; without a ResizeObserver, as in jsdom, the words fit.
  private readonly room = signal(Number.POSITIVE_INFINITY);
  private readonly fullHeight = signal(0);
  private readonly shortHeight = signal(0);

  /** How much of the hint's words show in the room. */
  protected readonly fit = computed(() =>
    fitOf(this.room(), this.fullHeight(), this.shortHeight()),
  );

  /** Whether the sheet holding all the words is open. */
  protected readonly sheetOpen = signal(false);

  /** The hint the sheet holds while it is open. */
  protected readonly sheetHint = computed(() =>
    this.sheetOpen() ? this.game.hint() : null,
  );

  /** The sheet's name: the hint's title. */
  protected readonly sheetLabel = computed(
    () => this.game.hint()?.title ?? "Hint",
  );

  /**
   * What the sheet's button does: fills in the square, adds the missing
   * note, or takes a digit out.
   */
  protected readonly fillLabel = computed(() => {
    const hint = this.game.hint();
    return hint ? FILL_LABELS[hint.kind] : "Fill in";
  });

  /** The hint the sheet last opened for by itself, so it does so once. */
  private openedFor: Hint | null = null;

  constructor() {
    afterNextRender(() => {
      this.measure();
    });
    effect(() => {
      const hint = this.game.hint();
      const fit = this.fit();
      untracked(() => {
        if (!hint) {
          if (this.sheetOpen()) {
            this.sheetOpen.set(false);
            this.handBack.emit();
          }
        } else if (fit === "none" && hint !== this.openedFor) {
          this.openedFor = hint;
          this.sheetOpen.set(true);
        }
      });
    });
  }

  /** Watches the room, and the words in each form, for their heights. */
  private measure(): void {
    if (typeof ResizeObserver === "undefined") return;
    const host = this.host.nativeElement;
    const full = this.fullRef().nativeElement;
    const short = this.shortRef().nativeElement;
    const observer = new ResizeObserver((entries) => {
      for (const { target, contentRect } of entries) {
        if (target === host) this.room.set(contentRect.height);
        if (target === full) this.fullHeight.set(contentRect.height);
        if (target === short) this.shortHeight.set(contentRect.height);
      }
    });
    for (const element of [host, full, short]) observer.observe(element);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }
}
