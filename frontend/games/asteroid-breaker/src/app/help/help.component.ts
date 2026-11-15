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
  CLEAN_POINTS,
  CLEAR_POINTS,
  DASH_RECHARGE_MS,
  MOST_CREW,
  STATIC_HOLD_MS,
  STATIC_STEPS,
  STRAYS_FROM,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
} from "../../rules/tuning";
import type { Pictures } from "../../view/art/art";

/** How the score adds up, from the tuning, as How to play says it. */
const SCORING = {
  multiplier: `Static multiplies what is scored: ${tierWords(STATIC_STEPS, "static")}. It drains after ${String(STATIC_HOLD_MS / 1000)} seconds, and a hit knocks it down a step.`,
  strays: `A stray caught scores ${formatPoints(STRAY_POINTS)}, or ${formatPoints(STRAY_HOME_POINTS)} as it goes straight home, times static's multiplier.`,
  clearing: `A wave cleared adds ${formatPoints(CLEAR_POINTS)} points, and ${formatPoints(CLEAN_POINTS)} more when no hit was taken on it.`,
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
    about: `Crosses the field once in its bubble, which shots pass through. Fly into it to catch it: it joins the line in tow, up to ${String(MOST_CREW - 1)}, or, with the line full, goes straight home.`,
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
