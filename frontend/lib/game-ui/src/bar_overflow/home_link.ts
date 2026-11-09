import { type BarHome, HOME_HREF } from "../game_bar/game_bar.component";
import type { BarOverflowItem } from "./bar_overflow.component";

/**
 * Returns a bar's overflow menu as its `barHome`
 * (`GameViewportService.barHome`) asks: led by the link home to Fuzzley
 * Games, set apart from the items after it, where the bar has no room for
 * the link (`none`), and the items alone where the bar shows it.
 *
 * The link leads to `/`, as the bar's does, unless given another `href`; an
 * app that gives the bar its own `homeHref` passes it here too.
 */
export function withHomeLink<Id extends string>(
  items: readonly BarOverflowItem<Id>[],
  barHome: BarHome,
  href: string = HOME_HREF,
): readonly BarOverflowItem<Id>[] {
  if (barHome !== "none") return items;
  const [first, ...rest] = items;
  return [
    { id: "home", label: "Fuzzley Games", icon: "home", href },
    ...(first ? [{ ...first, startsGroup: true }] : []),
    ...rest,
  ];
}
