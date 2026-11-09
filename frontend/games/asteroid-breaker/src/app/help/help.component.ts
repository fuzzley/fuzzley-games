import { Component, computed, input, output } from "@angular/core";
import { formatPoints, tierWords } from "@fz/core/format";
import { keysOf } from "@fz/core/records";
import {
  type HelpCatalog,
  HelpCatalogComponent,
  helpEntries,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import { PICKUP_IDS, pickup } from "../../rules/catalog/pickups";
import { ROCK_KIND_IDS, rockKind } from "../../rules/catalog/rocks";
import {
  CHAIN,
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  DASH_RECHARGE_MS,
  FIRST_SHIP_POINTS,
  MAX_SHIPS,
  SHIP_POINTS,
  STRAYS_FROM,
  STRAY_POINTS,
} from "../../rules/tuning";
import type { Pictures } from "../../view/art/art";

/** How the score adds up, from the tuning, as How to play says it. */
const SCORING = {
  chain: `Breaks each within ${String(CHAIN_MS / 1000)} seconds of the last make a chain, which multiplies each break's points: ${tierWords(CHAIN, "breaks")}.`,
  strays: `A stray brought home scores ${formatPoints(STRAY_POINTS)}, times the chain.`,
  clearing: `A wave cleared adds ${formatPoints(CLEAR_POINTS)} points, and ${formatPoints(CLEAN_POINTS)} more when no ship was lost on it.`,
  ships: `A ship more comes at ${formatPoints(FIRST_SHIP_POINTS)} points and every ${formatPoints(SHIP_POINTS)} after, up to ${String(MAX_SHIPS)} ships.`,
};

/** What How to play says of a dash, its recharge from the tuning. */
const DASHING = `A dash throws the ship ahead, and no rock or comet can take it while it lasts; it takes ${String(DASH_RECHARGE_MS / 1000)} seconds to charge again.`;

/** What How to play says of pickups before listing them. */
const PICKUPS_INTRO =
  "A broken rock may let a pickup go. Fly into it to catch it before it fades; a crystal always lets one go.";

/** What How to play says of strays and the comet before listing them. */
const ADRIFT_INTRO = `Neither is a rock, and a wave never needs either. Strays drift in from wave ${String(STRAYS_FROM)}; comets come in the later waves.`;

/** What How to play says of a stray and the comet, with no catalog of their own. */
const ADRIFT = {
  stray: {
    name: "Stray fuzzball",
    about:
      "Crosses the field once in its bubble, which shots pass through. Fly into it to bring it home, where it waits to fly the next ship the run gains.",
  },
  comet: {
    name: "Comet",
    about:
      "Warned of by a chevron at the edge it comes in by, it crosses the field, breaking any rock it touches a size down, and takes the ship unless the ship is dashing or shielded.",
  },
} as const;

/** The ids of a stray and the comet, in How to play's order. */
const ADRIFT_IDS = keysOf(ADRIFT);

/**
 * Shows How to play: the aim, scoring and pausing, the controls by mouse,
 * touch and keys, and every rock, pickup, a stray and the comet, each with
 * its name, what it does and its picture once the scene has drawn it.
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

  /** The pictures of every rock kind, pickup, a stray and the comet, or null before the scene has drawn. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly scoring = SCORING;
  protected readonly dashing = DASHING;

  protected readonly catalogs = computed<readonly HelpCatalog[]>(() => {
    const pictures = this.pictures();
    return [
      {
        id: "rocks",
        heading: "Rocks",
        intro: null,
        entries: helpEntries(ROCK_KIND_IDS, rockKind, pictures?.rocks),
      },
      {
        id: "pickups",
        heading: "Pickups",
        intro: PICKUPS_INTRO,
        entries: helpEntries(PICKUP_IDS, pickup, pictures?.pickups),
      },
      {
        id: "adrift",
        heading: "Strays and comets",
        intro: ADRIFT_INTRO,
        entries: helpEntries(
          ADRIFT_IDS,
          (id) => ADRIFT[id],
          pictures
            ? { stray: pictures.stray, comet: pictures.comet }
            : undefined,
        ),
      },
    ];
  });
}
