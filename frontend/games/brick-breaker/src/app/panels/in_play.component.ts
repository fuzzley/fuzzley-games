import { Component, computed, input } from "@angular/core";
import { count } from "@fz/core/format";
import { helpEntries } from "@fz/game-ui/help_catalog";
import { brickKind } from "../../rules/catalog/bricks";
import { type CapsuleId, capsule } from "../../rules/catalog/capsules";
import { multiplier } from "../../rules/field/scoring";
import { STREAK } from "../../rules/tuning";
import type { Pictures } from "../../view/art/art";
import type { EffectInPlay, KindHere } from "./panels";

/** The streak the meter fills to: the one the highest multiplier starts at. */
const METER_TOP = Math.max(...STREAK.map(({ from }) => from));

/** The meter's ticks, a multiplier at the streak it starts at, from the least. */
const TICKS = [...STREAK].reverse().map(({ from, times }) => ({
  from,
  at: `${String((from / METER_TOP) * 100)}%`,
  label: `×${String(times)}`,
}));

/**
 * Shows in play, the panel right of a wide room's field: the streak, its
 * multiplier large, the bricks broken since the paddle and a meter ticked
 * where each multiplier starts; the effects in play, each a ring that
 * empties by its share, about its capsule's picture, with its name and its
 * whole seconds left; the kinds of brick in the level, each with its
 * picture, its name and what it does, a kind new here marked; and the
 * capsules that can fall in it.
 *
 * It is a region named by its heading, which only a screen reader hears,
 * and takes no pointer, so a press can start over it. The board lays it
 * over its room with `cssRectStyle()`. Each part is one element under the
 * heading, so a panel under 400 px tall keeps the first two
 * (`board-panel($compact: true)`). Nothing in it moves between the game's
 * signals, which change as the field comes to something: the rings step
 * with the whole seconds. The meter, the rings and the pictures are hidden
 * from assistive technology, as the words beside them say what they show.
 */
@Component({
  selector: "app-in-play",
  host: { role: "region", "aria-labelledby": "in-play-title" },
  templateUrl: "./in_play.component.html",
  styleUrl: "./in_play.component.scss",
})
export class InPlayComponent {
  /** The bricks broken since the paddle. */
  readonly streak = input.required<number>();

  /** The effects in play, in the order the field's tags show them. */
  readonly effects = input.required<readonly EffectInPlay[]>();

  /** The kinds of brick the level holds, in How to play's order. */
  readonly kinds = input.required<readonly KindHere[]>();

  /** The capsules that can fall in the level, in How to play's order. */
  readonly capsules = input.required<readonly CapsuleId[]>();

  /** The pictures of every brick and capsule, the same How to play shows, or null before the scene has drawn. */
  readonly pictures = input<Pictures | null>(null);

  /**
   * The streak's multiplier, as "×3", whether it counts yet, the bricks
   * since the paddle in words, and how far the meter is filled.
   */
  protected readonly shownStreak = computed(() => {
    const streak = this.streak();
    const times = multiplier(streak);
    return {
      times: `×${String(times)}`,
      counts: times > 1,
      bricks: count(streak, "brick", "bricks"),
      filled: `${String((Math.min(streak, METER_TOP) / METER_TOP) * 100)}%`,
      ticks: TICKS.map(({ at, label, from }) => ({
        at,
        label,
        reached: streak >= from,
      })),
    };
  });

  /**
   * Each effect in play: its capsule's name, tone and picture, its ring's
   * dash, its time left as the panel shows it and in words.
   */
  protected readonly shownEffects = computed(() => {
    const pictures = this.pictures()?.capsules;
    return this.effects().map(({ capsule: id, share, seconds }) => {
      const { name, tone } = capsule(id);
      return {
        id,
        name,
        tone,
        picture: pictures?.[id] ?? null,
        dash: `${String(share * 100)} 100`,
        left: seconds === null ? "ready" : `${String(seconds)} s`,
        leftWords:
          seconds === null
            ? "ready"
            : `${count(seconds, "second", "seconds")} left`,
      };
    });
  });

  /** Each kind of brick in the level, with its name, its words, its picture and whether it is new here. */
  protected readonly shownKinds = computed(() => {
    const kinds = this.kinds();
    const fresh = new Set<string>(
      kinds.filter(({ isNew }) => isNew).map(({ id }) => id),
    );
    return helpEntries(
      kinds.map(({ id }) => id),
      brickKind,
      this.pictures()?.bricks,
    ).map((entry) => ({ ...entry, isNew: fresh.has(entry.id) }));
  });

  /**
   * Each capsule that can fall in the level, with its name and its
   * picture, its name heard rather than seen once the picture shows it.
   */
  protected readonly shownCapsules = computed(() =>
    helpEntries(this.capsules(), capsule, this.pictures()?.capsules).map(
      (entry) => ({ ...entry, nameHidden: entry.picture !== null }),
    ),
  );
}
