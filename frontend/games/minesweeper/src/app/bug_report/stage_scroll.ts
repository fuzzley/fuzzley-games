import {
  DestroyRef,
  Directive,
  ElementRef,
  Injectable,
  inject,
} from "@angular/core";
import type { StageScrollAt } from "./reported_game";

/**
 * Holds the stage, the room around the board that scrolls when even the
 * smallest squares won't fit, so a bug report can read how far it is
 * scrolled and scroll it there again.
 */
@Injectable({ providedIn: "root" })
export class StageScroll {
  private stage: HTMLElement | null = null;

  /** Returns how far the stage is scrolled: not at all where there is none. */
  at(): StageScrollAt {
    return {
      left: wholePixels(this.stage?.scrollLeft ?? 0),
      top: wholePixels(this.stage?.scrollTop ?? 0),
    };
  }

  /** Scrolls the stage as near a place as it goes. */
  scrollTo({ left, top }: StageScrollAt): void {
    if (!this.stage) return;
    this.stage.scrollLeft = left;
    this.stage.scrollTop = top;
  }

  /** Holds an element as the stage, and returns a function that lets it go. */
  hold(element: HTMLElement): () => void {
    this.stage = element;
    return () => {
      if (this.stage === element) this.stage = null;
    };
  }
}

/** Marks the stage whose scroll a bug report takes and puts back. */
@Directive({ selector: "[appStageScroll]" })
export class StageScrollDirective {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    inject(DestroyRef).onDestroy(inject(StageScroll).hold(element));
  }
}

/** Returns a scroll offset in whole pixels, as a screen with zoom may not. */
function wholePixels(offset: number): number {
  return Math.max(0, Math.round(offset));
}
