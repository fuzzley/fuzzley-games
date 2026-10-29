import { DOCUMENT } from "@angular/common";
import {
  Directive,
  ElementRef,
  effect,
  inject,
  output,
  untracked,
} from "@angular/core";
import { GameViewportService } from "../viewport";

/**
 * Says why a game in play should pause: the focus left its room, the page
 * was hidden, or the screen turned.
 */
export type AwayReason = "focus" | "hidden" | "turned";

/** What can take the focus, which a press on it moves there. */
const FOCUSABLE = "button, a[href], input, select, textarea, [tabindex]";

/**
 * Marks the room a game is played in, the board and the controls whose keys
 * steer it, and says through `away` whenever the player looks away from it:
 * the focus leaves the room, the page is hidden, or the screen turns, which
 * moves the board while the player can't watch it. Pausing is the app's.
 *
 * It also keeps the focus in the room through a press on something there
 * that can't take it, such as the stage beside the board or the bar's
 * score, which would otherwise leave the focus on the page and strand the
 * keys.
 */
@Directive({
  selector: "[fzPlayRoom]",
  host: {
    "(focusout)": "onFocusOut($event)",
    "(document:visibilitychange)": "onVisibilityChange()",
    "(document:pointerdown)": "onPress($event)",
  },
})
export class PlayRoomDirective {
  /** Emits why the game should pause, each time the player looks away. */
  readonly away = output<AwayReason>();

  private readonly room = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly viewport = inject(GameViewportService);

  /** Whether the window was upright when last looked at, to tell a turn. */
  private wasPortrait: boolean | null = null;

  constructor() {
    effect(() => {
      const portrait = this.viewport.isPortrait();
      const turned = this.wasPortrait !== null && portrait !== this.wasPortrait;
      this.wasPortrait = portrait;
      if (turned) {
        untracked(() => {
          this.away.emit("turned");
        });
      }
    });
  }

  /** Says the focus is away once it leaves the room, for anywhere. */
  protected onFocusOut(event: FocusEvent): void {
    const to = event.relatedTarget;
    if (to instanceof Node && this.room.nativeElement.contains(to)) return;
    this.away.emit("focus");
  }

  /** Says the page is away as it goes out of sight. */
  protected onVisibilityChange(): void {
    if (this.document.visibilityState === "hidden") this.away.emit("hidden");
  }

  /**
   * Keeps the focus where it is through a main press on what can't take it,
   * while the focus is in the room.
   */
  protected onPress(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (!this.room.nativeElement.contains(this.document.activeElement)) return;
    const target = event.target;
    if (target instanceof Element && !target.closest(FOCUSABLE)) {
      event.preventDefault();
    }
  }
}
