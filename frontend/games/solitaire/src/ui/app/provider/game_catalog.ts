import { PlayableGame } from "@/engine/tableau/playable_game";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { deckCardIds } from "@/engine/core/card/deck";

import { KlondikeGame } from "@/games/klondike/klondike_game";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { FreeCellVariant } from "@/games/freecell/freecell_rules";
import { FREECELL_LAYOUT } from "@/games/freecell/freecell_layout";
import { SpiderGame } from "@/games/spider/spider_game";
import { SpiderSuitCount, spiderDeck } from "@/games/spider/spider_deal";
import { SPIDER_LAYOUT } from "@/games/spider/spider_layout";
import { YukonGame } from "@/games/yukon/yukon_game";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import { YUKON_LAYOUT } from "@/games/yukon/yukon_layout";
import { EightOffGame } from "@/games/eight_off/eight_off_game";
import { EIGHT_OFF_LAYOUT } from "@/games/eight_off/eight_off_layout";
import { ScorpionGame } from "@/games/scorpion/scorpion_game";
import { SCORPION_LAYOUT } from "@/games/scorpion/scorpion_layout";
import { SimpleSimonGame } from "@/games/simple_simon/simple_simon_game";
import { SIMPLE_SIMON_LAYOUT } from "@/games/simple_simon/simple_simon_layout";
import { BakersDozenGame } from "@/games/bakers_dozen/bakers_dozen_game";
import { BAKERS_DOZEN_LAYOUT } from "@/games/bakers_dozen/bakers_dozen_layout";
import { SeahavenGame } from "@/games/seahaven/seahaven_game";
import { SEAHAVEN_LAYOUT } from "@/games/seahaven/seahaven_layout";
import { FortyThievesGame } from "@/games/forty_thieves/forty_thieves_game";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import {
  FORTY_THIEVES_LAYOUT,
  LIMITED_LAYOUT,
  MARIA_LAYOUT,
} from "@/games/forty_thieves/forty_thieves_layout";
import { MontanaGame } from "@/games/montana/montana_game";
import { MONTANA_LAYOUT } from "@/games/montana/montana_layout";
import { DoubleKlondikeGame } from "@/games/double_klondike/double_klondike_game";
import { DOUBLE_KLONDIKE_LAYOUT } from "@/games/double_klondike/double_klondike_layout";
import { EasthavenGame } from "@/games/easthaven/easthaven_game";
import { EASTHAVEN_LAYOUT } from "@/games/easthaven/easthaven_layout";
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import { SPIDERETTE_LAYOUT } from "@/games/spiderette/spiderette_layout";

/** Describes a value a rule option can take, and its name for a player. */
export interface GameOptionChoice {
  /** The stored value, kept primitive so it round-trips through storage. */
  readonly value: number;
  /** What the choice is called. */
  readonly label: string;
}

/** Describes a rule a game lets the player choose. */
export interface GameOptionSpec {
  /** Stable id, used for storage and for setting the value. */
  readonly id: string;
  /** What the option is called. */
  readonly label: string;
  /** A sentence explaining what choosing differently does. */
  readonly description?: string;
  /** The values on offer, in the order they are shown. */
  readonly choices: readonly GameOptionChoice[];
  /** The value used when the player has expressed no preference. */
  readonly defaultValue: number;
  /** Whether this is a development aid rather than a rule a player picks. */
  readonly debugOnly?: boolean;
}

/** Maps each option id to its chosen value. */
export type GameOptionValues = Readonly<Record<string, number>>;

/**
 * Describes a game the application can put on the table: its name, its rules,
 * its grid, and how to deal one.
 *
 * Generic in the game it deals so the board registry can be checked against it.
 */
export interface CatalogEntry<TGame extends PlayableGame = PlayableGame> {
  /** Stable id, also the URL fragment that selects it. */
  readonly id: string;
  /** Name shown to a player. */
  readonly name: string;
  /**
   * Two characters standing for the game in a collapsed game rail, chosen by
   * hand because many names share a first letter.
   */
  readonly marker: string;
  /** The rules this game lets the player choose. */
  readonly options: readonly GameOptionSpec[];
  /** The grid this game's board lies on, renderer-agnostic. */
  readonly layout: TableLayoutSpec;
  /** Creates a dealt game playing by the given options. */
  create(values: GameOptionValues): CatalogSession<TGame>;
}

/** Holds a dealt game. */
export interface CatalogSession<TGame extends PlayableGame = PlayableGame> {
  readonly game: TGame;
}

/** Reads an option's value, falling back to its default. */
export function optionValue(
  values: GameOptionValues,
  spec: GameOptionSpec,
): number {
  const value = values[spec.id];
  return spec.choices.some((choice) => choice.value === value)
    ? value
    : spec.defaultValue;
}

const KLONDIKE_DRAW_COUNT: GameOptionSpec = {
  id: "drawCount",
  label: "Draw Mode",
  description: "Draw 1 is easier; Draw 3 is the standard Solitaire challenge.",
  choices: [
    { value: 1, label: "Draw 1" },
    { value: 3, label: "Draw 3" },
  ],
  defaultValue: 3,
};

const KLONDIKE_ALMOST_WIN: GameOptionSpec = {
  id: "almostWin",
  label: "Almost Win Mode",
  description:
    "Pre-populates foundations so that dragging the remaining Kings will win the game.",
  choices: [
    { value: 0, label: "Normal" },
    { value: 1, label: "Almost Win" },
  ],
  defaultValue: 0,
  debugOnly: true,
};

const BAKERS_EMPTY_COLUMNS: GameOptionSpec = {
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Kings Only is the harder variant: it also caps how many cards move at once, because a run can no longer be staged in an empty column.",
  choices: [
    { value: 0, label: "Any Card" },
    { value: 1, label: "Kings Only" },
  ],
  defaultValue: 0,
};

const SPIDER_SUIT_COUNT: GameOptionSpec = {
  id: "suitCount",
  label: "Suits",
  description:
    "Always 104 cards — fewer suits means more copies of each, and a far gentler game.",
  choices: [
    { value: 1, label: "1 Suit" },
    { value: 2, label: "2 Suits" },
    { value: 4, label: "4 Suits" },
  ],
  defaultValue: 4,
};

/** Which of the Yukon family to deal. */
const YUKON_VARIANT: GameOptionSpec = {
  id: "variant",
  label: "Variant",
  description:
    "Alaska and Russian Solitaire deal like Yukon but build the columns by suit rather than by alternating color.",
  choices: [
    { value: YukonVariant.YUKON, label: "Yukon" },
    { value: YukonVariant.ALASKA, label: "Alaska" },
    { value: YukonVariant.RUSSIAN, label: "Russian Solitaire" },
  ],
  defaultValue: YukonVariant.YUKON,
};

/*
 * The entries, each declared with `satisfies` so it keeps the literal id and
 * game type the board registry is checked against.
 */

/** Which of the Klondike family to deal. */
const KLONDIKE_VARIANT: GameOptionSpec = {
  id: "variant",
  label: "Variant",
  description:
    "Whitehead deals every card face-up and builds in one colour; Thumb and Pouch lets a card land on any suit but its own. Both let any card fill an empty column.",
  choices: [
    { value: KlondikeVariant.KLONDIKE, label: "Klondike" },
    { value: KlondikeVariant.WHITEHEAD, label: "Whitehead" },
    { value: KlondikeVariant.THUMB_AND_POUCH, label: "Thumb and Pouch" },
  ],
  defaultValue: KlondikeVariant.KLONDIKE,
};

const KLONDIKE = {
  id: "klondike" as const,
  name: "Klondike",
  marker: "KL",
  options: [KLONDIKE_VARIANT, KLONDIKE_DRAW_COUNT, KLONDIKE_ALMOST_WIN],
  layout: KLONDIKE_LAYOUT,
  create: (values: GameOptionValues) => {
    const drawCount = optionValue(values, KLONDIKE_DRAW_COUNT) === 1 ? 1 : 3;
    const variant = optionValue(values, KLONDIKE_VARIANT) as KlondikeVariant;
    const game = new KlondikeGame(undefined, undefined, drawCount, variant);
    game.almostWin = optionValue(values, KLONDIKE_ALMOST_WIN) === 1;
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<KlondikeGame>;

const FREECELL = {
  id: "freecell" as const,
  name: "FreeCell",
  marker: "FC",
  options: [],
  layout: FREECELL_LAYOUT,
  create: () => {
    const game = new FreeCellGame(
      undefined,
      undefined,
      FreeCellVariant.FREECELL,
    );
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<FreeCellGame>;

const SPIDER = {
  id: "spider" as const,
  name: "Spider",
  marker: "SP",
  options: [SPIDER_SUIT_COUNT],
  layout: SPIDER_LAYOUT,
  create: (values: GameOptionValues) => {
    const suitCount = optionValue(values, SPIDER_SUIT_COUNT) as SpiderSuitCount;
    const game = new SpiderGame(deckCardIds(spiderDeck(suitCount)));
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SpiderGame>;

const YUKON = {
  id: "yukon" as const,
  name: "Yukon",
  marker: "YU",
  options: [YUKON_VARIANT],
  layout: YUKON_LAYOUT,
  create: (values: GameOptionValues) => {
    const variant = optionValue(values, YUKON_VARIANT) as YukonVariant;
    const game = new YukonGame(undefined, undefined, variant);
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<YukonGame>;

const BAKERS = {
  id: "bakers" as const,
  name: "Baker's Game",
  marker: "BG",
  options: [BAKERS_EMPTY_COLUMNS],
  layout: FREECELL_LAYOUT,
  // FreeCell's class, playing by Baker's Game's column rules.
  create: (values: GameOptionValues) => {
    const variant =
      optionValue(values, BAKERS_EMPTY_COLUMNS) === 1
        ? FreeCellVariant.BAKERS_KINGS_ONLY
        : FreeCellVariant.BAKERS;
    const game = new FreeCellGame(undefined, undefined, variant);
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<FreeCellGame>;

const EIGHT_OFF = {
  id: "eightoff" as const,
  name: "Eight Off",
  marker: "EO",
  options: [],
  layout: EIGHT_OFF_LAYOUT,
  create: () => {
    const game = new EightOffGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<EightOffGame>;

const SCORPION = {
  id: "scorpion" as const,
  name: "Scorpion",
  marker: "SC",
  options: [],
  layout: SCORPION_LAYOUT,
  create: () => {
    const game = new ScorpionGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<ScorpionGame>;

const SIMPLE_SIMON = {
  id: "simplesimon" as const,
  name: "Simple Simon",
  marker: "SS",
  options: [],
  layout: SIMPLE_SIMON_LAYOUT,
  create: () => {
    const game = new SimpleSimonGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SimpleSimonGame>;

const BAKERS_DOZEN = {
  id: "bakersdozen" as const,
  name: "Baker's Dozen",
  marker: "BD",
  options: [],
  layout: BAKERS_DOZEN_LAYOUT,
  create: () => {
    const game = new BakersDozenGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<BakersDozenGame>;

const SEAHAVEN = {
  id: "seahaven" as const,
  name: "Seahaven Towers",
  marker: "ST",
  options: [],
  layout: SEAHAVEN_LAYOUT,
  create: () => {
    const game = new SeahavenGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SeahavenGame>;

/** Which of the Forty Thieves family to deal. */
const FORTY_THIEVES_VARIANT: GameOptionSpec = {
  id: "variant",
  label: "Variant",
  description:
    "Josephine lets same-suit runs move as a unit; Rank and File builds in alternating colours but buries three of every four cards.",
  choices: [
    { value: FortyThievesVariant.FORTY_THIEVES, label: "Forty Thieves" },
    { value: FortyThievesVariant.JOSEPHINE, label: "Josephine" },
    { value: FortyThievesVariant.RANK_AND_FILE, label: "Rank and File" },
  ],
  defaultValue: FortyThievesVariant.FORTY_THIEVES,
};

const FORTY_THIEVES = {
  id: "fortythieves" as const,
  name: "Forty Thieves",
  marker: "FT",
  options: [FORTY_THIEVES_VARIANT],
  layout: FORTY_THIEVES_LAYOUT,
  create: (values: GameOptionValues) => {
    const variant = optionValue(
      values,
      FORTY_THIEVES_VARIANT,
    ) as FortyThievesVariant;
    const game = new FortyThievesGame(undefined, undefined, variant);
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<FortyThievesGame>;

/*
 * Maria and Limited are entries of their own rather than Forty Thieves variants
 * because they change the grid, not just the rules on it.
 */

const MARIA = {
  id: "maria" as const,
  name: "Maria",
  marker: "MA",
  options: [],
  layout: MARIA_LAYOUT,
  create: () => {
    const game = new FortyThievesGame(
      undefined,
      undefined,
      FortyThievesVariant.MARIA,
    );
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<FortyThievesGame>;

const LIMITED = {
  id: "limited" as const,
  name: "Limited",
  marker: "LI",
  options: [],
  layout: LIMITED_LAYOUT,
  create: () => {
    const game = new FortyThievesGame(
      undefined,
      undefined,
      FortyThievesVariant.LIMITED,
    );
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<FortyThievesGame>;

const MONTANA = {
  id: "montana" as const,
  name: "Montana",
  marker: "MO",
  options: [],
  layout: MONTANA_LAYOUT,
  create: () => {
    const game = new MontanaGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<MontanaGame>;

const DOUBLE_KLONDIKE = {
  id: "doubleklondike" as const,
  name: "Double Klondike",
  marker: "DK",
  options: [],
  layout: DOUBLE_KLONDIKE_LAYOUT,
  create: () => {
    const game = new DoubleKlondikeGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<DoubleKlondikeGame>;

const EASTHAVEN = {
  id: "easthaven" as const,
  name: "Easthaven",
  marker: "EH",
  options: [],
  layout: EASTHAVEN_LAYOUT,
  create: () => {
    const game = new EasthavenGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<EasthavenGame>;

/** Which of the Spiderette pair to deal. */
const SPIDERETTE_VARIANT: GameOptionSpec = {
  id: "variant",
  label: "Deal",
  description:
    "Will o' the Wisp deals a flat three cards to every column instead of Klondike's staircase, burying fewer cards but leaving more in the stock.",
  choices: [
    { value: SpideretteVariant.SPIDERETTE, label: "Spiderette" },
    { value: SpideretteVariant.WILL_O_THE_WISP, label: "Will o' the Wisp" },
  ],
  defaultValue: SpideretteVariant.SPIDERETTE,
};

const SPIDERETTE = {
  id: "spiderette" as const,
  name: "Spiderette",
  marker: "SD",
  options: [SPIDERETTE_VARIANT],
  layout: SPIDERETTE_LAYOUT,
  create: (values: GameOptionValues) => {
    const variant = optionValue(
      values,
      SPIDERETTE_VARIANT,
    ) as SpideretteVariant;
    const game = new SpideretteGame(undefined, undefined, variant);
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SpideretteGame>;

/**
 * Every game the application can put on the table, in the order they are
 * offered, as a tuple so each entry keeps its id and game type.
 *
 * {@link GAME_CATALOG} is the same list under the erased type most callers
 * want.
 */
export const CATALOG_ENTRIES = [
  KLONDIKE,
  FREECELL,
  SPIDER,
  YUKON,
  BAKERS,
  EIGHT_OFF,
  SCORPION,
  SIMPLE_SIMON,
  BAKERS_DOZEN,
  SEAHAVEN,
  SPIDERETTE,
  EASTHAVEN,
  FORTY_THIEVES,
  MARIA,
  LIMITED,
  DOUBLE_KLONDIKE,
  MONTANA,
] as const;

/** Every game the application can put on the table. */
export const GAME_CATALOG: readonly CatalogEntry[] = CATALOG_ENTRIES;

/** Names one of the entries, with its id and dealt game type intact. */
export type KnownCatalogEntry = (typeof CATALOG_ENTRIES)[number];

/** Names a game in the catalog by its id. */
export type GameId = KnownCatalogEntry["id"];

/** Resolves to the game type a given entry deals. */
export type GameOf<Id extends GameId> = ReturnType<
  Extract<KnownCatalogEntry, { id: Id }>["create"]
>["game"];

/** Returns the catalog entry with the given id, or the first one. */
export function catalogEntry(id: string | null | undefined): CatalogEntry {
  return GAME_CATALOG.find((entry) => entry.id === id) ?? GAME_CATALOG[0];
}
