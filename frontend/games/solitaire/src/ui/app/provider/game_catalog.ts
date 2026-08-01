import { PlayableGame } from "@/engine/tableau/playable_game";
import { deckCardIds } from "@/engine/core/card/deck";
import { GameSettings } from "@/games/klondike/game_settings";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { SpiderGame } from "@/games/spider/spider_game";
import { SpiderSuitCount, spiderDeck } from "@/games/spider/spider_deal";
import { YukonGame } from "@/games/yukon/yukon_game";
import { YukonVariant } from "@/games/yukon/yukon_rules";

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

/** A game the application can put on the table. */
export interface CatalogEntry {
  /** Stable id, also the URL fragment that selects it. */
  readonly id: string;
  /** Name shown to a player. */
  readonly name: string;
  /** The rules this game lets the player choose. */
  readonly options: readonly GameOptionSpec[];
  /** Creates a dealt game playing by the given options. */
  create(values: GameOptionValues): CatalogSession;
}

/** A dealt game. */
export interface CatalogSession {
  readonly game: PlayableGame;
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

/**
 * Every game the engine can currently put on the table.
 *
 * An entry is: what it is called, which rules it lets the player choose, and
 * how to deal one. Everything else — the rules themselves, the layout, the
 * gestures — the game module already declared.
 */
export const GAME_CATALOG: readonly CatalogEntry[] = [
  {
    id: "klondike",
    name: "Klondike",
    options: [KLONDIKE_DRAW_COUNT, KLONDIKE_ALMOST_WIN],
    create: (values) => {
      const settings = new GameSettings();
      settings.setDrawCount(
        optionValue(values, KLONDIKE_DRAW_COUNT) === 1 ? 1 : 3,
      );
      settings.debug.setAlmostWin(
        optionValue(values, KLONDIKE_ALMOST_WIN) === 1,
      );
      const game = new KlondikeGame(undefined, undefined, settings);
      game.startNewGame();
      return { game };
    },
  },
  {
    id: "freecell",
    name: "FreeCell",
    // FreeCell has no rules to choose: no stock, no draw mode, no variants.
    options: [],
    create: () => {
      const game = new FreeCellGame();
      game.startNewGame();
      return { game };
    },
  },
  {
    id: "spider",
    name: "Spider",
    options: [SPIDER_SUIT_COUNT],
    create: (values) => {
      const suitCount = optionValue(
        values,
        SPIDER_SUIT_COUNT,
      ) as SpiderSuitCount;
      const game = new SpiderGame(deckCardIds(spiderDeck(suitCount)));
      game.startNewGame();
      return { game };
    },
  },
  {
    id: "yukon",
    name: "Yukon",
    // One entry for three games: they share a deal, a board and a grab rule,
    // and differ only in what an occupied column accepts, which is a rule a
    // player picks rather than a game they switch to.
    options: [YUKON_VARIANT],
    create: (values) => {
      const variant = optionValue(values, YUKON_VARIANT) as YukonVariant;
      const game = new YukonGame(undefined, undefined, variant);
      game.startNewGame();
      return { game };
    },
  },
];

/** The catalog entry with the given id, or the first one. */
export function catalogEntry(id: string | null | undefined): CatalogEntry {
  return GAME_CATALOG.find((entry) => entry.id === id) ?? GAME_CATALOG[0];
}
