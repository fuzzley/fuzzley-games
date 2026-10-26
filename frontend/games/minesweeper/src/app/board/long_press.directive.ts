import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
} from "@angular/core";

/** How long a finger rests before its press is a long one. */
export const LONG_PRESS_MS = 450;

/** How far a finger can drift during a long press, as when it starts a scroll. */
const PRESS_SLOP_PX = 10;

/** A finger resting on the element, which is a long press if it stays. */
interface Press {
  readonly event: PointerEvent;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Tells when a finger or a pen rests on the element, and keeps what the
 * browser makes of the same press, a click or its menu, from the element's
 * own listeners.
 *
 * A mouse never makes a long press: it has a right button for that.
 */
@Directive({
  selector: "[appLongPress]",
  host: {
    "(pointerdown)": "onPointerDown($event)",
    "(pointermove)": "onPointerMove($event)",
    "(pointerup)": "cancel()",
    "(pointercancel)": "cancel()",
  },
})
export class LongPressDirective {
  /** Emits the pointer down that began a long press, whose target was pressed. */
  readonly longPress = output<PointerEvent>();

  private press: Press | null = null;
  /** Whether a long press just ended, so the click that follows is not one. */
  private pressed = false;
  /** Whether the last pointer down was a finger or a pen, not a mouse. */
  private touching = false;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // In the capture phase, so they run before the element's own listeners.
    const onClick = (event: MouseEvent): void => {
      if (!this.pressed) return;
      this.pressed = false;
      event.stopPropagation();
    };
    const onContextMenu = (event: MouseEvent): void => {
      if (!this.touching) return;
      event.preventDefault();
      event.stopPropagation();
    };
    host.addEventListener("click", onClick, { capture: true });
    host.addEventListener("contextmenu", onContextMenu, { capture: true });
    inject(DestroyRef).onDestroy(() => {
      host.removeEventListener("click", onClick, { capture: true });
      host.removeEventListener("contextmenu", onContextMenu, { capture: true });
      this.cancel();
    });
  }

  /** Starts timing a finger or a pen. */
  protected onPointerDown(event: PointerEvent): void {
    this.touching = event.pointerType !== "mouse";
    this.pressed = false;
    this.cancel();
    if (!this.touching) return;
    const timer = setTimeout(() => {
      this.press = null;
      this.pressed = true;
      this.longPress.emit(event);
    }, LONG_PRESS_MS);
    this.press = { event, timer };
  }

  /** Gives up a long press once the finger moves, as when it scrolls. */
  protected onPointerMove(event: PointerEvent): void {
    const start = this.press?.event;
    if (start?.pointerId !== event.pointerId) return;
    const moved = Math.hypot(
      event.clientX - start.clientX,
      event.clientY - start.clientY,
    );
    if (moved > PRESS_SLOP_PX) this.cancel();
  }

  /** Gives up a long press under way, as when the finger lifts before it counts. */
  protected cancel(): void {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
  }
}
