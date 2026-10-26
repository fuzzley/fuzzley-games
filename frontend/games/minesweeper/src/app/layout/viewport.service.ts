import {
  DestroyRef,
  Injectable,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import type { BarPlacement } from "@fz/game-ui/game_bar";

/** Names the shape of the viewport, as the Solitaire Collection does. */
export type FormFactor = "roomy" | "phone-portrait" | "phone-landscape";

/**
 * The width below which the chrome compacts. Mirrors the `tablet` breakpoint
 * in `styles/_breakpoints.scss`; change the two together.
 */
export const COMPACT_MAX_WIDTH_PX = 720;

/**
 * The height below which the chrome compacts however wide the window is,
 * which catches a phone on its side. Mirrors `$compact-max-height` in
 * `styles/_breakpoints.scss`.
 */
export const COMPACT_MAX_HEIGHT_PX = 500;

/** The width from which the bar has room for the Fuzzley Games wordmark. */
export const WORDMARK_MIN_WIDTH_PX = 1280;

/**
 * The width below which a compact bar has no room for the home button, so
 * the link home moves into the overflow menu.
 */
export const HOME_BUTTON_MIN_WIDTH_PX = 360;

// The 0.02px guard is the one `below()` applies in the stylesheets.
const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX - 0.02}px), (max-height: ${COMPACT_MAX_HEIGHT_PX - 0.02}px)`;
const PORTRAIT_QUERY = "(orientation: portrait)";
const BELOW_WORDMARK_QUERY = `(max-width: ${WORDMARK_MIN_WIDTH_PX - 0.02}px)`;
const BELOW_HOME_BUTTON_QUERY = `(max-width: ${HOME_BUTTON_MIN_WIDTH_PX - 0.02}px)`;

/**
 * Tracks the shape of the viewport: roomy, or compact and then upright or on
 * its side.
 *
 * A signal rather than CSS alone, because a compact layout moves controls,
 * and turns the board, rather than only restyling them. A host without
 * `matchMedia` reads as roomy, and wider than tall.
 */
@Injectable({ providedIn: "root" })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly compact = signal(false);
  private readonly portrait = signal(false);
  private readonly belowWordmark = signal(false);
  private readonly belowHomeButton = signal(false);

  /** The shape of the viewport. */
  readonly formFactor = computed<FormFactor>(() => {
    if (!this.compact()) return "roomy";
    return this.portrait() ? "phone-portrait" : "phone-landscape";
  });

  /** Whether the viewport is narrower or shorter than the compact breakpoint. */
  readonly isCompact = computed(() => this.formFactor() !== "roomy");

  /**
   * Where the game bar stands: across the top of a roomy screen, along the
   * bottom of a phone held upright, where every action is under the thumb,
   * and down the end of a phone on its side, which leaves the board the whole
   * height of a short screen.
   */
  readonly barPlacement = computed<BarPlacement>(() => {
    switch (this.formFactor()) {
      case "roomy":
        return "top";
      case "phone-portrait":
        return "bottom";
      case "phone-landscape":
        return "end";
    }
  });

  /** Whether the viewport is taller than it is wide. */
  readonly isPortrait = this.portrait.asReadonly();

  /** Whether the window is wide enough for the bar's wordmark. */
  readonly fitsWordmark = computed(() => !this.belowWordmark());

  /** Whether the window is wide enough for the bar's home button. */
  readonly fitsHomeButton = computed(() => !this.belowHomeButton());

  constructor() {
    // jsdom, which the specs run in, has no matchMedia.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === "undefined" || !window.matchMedia) return;

    this.follow(COMPACT_QUERY, this.compact);
    this.follow(PORTRAIT_QUERY, this.portrait);
    this.follow(BELOW_WORDMARK_QUERY, this.belowWordmark);
    this.follow(BELOW_HOME_BUTTON_QUERY, this.belowHomeButton);
  }

  /** Keeps a signal set to whether a media query matches. */
  private follow(media: string, matches: WritableSignal<boolean>): void {
    const query = window.matchMedia(media);
    matches.set(query.matches);
    const onChange = () => {
      matches.set(query.matches);
    };
    query.addEventListener("change", onChange);
    this.destroyRef.onDestroy(() => {
      query.removeEventListener("change", onChange);
    });
  }
}
