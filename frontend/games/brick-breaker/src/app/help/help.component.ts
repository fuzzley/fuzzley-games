import { Component, computed, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { BALL_KIND_IDS, ballKind } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import { CAPSULE_IDS, capsule } from "../../rules/catalog/capsules";
import {
  CLEAN_POINTS,
  CLEAR_POINTS,
  FIRST_LIFE_POINTS,
  LIFE_POINTS,
  MAX_LIVES,
  STREAK,
} from "../../rules/tuning";
import type { Pictures } from "../../view/art";

/** Describes one thing the field can hold, for How to play's lists. */
interface Entry {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  /** Its picture as the scene drew it, or null before the scene has. */
  readonly picture: string | null;
}

/** Writes points as a player reads them, with a comma in the thousands. */
function points(value: number): string {
  return value.toLocaleString("en-US");
}

/** Returns a catalog's entries for How to play, each with its picture once there is one. */
function entries<Id extends string>(
  ids: readonly Id[],
  describe: (id: Id) => { readonly name: string; readonly about: string },
  pictures: Readonly<Record<Id, string>> | undefined,
): readonly Entry[] {
  return ids.map((id) => {
    const { name, about } = describe(id);
    return { id, name, about, picture: pictures?.[id] ?? null };
  });
}

/** How a streak multiplies a hit's points, from the least, in the bar's words. */
const STREAK_WORDS = [...STREAK]
  .reverse()
  .map(({ from, times }) => `×${String(times)} from ${String(from)} bricks`)
  .join(", ");

/** How the score adds up, from the tuning, as How to play says it. */
const SCORING = {
  streak: `A streak of bricks broken since the ball last touched the paddle multiplies each hit's points: ${STREAK_WORDS}.`,
  clearing: `A level cleared adds ${points(CLEAR_POINTS)} points, and ${points(CLEAN_POINTS)} more when no ball was lost on it.`,
  lives: `A life comes at ${points(FIRST_LIFE_POINTS)} points and every ${points(LIFE_POINTS)} after, up to ${String(MAX_LIVES)} lives.`,
};

/**
 * Shows How to play: the aim, scoring and pausing, the controls, and every
 * brick, capsule and ball, each with its name, what it does and its picture
 * once the scene has drawn it.
 */
@Component({
  selector: "app-help",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./help.component.html",
  styleUrl: "./help.component.scss",
})
export class HelpComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** The pictures of every brick, capsule and ball, or null before the scene has drawn. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly scoring = SCORING;

  protected readonly bricks = computed(() =>
    entries(BRICK_KIND_IDS, brickKind, this.pictures()?.bricks),
  );

  protected readonly capsules = computed(() =>
    entries(CAPSULE_IDS, capsule, this.pictures()?.capsules),
  );

  protected readonly balls = computed(() =>
    entries(BALL_KIND_IDS, ballKind, this.pictures()?.balls),
  );
}
