import { Component, computed, inject, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
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
import { GAME_LEVELS } from "../tokens";

/** A line of How to play's table of scoring: what scores, and what it adds. */
interface ScoringLine {
  readonly what: string;
  readonly points: string;
}

/** How the score adds up, from the tuning, as How to play's table sets it out. */
const SCORING: readonly ScoringLine[] = [
  ...[...STREAK].reverse().map(({ from, times }) => ({
    what: `Streak of ${String(from)} bricks`,
    points: `×${String(times)}`,
  })),
  { what: "Level cleared", points: formatPoints(CLEAR_POINTS) },
  {
    what: "Level cleared without losing a life",
    points: `${formatPoints(CLEAN_POINTS)} more`,
  },
  {
    what: `Extra life, up to ${String(MAX_LIVES)}`,
    points: `At ${formatPoints(FIRST_LIFE_POINTS)} points, then every ${formatPoints(LIFE_POINTS)}`,
  },
];

/** What How to play says of capsules before listing them. */
const CAPSULES_INTRO =
  "Capsules sometimes fall from broken bricks. Catch one with your paddle to use it. The pointed ones make the game harder, and don't fall at Relaxed speed. If you lose a life, every capsule wears off.";

/**
 * Shows How to play: the aim, the controls, scoring, stars and pausing, and
 * every brick, capsule and ball, each with its name, what it does and its
 * picture once the scene has drawn it.
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

  /** How many levels the game has. */
  protected readonly levelCount = inject(GAME_LEVELS).length;

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
