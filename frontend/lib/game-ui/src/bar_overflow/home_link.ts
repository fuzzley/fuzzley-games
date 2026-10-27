import type { BarOverflowItem } from "./bar_overflow.component";

/**
 * Returns an overflow menu led by the link home to Fuzzley Games, set apart
 * from the items after it, for a bar with no room for the link
 * (`GameViewportService.barHome` is `none`).
 */
export function withHomeLink<Id extends string>(
  items: readonly BarOverflowItem<Id>[],
  href: string,
): readonly BarOverflowItem<Id>[] {
  const [first, ...rest] = items;
  return [
    { id: "home", label: "Fuzzley Games", icon: "home", href },
    ...(first ? [{ ...first, startsGroup: true }] : []),
    ...rest,
  ];
}
