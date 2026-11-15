import { Component, computed, input, output } from "@angular/core";
import { formatPoints, tierWords } from "@fz/core/format";
import { keysOf } from "@fz/core/records";
import {
  type HelpCatalog,
  HelpCatalogComponent,
  helpEntries,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import { MOST_LIFT } from "@fz/style/fuzzball";
import { PICKUP_IDS, pickup } from "../../rules/catalog/pickups";
import { ROCK_KIND_IDS, rockKind } from "../../rules/catalog/rocks";
import { SPEED_INFO } from "../../rules/speed";
import {
  CLEAN_POINTS,
  CLEAR_POINTS,
  DASH_RECHARGE_MS,
  FIRST_CREW,
  GRAZE_STATIC,
  HIT_GUARD_MS,
  LOOSE_LIFE_MS,
  MOST_CREW,
  SPARK_DRAW_REACH,
  SPARK_POINTS,
  SPARK_STATIC,
  STATIC_HOLD_MS,
  STATIC_MOST,
  STATIC_STEPS,
  STRAYS_FROM,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
  ZAP_ARCS,
  ZAP_COST,
  ZAP_REACH,
} from "../../rules/tuning";
import type { Pictures } from "../../view/art/art";

/** What How to play says of the crew, the ship's lives, from the tuning. */
const CREW = `The pilot flies the ship with ${String(FIRST_CREW - 1)} of the crew in tow, who are its lives, and a stray caught joins them, up to ${String(MOST_CREW - 1)}. A rock or a comet that touches the ship, unless it is dashing or shielded, knocks the last in tow loose, and nothing can touch it again for ${String(HIT_GUARD_MS / 1000)} seconds; fly into one knocked loose within ${String(LOOSE_LIFE_MS / 1000)} seconds to catch it again, or it floats home, and clearing the wave catches every one still loose. A hit with no one in tow sends the pilot home, and the run ends.`;

/** How the score adds up, from the tuning, as How to play says it. */
const SCORING = {
  sparks: `Each rock a shot or a blast breaks sheds sparks, which the ship draws in from ${String(SPARK_DRAW_REACH)} units, ${String(Math.round(SPARK_DRAW_REACH * SPEED_INFO.relaxed.sparkReach))} at ${SPEED_INFO.relaxed.name}, and the ship and those in tow gather: each scores ${String(SPARK_POINTS)} and adds ${String(SPARK_STATIC)} static, up to ${String(STATIC_MOST)}.`,
  strays: `A stray caught scores ${formatPoints(STRAY_POINTS)}, or ${formatPoints(STRAY_HOME_POINTS)} as it goes straight home, times static's multiplier.`,
  clearing: `A wave cleared adds ${formatPoints(CLEAR_POINTS)} points, and ${formatPoints(CLEAN_POINTS)} more when no hit was taken on it.`,
};

/** What How to play says of static, from the tuning: what it multiplies, what else raises it, how the pilot shows it, and how it falls. */
const CHARGE = `Static multiplies what rocks, sparks and strays score: ${tierWords(STATIC_STEPS, "static")}. A rock or a comet that passes close by the ship without touching it adds ${String(GRAZE_STATIC)}. The pilot's fur lifts with each step, on end from ×${String(MOST_LIFT + 1)}, and at full static, ${String(STATIC_MOST)}, arcs crawl over the ship. Static drains after ${String(STATIC_HOLD_MS / 1000)} seconds with no spark or near miss, and a hit knocks it down a step.`;

/** What How to play says of a dash, its recharge and the zap from the tuning. */
const DASHING = `A dash throws the ship ahead, and no rock or comet can hit it while it lasts; it takes ${String(DASH_RECHARGE_MS / 1000)} seconds to charge again. At full static, a dash zaps: arcs leap from the ship to up to ${String(ZAP_ARCS)} rocks within ${String(ZAP_REACH)} units of the way it dashes, the nearest first, each taking a hit, and static falls by ${String(ZAP_COST)}; with none in reach, it is only a dash.`;

/** What How to play says of pickups before listing them. */
const PICKUPS_INTRO =
  "A broken rock may let a pickup go. Fly into it to catch it before it fades; a crystal always lets one go.";

/** What How to play says of strays and the comet before listing them. */
const ADRIFT_INTRO = `Neither is a rock, and a wave never needs either. Strays drift in from wave ${String(STRAYS_FROM)}, and a pilot left with no one in tow, and no one to catch again, is sent one at once, once a wave; comets come in the later waves.`;

/** What How to play says of a stray and the comet, with no catalog of their own. */
const ADRIFT = {
  stray: {
    name: "Stray fuzzball",
    about: `Crosses the field once in its bubble, which shots pass through. Fly into it to catch it: it joins the line in tow, up to ${String(MOST_CREW - 1)}, or, with the line full, goes straight home.`,
  },
  comet: {
    name: "Comet",
    about:
      "Warned of by a chevron at the edge it comes in by, it crosses the field, breaking any rock it touches a size down, and hits the ship as a rock does unless the ship is dashing or shielded.",
  },
} as const;

/** The ids of a stray and the comet, in How to play's order. */
const ADRIFT_IDS = keysOf(ADRIFT);

/**
 * Shows How to play: the aim, the crew, scoring, static, dashing and the
 * zap, and pausing, the controls by mouse, touch and keys, and every rock,
 * pickup, a stray and the comet, each with its name, what it does and its
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

  /** The pictures of every rock kind, pickup, a stray and the comet, or null before the scene has drawn. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly crew = CREW;
  protected readonly scoring = SCORING;
  protected readonly charge = CHARGE;
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
