// How many of each effect the scene draws from a pool, and of the waves'
// marks, a timeline shows at once at most, for a spec to size the scene's
// pools by.

import { keysOf, recordOf } from "@fz/core/records";
import type { FeelTuning } from "../view/timeline/feel";
import { POOLS } from "../view/timeline/limits";
import type { Timeline } from "../view/timeline/timeline";

/** Describes something a pool shows, from a moment until another. */
interface Shown {
  readonly what: string;
  readonly fromMs: number;
  readonly untilMs: number;
}

/** Returns the most of each pool's kind a timeline shows at once, each mark for the feel's while. */
export function mostAtOnce(
  timeline: Timeline,
  feel: FeelTuning,
): Readonly<Record<keyof typeof POOLS, number>> {
  const shown: readonly Shown[] = [
    ...timeline.effects.flatMap((effect) =>
      "ms" in effect
        ? [
            {
              what: effect.what,
              fromMs: effect.atMs,
              untilMs: effect.atMs + effect.ms,
            },
          ]
        : [],
    ),
    ...timeline.marks.map(({ atMs }) => ({
      what: "mark",
      fromMs: atMs,
      untilMs: atMs + feel.markMs,
    })),
  ];
  return recordOf(keysOf(POOLS), (kind) =>
    Math.max(
      0,
      ...shown
        .filter(({ what }) => what === kind)
        .map(
          ({ fromMs }) =>
            shown.filter(
              (other) =>
                other.what === kind &&
                other.fromMs <= fromMs &&
                fromMs < other.untilMs,
            ).length,
        ),
    ),
  );
}
