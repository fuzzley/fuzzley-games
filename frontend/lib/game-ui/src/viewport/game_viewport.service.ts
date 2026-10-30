import {
  DestroyRef,
  Injectable,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  COMPACT_MAX_HEIGHT_PX,
  COMPACT_MAX_WIDTH_PX,
  type FormFactor,
  HOME_BUTTON_MIN_RAIL_HEIGHT_PX,
  HOME_BUTTON_MIN_WIDTH_PX,
  LABELLED_ACTIONS_MIN_WIDTH_PX,
  WORDMARK_MIN_WIDTH_PX,
} from "../breakpoints";
import type { BarHome, BarPlacement } from "../game_bar";

// The 0.02px guard is the one `below()` applies in the stylesheets.
const COMPACT_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX - 0.02}px), (max-height: ${COMPACT_MAX_HEIGHT_PX - 0.02}px)`;
const PORTRAIT_QUERY = "(orientation: portrait)";
const BELOW_ACTION_LABELS_QUERY = `(max-width: ${LABELLED_ACTIONS_MIN_WIDTH_PX - 0.02}px)`;
const BELOW_WORDMARK_QUERY = `(max-width: ${WORDMARK_MIN_WIDTH_PX - 0.02}px)`;
const BELOW_HOME_BUTTON_QUERY = `(max-width: ${HOME_BUTTON_MIN_WIDTH_PX - 0.02}px)`;
const SHORT_RAIL_QUERY = `(max-height: ${HOME_BUTTON_MIN_RAIL_HEIGHT_PX - 0.02}px)`;
const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Tracks the shape of the window a game is played in: roomy, or compact and
 * then upright or on its side, and what fits in its bar.
 *
 * A signal rather than CSS alone, because a compact layout moves controls,
 * and can turn a board, rather than only restyling them. The bar reads none
 * of it: the app binds what it says to the bar's inputs. A host without
 * `matchMedia` reads as roomy, wider than tall, asking for no motion, and
 * pointed at with a mouse.
 */
@Injectable({ providedIn: "root" })
export class GameViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly compact = signal(false);
  private readonly portrait = signal(false);
  private readonly belowActionLabels = signal(false);
  private readonly belowWordmark = signal(false);
  private readonly belowHomeButton = signal(false);
  private readonly belowRailHomeButton = signal(false);
  private readonly motion = signal(false);
  private readonly touch = signal(false);

  /** The shape of the window. */
  readonly formFactor = computed<FormFactor>(() => {
    if (!this.compact()) return "roomy";
    return this.portrait() ? "phone-portrait" : "phone-landscape";
  });

  /**
   * Whether the window is narrower than the compact width or shorter than the
   * compact height.
   */
  readonly isCompact = computed(() => this.formFactor() !== "roomy");

  /** Whether the window is taller than it is wide. */
  readonly isPortrait = this.portrait.asReadonly();

  /**
   * Where the game bar stands: across the top of a roomy window, along the
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

  /**
   * Whether the window is wide enough for the bar's actions to keep their
   * labels, which leaves a game's bar room for more of its figures.
   */
  readonly fitsActionLabels = computed(() => !this.belowActionLabels());

  /** Whether the window is wide enough for the bar's wordmark. */
  readonly fitsWordmark = computed(() => !this.belowWordmark());

  /**
   * Whether the bar has room for its home button: a window 360 px wide or
   * more, and a rail, down the side of a phone on its side, 380 px tall or
   * more.
   */
  readonly fitsHomeButton = computed(
    () =>
      !this.belowHomeButton() &&
      !(this.barPlacement() === "end" && this.belowRailHomeButton()),
  );

  /**
   * How the bar shows its link home: the wordmark on a roomy window wide
   * enough for it, the home button where only that fits, and not at all on
   * the narrowest or on the shortest rail, where the overflow menu leads with
   * the link instead (`withHomeLink()`).
   */
  readonly barHome = computed<BarHome>(() => {
    if (!this.fitsHomeButton()) return "none";
    return this.fitsWordmark() && !this.isCompact() ? "wordmark" : "icon";
  });

  /**
   * Whether the player has no wish for less motion, the one case in which
   * the stylesheets animate (`prefers-reduced-motion: no-preference`), so
   * code that waits for an animation waits only while one runs.
   */
  readonly allowsMotion = this.motion.asReadonly();

  /**
   * Whether the main pointer is a finger (`pointer: coarse`), as on a phone
   * or a tablet, for controls only a touch screen needs.
   */
  readonly isTouchScreen = this.touch.asReadonly();

  constructor() {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;

    this.follow(COMPACT_QUERY, this.compact);
    this.follow(PORTRAIT_QUERY, this.portrait);
    this.follow(BELOW_ACTION_LABELS_QUERY, this.belowActionLabels);
    this.follow(BELOW_WORDMARK_QUERY, this.belowWordmark);
    this.follow(BELOW_HOME_BUTTON_QUERY, this.belowHomeButton);
    this.follow(SHORT_RAIL_QUERY, this.belowRailHomeButton);
    this.follow(MOTION_QUERY, this.motion);
    this.follow(TOUCH_QUERY, this.touch);
  }

  /** Keeps a signal set to whether a media query matches. */
  private follow(media: string, matches: WritableSignal<boolean>): void {
    const query = window.matchMedia(media);
    matches.set(query.matches);
    const onChange = (): void => {
      matches.set(query.matches);
    };
    query.addEventListener("change", onChange);
    this.destroyRef.onDestroy(() => {
      query.removeEventListener("change", onChange);
    });
  }
}
