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
import {
  ROCK_KIND_IDS,
  ROCK_SIZES,
  pointsFor,
  rockKind,
} from "../../rules/catalog/rocks";
import {
  BURR_POINTS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  DASH_RECHARGE_MS,
  FIRST_CREW,
  GRAZE_STATIC,
  LOOSE_LIFE_MS,
  MOST_CREW,
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
} from "../../rules/tuning";
import { WAVES } from "../../rules/waves/waves";
import type { Pictures } from "../../view/art/art";

/** What How to play says first: the goal, the wrap, the crew as lives and how the game ends. */
const TOP = `Fly your ship and shoot the rocks. Each one breaks into smaller pieces until it's gone. Clear every rock to finish the wave. If your ship or a rock goes off one edge of the screen, it comes back on the other side. The fuzzballs following your ship are your crew, and each one is a life. If a rock or a comet hits you, one of them is knocked loose. If you're hit with no one following, the game is over. After wave ${String(WAVES.length)}, Endless keeps the waves coming until you're out of crew.`;

/** What How to play says of the crew, from the tuning. */
const CREW = `You start with ${String(FIRST_CREW - 1)} following you, and each stray you catch joins them. If one is knocked loose, fly into it within ${String(LOOSE_LIFE_MS / 1000)} seconds to get it back, or it floats home. When you clear the wave, any that are still loose come back.`;

/** What How to play says of static, from the tuning. */
const CHARGE = `Broken rocks give off sparks. Each one you collect adds ${String(SPARK_STATIC)} static, and each near miss adds ${String(GRAZE_STATIC)}. Static drains after ${String(STATIC_HOLD_MS / 1000)} seconds without either, and a hit drops it a step. It multiplies your score: ${tierWords(STATIC_STEPS, "static")}.`;

/** What How to play says of a dash and the zap, from the tuning. */
const DASHING = `A dash throws your ship forward, and nothing can hit it while it dashes. It takes ${String(DASH_RECHARGE_MS / 1000)} seconds to charge again. When your static is full, at ${String(STATIC_MOST)}, your next dash also zaps up to ${String(ZAP_ARCS)} rocks near its path. A zap uses ${String(ZAP_COST)} static.`;

/** Every rock's points at every size it comes in but a boulder's. */
const ROCK_POINTS = ROCK_KIND_IDS.flatMap((id) =>
  ROCK_SIZES.flatMap((size) =>
    size === "boulder" ? [] : (rockKind(id).points[size] ?? []),
  ),
);

/** What a boulder scores, as the catalog's spec holds every kind that comes as one to. */
const BOULDER_POINTS = pointsFor("boulder", "boulder");

/** What each thing scores, from the catalog and the tuning, as How to play's scoring table lists it. */
const SCORING: readonly { readonly what: string; readonly points: string }[] = [
  {
    what: "Breaking a rock",
    points: `${formatPoints(Math.min(...ROCK_POINTS))} to ${formatPoints(Math.max(...ROCK_POINTS))}, more for smaller rocks`,
  },
  { what: "Breaking a boulder", points: formatPoints(BOULDER_POINTS) },
  { what: "Collecting a spark", points: formatPoints(SPARK_POINTS) },
  { what: "Shooting a burr", points: formatPoints(BURR_POINTS) },
  {
    what: "Catching a stray",
    points: `${formatPoints(STRAY_POINTS)}, or ${formatPoints(STRAY_HOME_POINTS)} if your crew is full`,
  },
  { what: "Clearing a wave", points: formatPoints(CLEAR_POINTS) },
  {
    what: "Clearing it without a hit",
    points: `${formatPoints(CLEAN_POINTS)} more`,
  },
];

/** What How to play says of pickups before listing them. */
const PICKUPS_INTRO =
  "A broken rock sometimes drops a pickup. Fly into it before it fades. Crystals always drop one.";

/** What How to play says of strays, the comet and burrs before listing them. */
const ADRIFT_INTRO = `You don't need to clear these to finish a wave. Strays come from wave ${String(STRAYS_FROM)}, and comets and burrs in later waves. But if you have no crew following you or left to catch, a stray comes right away, once a wave.`;

/** What How to play says of a stray, the comet and a burr, with no catalog of their own. */
const ADRIFT = {
  stray: {
    name: "Stray fuzzball",
    about: `Joins your crew when you fly into it. If you already have ${String(MOST_CREW - 1)}, it goes straight home instead.`,
  },
  comet: {
    name: "Comet",
    about:
      "Crosses the screen fast and hits your ship like a rock. An arrow at the edge warns you first.",
  },
  burr: {
    name: "Burr",
    about:
      "Homes in on your ship and sticks to it, slowing you down. Shoot it first, or dash to shake it off.",
  },
} as const;

/** The ids of a stray, the comet and a burr, in How to play's order. */
const ADRIFT_IDS = keysOf(ADRIFT);

/**
 * Shows How to play: the goal, the controls by mouse, touch and keys, the
 * crew, static, dashing and the zap, and scoring, and every rock, pickup, a
 * stray, the comet and a burr, each with its name, what it does and its
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

  /** The pictures of every rock kind, pickup, a stray, the comet and a burr, or null before the scene has drawn. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly top = TOP;
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
        heading: "Strays, comets and burrs",
        intro: ADRIFT_INTRO,
        entries: helpEntries(
          ADRIFT_IDS,
          (id) => ADRIFT[id],
          pictures
            ? {
                stray: pictures.stray,
                comet: pictures.comet,
                burr: pictures.burr,
              }
            : undefined,
        ),
      },
    ];
  });
}
