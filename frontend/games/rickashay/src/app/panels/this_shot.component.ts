import { Component, computed, input } from "@angular/core";
import { type FlightRules, bounceRungs } from "../../rules/tuning";
import type { Pictures } from "../../scene/pictures";
import type { FlightSoFar } from "../../view/run_state";

/** A floor bounce's spring, unlit and lit, each a picture's URL, as the scene bakes them. */
export type SpringPictures = Pictures["springs"];

/**
 * Shows This shot, the game's own lines in In this wall, the panel right of
 * a wide room's field (`@fz/brick-wall/app/panels`' `<fz-in-this-wall>`):
 * the shot's rally, large; the floor bounces it has, a spring for each it
 * can hold, those it has lit; a bar that fills toward the next floor
 * bounce, and the rally it comes at, or that none comes while the shot
 * holds all it can, as one earned then is lost; and the shot's turns.
 * They are the shot's, as far as it has played back, kept as its wall
 * settles; while the next is aimed, they are what it leaves with, such as
 * a hot shot's floor bounce.
 *
 * Its lines lie in the panel's own layout, as the panel's are. The springs
 * and the bar are hidden from assistive technology, as the figures beside
 * them say what they show.
 */
@Component({
  selector: "app-this-shot",
  templateUrl: "./this_shot.component.html",
  styleUrl: "./this_shot.component.scss",
})
export class ThisShotComponent {
  /** What the shot has played back so far. */
  readonly soFar = input.required<FlightSoFar>();

  /** The rules' numbers the shot flies on: when it earns a floor bounce, and how many it holds. */
  readonly rules =
    input.required<
      Pick<FlightRules, "firstBounce" | "bounceStep" | "mostBounces">
    >();

  /** A floor bounce's spring, unlit and lit, or null before the scene has drawn it. */
  readonly springs = input<SpringPictures | null>(null);

  /** The floor bounces the shot has, against the most it can hold, as "2 of 3". */
  protected readonly held = computed(
    () => `${String(this.soFar().held)} of ${String(this.rules().mostBounces)}`,
  );

  /** A spring for each floor bounce the shot can hold, as a picture's URL, lit for those it has, or null for each before the scene has drawn them. */
  protected readonly springPictures = computed(
    (): readonly (string | null)[] => {
      const springs = this.springs();
      const { held } = this.soFar();
      const length = this.rules().mostBounces;
      if (springs === null) return Array.from({ length }, () => null);
      return Array.from({ length }, (_, at) =>
        at < held ? springs.on : springs.off,
      );
    },
  );

  /** The rungs of the floor bounce ladder the shot's rally stands between. */
  private readonly rungs = computed(() =>
    bounceRungs(this.soFar().rally, this.rules()),
  );

  /** Whether the shot holds all the floor bounces it can, so the next rung earns it none. */
  private readonly full = computed(
    () => this.soFar().held >= this.rules().mostBounces,
  );

  /** The rally the next floor bounce comes at, as "Rally 25", or that none comes while the shot holds all it can. */
  protected readonly next = computed(() =>
    this.full()
      ? `Not while you have ${String(this.rules().mostBounces)}`
      : `Rally ${String(this.rungs().at)}`,
  );

  /** How far the rally has come from the last floor bounce toward the next, from 0 to 1: none while the shot holds all it can. */
  protected readonly toNext = computed(() => {
    if (this.full()) return 0;
    const { from, at } = this.rungs();
    return (this.soFar().rally - from) / (at - from);
  });
}
