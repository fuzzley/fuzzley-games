import { Component, computed, input, output } from "@angular/core";
import { formatPoints, tierWords } from "@fz/core/format";
import {
  type HelpCatalog,
  HelpCatalogComponent,
  helpEntries,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
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
import type { Pictures } from "../../view/art/art";

/** How the score adds up, from the tuning, as How to play says it. */
const SCORING = {
  streak: `A streak of bricks broken since the ball last touched the paddle multiplies each hit's points: ${tierWords(STREAK, "bricks")}.`,
  clearing: `A level cleared adds ${formatPoints(CLEAR_POINTS)} points, and ${formatPoints(CLEAN_POINTS)} more when no ball was lost on it.`,
  lives: `A life comes at ${formatPoints(FIRST_LIFE_POINTS)} points and every ${formatPoints(LIFE_POINTS)} after, up to ${String(MAX_LIVES)} lives.`,
};

/** What How to play says of capsules before listing them. */
const CAPSULES_INTRO =
  "A broken brick may let a capsule fall. Catch it with the paddle for what it does; Relaxed lets none fall that makes the game harder.";

/**
 * Shows How to play: the aim, scoring and pausing, the controls, and every
 * brick, capsule and ball, each with its name, what it does and its picture
 * once the scene has drawn it.
 */
@Component({
  selector: "app-help",
  imports: [HelpCatalogComponent, HelpDialogComponent],
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

  protected readonly catalogs = computed<readonly HelpCatalog[]>(() => {
    const pictures = this.pictures();
    return [
      {
        id: "bricks",
        heading: "Bricks",
        intro: null,
        entries: helpEntries(BRICK_KIND_IDS, brickKind, pictures?.bricks),
      },
      {
        id: "capsules",
        heading: "Capsules",
        intro: CAPSULES_INTRO,
        entries: helpEntries(CAPSULE_IDS, capsule, pictures?.capsules),
      },
      {
        id: "balls",
        heading: "Balls",
        intro: null,
        entries: helpEntries(BALL_KIND_IDS, ballKind, pictures?.balls),
      },
    ];
  });
}
