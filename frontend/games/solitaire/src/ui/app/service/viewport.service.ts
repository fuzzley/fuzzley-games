import { DestroyRef, Injectable, inject, signal } from "@angular/core";

/**
 * The width below which the chrome compacts.
 *
 * The `tablet` breakpoint from `styles/_breakpoints.scss`, and the 0.02px guard
 * below is the same one `below()` applies — so the question this service asks
 * the browser and the question the stylesheets ask are the same question, and a
 * control cannot be hidden by CSS at a width where the template still thinks it
 * is showing.
 *
 * The stylesheets cannot read this value and this file cannot read theirs: a
 * media condition is evaluated before custom properties resolve, which is why
 * the breakpoints are the one part of the design system that is duplicated
 * rather than shared. Changing either means changing both.
 */
export const COMPACT_MAX_WIDTH_PX = 720;

const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX - 0.02}px)`;

/**
 * Whether the viewport is narrow enough that the chrome has to compact.
 *
 * A signal rather than a CSS-only concern because two of the answers are
 * structural rather than cosmetic: the game rail stops sitting beside the board
 * and starts covering it, and the header's spare actions stop being buttons and
 * become entries in a menu. Rendering both arrangements and hiding one with
 * `display: none` would leave every one of those controls in the document
 * twice, which is two of everything for anything walking the page — and two
 * different elements answering to "Restart".
 *
 * Hosts without `matchMedia` — a server render, a test that has not asked for
 * one — read as roomy, which is the arrangement that hides nothing.
 */
@Injectable({ providedIn: "root" })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly compact = signal(false);

  /** Whether the viewport is narrower than the compact breakpoint. */
  readonly isCompact = this.compact.asReadonly();

  constructor() {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia(COMPACT_QUERY);
    this.compact.set(query.matches);
    const onChange = () => this.compact.set(query.matches);
    query.addEventListener("change", onChange);
    this.destroyRef.onDestroy(() => {
      query.removeEventListener("change", onChange);
    });
  }
}
