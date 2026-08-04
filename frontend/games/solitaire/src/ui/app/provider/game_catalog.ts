import { PlayableGame } from "@/engine/tableau/playable_game";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { deckCardIds } from "@/engine/core/card/deck";
import { KlondikeSettings } from "@/games/klondike/klondike_settings";
import { KlondikeGame } from "@/games/klondike/klondike_game";
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
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import { SPIDERETTE_LAYOUT } from "@/games/spiderette/spiderette_layout";

/** A value a rule option can be set to, and how to name it to a player. */
export interface GameOptionChoice {
  /** The stored value. Kept primitive so it round-trips through storage. */
  readonly value: number;
  /** What the choice is called. */
  readonly label: string;
}

/**
 * A rule a game lets the player choose.
 *
 * Declared as data rather than as named fields on a shared interface. The
 * interface used to have a `drawCount` and an `almostWin` on it, which is
 * Klondike's vocabulary in a place meant to serve every game — and it would
 * have grown a `suitCount` for Spider, then one field per option per game
 * forever. A game now says what it offers and the settings panel renders it.
 */
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

/** The chosen value of each option, by option id. */
export type GameOptionValues = Readonly<Record<string, number>>;

/**
 * A game the application can put on the table.
 *
 * Everything the application needs to know about a game that is not the game
 * itself: what to call it, which rules it offers, the grid it lies on, and how
 * to deal one. The layout used to live in a second registry keyed by the same
 * id, which meant adding a game meant remembering to edit both.
 *
 * Generic in the game it deals so the board registry can be checked against
 * it: a board that draws Spider cannot be registered against the entry that
 * deals Klondike.
 */
export interface CatalogEntry<TGame extends PlayableGame = PlayableGame> {
  /** Stable id, also the URL fragment that selects it. */
  readonly id: string;
  /** Name shown to a player. */
  readonly name: string;
  /**
   * Two characters standing for the game in a collapsed game rail.
   *
   * Stated rather than sliced off the front of the name, which is what the rail
   * used to do: Spider and Scorpion both start with S, so two of the seven
   * games wore the same badge, and F, B and E say nothing about which of
   * FreeCell, Baker's Game and Eight Off is meant. Two characters is what a
   * collapsed rail has room for, and it is enough to tell all seven apart.
   */
  readonly marker: string;
  /** The rules this game lets the player choose. */
  readonly options: readonly GameOptionSpec[];
  /** The grid this game's board lies on, renderer-agnostic. */
  readonly layout: TableLayoutSpec;
  /** Creates a dealt game playing by the given options. */
  create(values: GameOptionValues): CatalogSession<TGame>;
}

/** A dealt game. */
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

/**
 * Which of the Yukon family to deal.
 *
 * The values are the {@link YukonVariant} members themselves rather than a
 * parallel list of numbers, so the choices a player is offered and the games
 * they select cannot drift apart.
 */
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
 * The entries.
 *
 * Declared with `satisfies` rather than an explicit annotation so each keeps
 * its literal id and its concrete game type: that is what lets the board
 * registry be checked against this one instead of dispatching on `instanceof`
 * at runtime.
 */

const KLONDIKE = {
  id: "klondike" as const,
  name: "Klondike",
  marker: "KL",
  options: [KLONDIKE_DRAW_COUNT, KLONDIKE_ALMOST_WIN],
  layout: KLONDIKE_LAYOUT,
  create: (values: GameOptionValues) => {
    const settings = new KlondikeSettings(
      optionValue(values, KLONDIKE_DRAW_COUNT) === 1 ? 1 : 3,
    );
    const game = new KlondikeGame(undefined, undefined, settings);
    game.almostWin = optionValue(values, KLONDIKE_ALMOST_WIN) === 1;
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<KlondikeGame>;

const FREECELL = {
  id: "freecell" as const,
  name: "FreeCell",
  marker: "FC",
  // FreeCell has no rules to choose: no stock, no draw mode, no options.
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
  // One entry for three games: they share a deal, a board and a grab rule,
  // and differ only in what an occupied column accepts, which is a rule a
  // player picks rather than a game they switch to.
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
  // The same board as FreeCell, which it shares a layout with.
  layout: FREECELL_LAYOUT,
  // The same class as FreeCell, playing by a different set of column rules.
  // Historically the derivation runs this way round — FreeCell was built from
  // Baker's Game — but the code has to pick one of them to be the module.
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
  // Nothing to choose: no stock, no draw mode, and the cell count is the
  // name of the game.
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
  // Nothing to choose: one deck, one deal, and a stock that empties itself in
  // a single press.
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
  // Nothing to choose: one deck, one deal, and no stock to draw from.
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
  // Nothing to choose: one deck, one deal, no stock, and the column count is
  // the name of the game.
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
  // Nothing to choose: one deck, one deal, and the cell count is fixed at the
  // four that make the game what it is.
  options: [],
  layout: SEAHAVEN_LAYOUT,
  create: () => {
    const game = new SeahavenGame();
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SeahavenGame>;

/**
 * Which of the Spiderette pair to deal.
 *
 * The values are the {@link SpideretteVariant} members themselves rather than a
 * parallel list of numbers, so the choices a player is offered and the games
 * they select cannot drift apart — the same arrangement the Yukon option uses.
 */
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
  // One entry for both: they share a board, a build rule, a grab rule and a
  // stock, and differ only in the opening deal — a rule a player picks rather
  // than a game they switch to.
  options: [SPIDERETTE_VARIANT],
  layout: SPIDERETTE_LAYOUT,
  create: (values: GameOptionValues) => {
    const variant = optionValue(values, SPIDERETTE_VARIANT) as SpideretteVariant;
    const game = new SpideretteGame(undefined, undefined, variant);
    game.startNewGame();
    return { game };
  },
} satisfies CatalogEntry<SpideretteGame>;

/**
 * Every game the engine can currently put on the table, in the order they are
 * offered.
 *
 * Typed as the tuple of its entries rather than as `CatalogEntry[]` so the ids
 * and the dealt game types survive. {@link GAME_CATALOG} is the same list
 * under the erased type most callers want.
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
] as const;

/** Every game the application can put on the table. */
export const GAME_CATALOG: readonly CatalogEntry[] = CATALOG_ENTRIES;

/** One of the entries, with its id and dealt game type intact. */
export type KnownCatalogEntry = (typeof CATALOG_ENTRIES)[number];

/** The id of a game in the catalog. */
export type GameId = KnownCatalogEntry["id"];

/** The game type a given entry deals. */
export type GameOf<Id extends GameId> = ReturnType<
  Extract<KnownCatalogEntry, { id: Id }>["create"]
>["game"];

/** The catalog entry with the given id, or the first one. */
export function catalogEntry(id: string | null | undefined): CatalogEntry {
  return GAME_CATALOG.find((entry) => entry.id === id) ?? GAME_CATALOG[0];
}
