import { HOME_HREF } from "../game_bar/game_bar.component";
import type { BarOverflowItem } from "./bar_overflow.component";

/**
 * Returns an overflow menu led by the link home to Fuzzley Games, set apart
 * from the items after it, for a bar with no room for the link
 * (`GameViewportService.barHome` is `none`).
 *
 * The link leads to `/`, as the bar's does, unless given another `href`; an
 * app that gives the bar its own `homeHref` passes it here too.
 */
export function withHomeLink<Id extends string>(
  items: readonly BarOverflowItem<Id>[],
  href: string = HOME_HREF,
): readonly BarOverflowItem<Id>[] {
  const [first, ...rest] = items;
  return [
    { id: "home", label: "Fuzzley Games", icon: "home", href },
    ...(first ? [{ ...first, startsGroup: true }] : []),
    ...rest,
  ];
}
