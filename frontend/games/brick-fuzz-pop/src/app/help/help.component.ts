import { Component, computed, input, output } from "@angular/core";
import { count, formatPoints, ordinal } from "@fz/core/format";
import {
  type HelpCatalog,
  HelpCatalogComponent,
  helpEntries,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../../rules/catalog/bricks";
import { ROWS_READ } from "../../rules/run/describe";
import { MOST_STARS } from "../../rules/run/stars";
import {
  JUMP_POINTS,
  MOST_CHARGE,
  STAR_POINTS,
  STREAK,
  TRIPLE_MATES,
  TWO_STARS_PAST_PAR,
  ZAP_HITS,
} from "../../rules/tuning";

/**
 * The pictures How to play shows, each an image's URL: every kind of brick's.
 * The scene's pictures, which hold more, can be handed over whole.
 */
export interface HelpPictures {
  readonly bricks: Readonly<Record<BrickKindId, string>>;
}

/** What How to play says of charge, from the tuning. */
const CHARGE = `Each pip of charge takes 1 hit off a brick, and a fuzzball with no charge still takes 1. If the brick breaks, the fuzzball flies on with the charge it has left. If not, it bounces off with none. While you hold, the charge climbs to ${String(MOST_CHARGE)} and back down.`;

/** What How to play says of the two boons, from the tuning. */
const BOONS = `The hot shot flies at full charge, and nothing drains it. The triple shot sends ${count(TRIPLE_MATES, "more fuzzball", "more fuzzballs")} out behind yours, with the same charge. A boon lasts 1 shot. If that shot makes the wall jump again, you get the boon again.`;

/** Describes a row of How to play's scoring table: what scores, and how much. */
interface ScoringRow {
  readonly what: string;
  readonly points: string;
}

/** The scoring table, from the tuning: the streak's multipliers, then a jump's and a star's points. */
const SCORING: readonly ScoringRow[] = [
  ...[...STREAK].reverse().map(({ from, times }, index, tiers) => {
    const next = tiers[index + 1];
    return {
      what:
        next === undefined
          ? `${ordinal(from)} brick on`
          : `${ordinal(from)} to ${ordinal(next.from - 1)} brick`,
      points: `×${String(times)}`,
    };
  }),
  { what: "A jump", points: `+${formatPoints(JUMP_POINTS)}` },
  { what: "A star", points: `+${formatPoints(STAR_POINTS)}` },
];

/** How stars are earned, from the tuning, as How to play says it. */
const STARS = `If you clear a level in par or fewer shots, you get ${String(MOST_STARS)} stars. Up to ${String(TWO_STARS_PAST_PAR)} over par, you get 2. Any more, you get 1. Par depends on how many rows the screen shows when the level starts.`;

/** What How to play says of the bricks before listing them. */
const BRICKS_INTRO = `A zap or a blast takes ${String(ZAP_HITS)} hits off each brick it reaches.`;

/**
 * Shows How to play: the aim, charge, the wall's step and its jump, the two
 * boons, scoring and stars, the controls by mouse, touch and keys, and every
 * kind of brick, each with its name, what it does and its picture once the
 * scene has drawn it.
 *
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

  /** The pictures of every kind of brick, or null before the scene has drawn. */
  readonly pictures = input<HelpPictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly charge = CHARGE;

  protected readonly boons = BOONS;

  protected readonly scoring = SCORING;

  protected readonly stars = STARS;

  /** How many of the lowest rows with bricks R reads. */
  protected readonly rowsRead = ROWS_READ;

  protected readonly catalogs = computed<readonly HelpCatalog[]>(() => [
    {
      id: "bricks",
      heading: "Bricks",
      intro: BRICKS_INTRO,
      entries: helpEntries(BRICK_KIND_IDS, brickKind, this.pictures()?.bricks),
    },
  ]);
}
