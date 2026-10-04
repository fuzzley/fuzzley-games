import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { COMPACT_MAX_WIDTH_CSS_PX } from "@/engine/render/layout/table_layout";

/**
 * The width below which the chrome compacts: the same width below which the
 * board tightens its gaps.
 *
 * Mirrors the `tablet` breakpoint in `styles/_breakpoints.scss`; change the
 * two together.
 */
export const COMPACT_MAX_WIDTH_PX = COMPACT_MAX_WIDTH_CSS_PX;

// The 0.02px guard is the one `below()` applies in the stylesheets.
const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX - 0.02}px)`;

/**
 * Tracks whether the viewport is narrow enough that the chrome has to compact.
 *
 * A signal rather than CSS alone, because a compact layout moves controls
 * rather than only restyling them. A host without `matchMedia` reads as roomy.
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
