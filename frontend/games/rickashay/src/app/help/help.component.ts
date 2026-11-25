import { Component, computed, input, output } from "@angular/core";
import { count, formatPoints, ordinal } from "@fz/core/format";
import {
  type HelpCatalog,
  HelpCatalogComponent,
  helpEntries,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import type { KindId } from "../../rules/catalog/kinds";
import { ROWS_READ } from "../../rules/run/describe";
import {
  BOUNCE_POINTS,
  FLIGHT_RULES,
  JUMP_POINTS,
  RALLY_STEPS,
  STAR_POINTS,
  STRIKE_POINTS,
  bounceRally,
} from "../../rules/tuning";
import { HELP_KIND_IDS, kindPictures, kindWords } from "./kinds";

/**
 * The pictures How to play shows, each an image's URL: each drawn kind of
 * brick's. The scene's pictures, which hold more, can be handed over whole.
 */
export interface HelpPictures {
  readonly bricks: Partial<Readonly<Record<KindId, string>>>;
}

/** The rallies of the first 4 floor bounces, as How to play names them before "and on", from the tuning. */
const BOUNCE_RALLIES = [1, 2, 3, 4]
  .map((bounce) => String(bounceRally(bounce, FLIGHT_RULES)))
  .join(", ");

/** What How to play says of the rally and its floor bounces, from the tuning. */
const RALLY = `Each time your shot strikes a brick that can be broken, the rally goes up by 1. At a rally of ${BOUNCE_RALLIES} and so on, your shot earns a floor bounce. Each floor bounce lets the fuzzball bounce off the floor once instead of landing. Your shot can hold ${String(FLIGHT_RULES.mostBounces)} at once.`;

/** What How to play says of the hot shot, from the tuning. */
const HOT_SHOT = `A hot shot takes ${count(FLIGHT_RULES.hotHits, "hit", "hits")} off each brick it strikes. It starts with ${count(FLIGHT_RULES.hotBounces, "floor bounce", "floor bounces")}.`;

/** Describes a row of How to play's scoring table: what scores, and how much. */
interface ScoringRow {
  readonly what: string;
  readonly points: string;
}

/**
 * The scoring table, from the tuning: what each strike of a shot scores
 * by its place in the rally, then a floor bounce's, a jump's and a star's
 * points.
 */
const SCORING: readonly ScoringRow[] = [
  ...[{ from: 1, times: 1 }, ...[...RALLY_STEPS].reverse()].map(
    ({ from, times }, index, steps) => {
      const next = steps[index + 1];
      return {
        what:
          next === undefined
            ? `${ordinal(from)} strike on`
            : `${ordinal(from)} to ${ordinal(next.from - 1)} strike`,
        points: formatPoints(STRIKE_POINTS * times),
      };
    },
  ),
  { what: "A floor bounce", points: `+${formatPoints(BOUNCE_POINTS)}` },
  { what: "A jump", points: `+${formatPoints(JUMP_POINTS)}` },
  { what: "A star", points: `+${formatPoints(STAR_POINTS)}` },
];

/**
 * Shows How to play: the aim, the controls by mouse, touch and keys; that
 * every strike bounces the fuzzball; the cut corners and the 8 directions a
 * shot flies in, drawn; the bank, drawn as pool players learn it, by
 * aiming at a gap's mirror image in the side wall; the rally and its
 * floor bounces; the wall's jump; the hot shot; scoring and stars; and
 * every kind of brick, each with its name, what it does and its picture
 * once the scene has drawn it.
 *
 * Its drawings are in the page's palette, so they follow the player's.
 * Its letter keys are named by their QWERTY letters, though the game reads
 * them by their place on the keyboard (`event.code`).
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

  /** The pictures of every drawn kind of brick, or null before the scene has drawn. */
  readonly pictures = input<HelpPictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly rally = RALLY;

  protected readonly hotShot = HOT_SHOT;

  protected readonly scoring = SCORING;

  /** How many of the lowest rows with bricks R reads. */
  protected readonly rowsRead = ROWS_READ;

  protected readonly catalogs = computed<readonly HelpCatalog[]>(() => {
    const pictures = this.pictures();
    return [
      {
        id: "bricks",
        heading: "Bricks",
        intro: null,
        entries: helpEntries(
          HELP_KIND_IDS,
          kindWords,
          (pictures && kindPictures(pictures.bricks)) ?? undefined,
        ),
      },
    ];
  });
}
