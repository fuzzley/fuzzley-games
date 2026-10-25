import {
  DestroyRef,
  Injectable,
  WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  COMPACT_MAX_HEIGHT_CSS_PX,
  COMPACT_MAX_WIDTH_CSS_PX,
  FormFactor,
} from "@/engine/render/layout/form_factor";

/**
 * The width below which the chrome compacts: the same width below which the
 * board tightens its gaps.
 *
 * Mirrors the `tablet` breakpoint in `styles/_breakpoints.scss`; change the
 * two together.
 */
export const COMPACT_MAX_WIDTH_PX = COMPACT_MAX_WIDTH_CSS_PX;

/**
 * The height below which the chrome compacts however wide the window is, which
 * catches a phone on its side.
 *
 * Mirrors `$compact-max-height` in `styles/_breakpoints.scss`.
 */
export const COMPACT_MAX_HEIGHT_PX = COMPACT_MAX_HEIGHT_CSS_PX;

/**
 * The width from which the header has room for the Fuzzley Games wordmark
 * beside the labelled actions and a long game name. Below it the header shows
 * the home button instead.
 */
export const WORDMARK_MIN_WIDTH_PX = 1280;

/**
 * The width below which the header has no room for the home button beside the
 * score, time and moves, so the link home moves into the overflow menu.
 */
export const HOME_BUTTON_MIN_WIDTH_PX = 360;

// The 0.02px guard is the one `below()` applies in the stylesheets.
const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX - 0.02}px), (max-height: ${COMPACT_MAX_HEIGHT_PX - 0.02}px)`;
const PORTRAIT_QUERY = "(orientation: portrait)";
const BELOW_WORDMARK_QUERY = `(max-width: ${WORDMARK_MIN_WIDTH_PX - 0.02}px)`;
const BELOW_HOME_BUTTON_QUERY = `(max-width: ${HOME_BUTTON_MIN_WIDTH_PX - 0.02}px)`;

/**
 * Tracks the shape of the viewport: roomy, or compact and then upright or on
 * its side, as the board's `formFactorOf` reads the same window.
 *
 * A signal rather than CSS alone, because a compact layout moves controls
 * rather than only restyling them. A host without `matchMedia` reads as roomy.
 */
@Injectable({ providedIn: "root" })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly compact = signal(false);
  private readonly portrait = signal(true);
  private readonly belowWordmark = signal(false);
  private readonly belowHomeButton = signal(false);

  /** The shape of the viewport. */
  readonly formFactor = computed<FormFactor>(() => {
    if (!this.compact()) return "roomy";
    return this.portrait() ? "phone-portrait" : "phone-landscape";
  });

  /**
   * Whether the viewport is narrower than the compact breakpoint or shorter
   * than the compact height.
   */
  readonly isCompact = computed(() => this.formFactor() !== "roomy");

  /** Whether the window is wide enough for the header's wordmark. */
  readonly fitsWordmark = computed(() => !this.belowWordmark());

  /** Whether the window is wide enough for the header's home button. */
  readonly fitsHomeButton = computed(() => !this.belowHomeButton());

  constructor() {
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
    const onChange = () => matches.set(query.matches);
    query.addEventListener("change", onChange);
    this.destroyRef.onDestroy(() => {
      query.removeEventListener("change", onChange);
    });
  }
}
