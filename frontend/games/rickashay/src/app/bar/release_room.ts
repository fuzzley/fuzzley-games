import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  type Signal,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  HOME_BUTTON_MIN_WIDTH_PX,
  WORDMARK_MIN_WIDTH_PX,
} from "@fz/game-ui/breakpoints";
import type { BarHome } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";

/** The room Release takes in a roomy bar: a 44 px button and the 8 px gap before it. */
const ROOMY_RELEASE_PX = 52;

/** The room Release takes in a compact bar: a 44 px button and the 4 px gap before it. */
const COMPACT_RELEASE_PX = 48;

/**
 * The narrowest window whose bar keeps the wordmark beside Release, its
 * eleventh action, with the game's name and its five figures whole.
 */
const WORDMARK_BESIDE_RELEASE_MIN_WIDTH_PX =
  WORDMARK_MIN_WIDTH_PX + ROOMY_RELEASE_PX;

/**
 * The narrowest phone held upright whose bar keeps the home button beside
 * Release, its fifth action while a shot is aimed, with the figures' card
 * its room.
 */
const HOME_BUTTON_BESIDE_RELEASE_MIN_WIDTH_PX =
  HOME_BUTTON_MIN_WIDTH_PX + COMPACT_RELEASE_PX;

/**
 * The shortest phone on its side whose rail keeps the home button beside
 * Release, its fifth action while a shot is aimed: the home button, the two
 * figures stacked and the five actions, each with its gap, take 433 px, as
 * measured in Chrome.
 */
const RAIL_HOME_BUTTON_BESIDE_RELEASE_MIN_HEIGHT_PX = 434;

/**
 * The shortest phone on its side whose rail keeps the two figures in a card
 * apiece beside Release, the link home in the overflow menu: the figures
 * stacked and the five actions, each with its gap, take 390 px, as measured
 * in Chrome.
 */
const RAIL_FIGURES_APART_BESIDE_RELEASE_MIN_HEIGHT_PX = 390;

/**
 * Returns whether a media query matches in the document's window, as it
 * changes, or false where the document has no window that asks; it stops
 * listening as the injector it was made in is destroyed.
 */
function mediaMatches(query: string): Signal<boolean> {
  const matches = signal(false);
  const view = inject(DOCUMENT).defaultView;
  if (!view || !("matchMedia" in view)) return matches.asReadonly();
  const media = view.matchMedia(query);
  matches.set(media.matches);
  const onChange = (): void => {
    matches.set(media.matches);
  };
  media.addEventListener("change", onChange);
  inject(DestroyRef).onDestroy(() => {
    media.removeEventListener("change", onChange);
  });
  return matches.asReadonly();
}

/**
 * Returns the link home as the bar shows it: the library's own
 * (`GameViewportService.barHome()`), but, while Release with a button is
 * on, a step smaller where Release would take its room, so the bar's
 * actions stay on screen with the game's name and figures whole: the home
 * button for the wordmark on a desktop, and on a phone the overflow menu's
 * link for the home button. It follows the setting rather than Release's
 * showing, so the link doesn't come and go as each shot is aimed.
 *
 * Call it in an injection context.
 */
export function homeBesideRelease(
  releaseByButton: Signal<boolean>,
): Signal<BarHome> {
  const viewport = inject(GameViewportService);
  // The 0.02px guard is the one the library's own queries apply.
  const belowWordmark = mediaMatches(
    `(max-width: ${WORDMARK_BESIDE_RELEASE_MIN_WIDTH_PX - 0.02}px)`,
  );
  const belowHomeButton = mediaMatches(
    `(max-width: ${HOME_BUTTON_BESIDE_RELEASE_MIN_WIDTH_PX - 0.02}px)`,
  );
  const belowRailHomeButton = mediaMatches(
    `(max-height: ${RAIL_HOME_BUTTON_BESIDE_RELEASE_MIN_HEIGHT_PX - 0.02}px)`,
  );
  return computed(() => {
    const home = viewport.barHome();
    if (!releaseByButton()) return home;
    switch (home) {
      case "wordmark":
        return belowWordmark() ? "icon" : home;
      case "icon":
        return (viewport.barPlacement() === "bottom" && belowHomeButton()) ||
          (viewport.barPlacement() === "end" && belowRailHomeButton())
          ? "none"
          : home;
      case "none":
        return home;
    }
  });
}

/**
 * Returns whether the rail sets its two figures in one card, the shots over
 * the score, so its five actions stay on screen beneath them: while Release
 * with a button is on, on a phone on its side too short for a card apiece.
 * It follows the setting rather than Release's showing, as
 * {@link homeBesideRelease} does, so the figures don't move as each shot is
 * aimed.
 *
 * Call it in an injection context.
 */
export function figuresPairedBesideRelease(
  releaseByButton: Signal<boolean>,
): Signal<boolean> {
  const viewport = inject(GameViewportService);
  const belowFiguresApart = mediaMatches(
    `(max-height: ${RAIL_FIGURES_APART_BESIDE_RELEASE_MIN_HEIGHT_PX - 0.02}px)`,
  );
  return computed(
    () =>
      releaseByButton() &&
      viewport.barPlacement() === "end" &&
      belowFiguresApart(),
  );
}
