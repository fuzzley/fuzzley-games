import { Component, computed, input, output } from "@angular/core";
import { count, formatPoints, tierWords } from "@fz/core/format";
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
import {
  HOT_BOUNCES,
  JUMP_POINTS,
  MOST_CHARGE,
  STAR_POINTS,
  STREAK,
  TRIPLE_MATES,
  TWO_STARS_PAST_PAR,
} from "../../rules/tuning";

/**
 * The pictures How to play shows, each an image's URL: every kind of brick's.
 * The scene's pictures, which hold more, can be handed over whole.
 */
export interface HelpPictures {
  readonly bricks: Readonly<Record<BrickKindId, string>>;
}

/** What How to play says of charge, from the tuning. */
const CHARGE = `A fuzzball's charge, 0 to ${String(MOST_CHARGE)}, is how many hits it punches through. It spends as much as a brick has hits left, or all it has, taking that many hits off it: through a brick it breaks it flies on with what is left, and off one it doesn't it turns. A plain one takes one hit and turns. Steel takes the charge.`;

/** What How to play says of the two boons, from the tuning. */
const BOONS = `The hot shot flies at full charge whatever you charged, nothing takes its charge, and it bounces off the floor ${count(HOT_BOUNCES, "time", "times")} before it lands. The triple shot sends ${count(TRIPLE_MATES, "more fuzzball", "more fuzzballs")} out behind yours, each with the charge you chose. A boon lasts one shot, and a boon shot that clears below the line again earns the next.`;

/** How the score adds up and stars are earned, from the tuning, as How to play says it. */
const SCORING = {
  streak: `The bricks a round breaks make a streak, which multiplies each one's points: ${tierWords(STREAK, "bricks")}.`,
  bonuses: `A jump adds ${formatPoints(JUMP_POINTS)} points, and each star ${formatPoints(STAR_POINTS)}.`,
  stars: `A level cleared within its par of rounds earns three stars, two within ${count(TWO_STARS_PAST_PAR, "more round", "more rounds")}, and one otherwise. Par is set for the depth the field had as the level began.`,
};

/** What How to play says of the bricks before listing them. */
const BRICKS_INTRO =
  "A kind is told by its shape and its mark, and a tough brick's hits by its pips. A level needs every brick broken but those that never break.";

/**
 * Shows How to play: the aim, charge, the wall's step and its jump, the two
 * boons, scoring and stars, the controls by mouse, touch and keys, and every
 * kind of brick, each with its name, what it does and its picture once the
 * scene has drawn it.
 *
 * Its letter keys are named by where they sit, as the game reads them by
 * `event.code`, so a key named by a letter would be wrong on any other
 * layout than the one it was named on.
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

  /** The most charge a fuzzball holds, to which holding the button climbs. */
  protected readonly mostCharge = MOST_CHARGE;

  protected readonly boons = BOONS;

  protected readonly scoring = SCORING;

  protected readonly catalogs = computed<readonly HelpCatalog[]>(() => [
    {
      id: "bricks",
      heading: "Bricks",
      intro: BRICKS_INTRO,
      entries: helpEntries(BRICK_KIND_IDS, brickKind, this.pictures()?.bricks),
    },
  ]);
}
