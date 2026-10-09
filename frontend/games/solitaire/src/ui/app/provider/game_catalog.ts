import { PlayableGame } from "@/engine/tableau/playable_game";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import {
  ArrangedLayouts,
  BoardLayouts,
} from "@/engine/render/layout/board_layouts";
import { deckCardIds } from "@/engine/core/card/deck";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import {
  DEFAULT_DRAW_COUNT,
  DrawCount,
  KlondikeVariant,
} from "@/games/klondike/klondike_rules";
import {
  KLONDIKE_ARRANGED_LAYOUTS,
  KLONDIKE_LAYOUT,
} from "@/games/klondike/klondike_layout";
import {
  KlondikeScoring,
  klondikeScoringPolicy,
} from "@/games/klondike/scoring_policy";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { FreeCellVariant } from "@/games/freecell/freecell_rules";
import {
  FREECELL_ARRANGED_LAYOUTS,
  FREECELL_LAYOUT,
} from "@/games/freecell/freecell_layout";
import { SpiderGame } from "@/games/spider/spider_game";
import { SpiderSuitCount, spiderDeck } from "@/games/spider/spider_deal";
import {
  SPIDER_ARRANGED_LAYOUTS,
  SPIDER_LAYOUT,
} from "@/games/spider/spider_layout";
import { YukonGame } from "@/games/yukon/yukon_game";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import {
  YUKON_ARRANGED_LAYOUTS,
  YUKON_LAYOUT,
} from "@/games/yukon/yukon_layout";
import { EightOffGame } from "@/games/eight_off/eight_off_game";
import { EIGHT_OFF_LAYOUT } from "@/games/eight_off/eight_off_layout";
import { ScorpionGame } from "@/games/scorpion/scorpion_game";
import { ScorpionVariant } from "@/games/scorpion/scorpion_rules";
import {
  SCORPION_ARRANGED_LAYOUTS,
  SCORPION_LAYOUT,
} from "@/games/scorpion/scorpion_layout";
import { SimpleSimonGame } from "@/games/simple_simon/simple_simon_game";
import { SimpleSimonVariant } from "@/games/simple_simon/simple_simon_rules";
import {
  MRS_MOP_ARRANGED_LAYOUTS,
  MRS_MOP_LAYOUT,
  SIMPLE_SIMON_ARRANGED_LAYOUTS,
  SIMPLE_SIMON_LAYOUT,
} from "@/games/simple_simon/simple_simon_layout";
import { BakersDozenGame } from "@/games/bakers_dozen/bakers_dozen_game";
import {
  BAKERS_DOZEN_ARRANGED_LAYOUTS,
  BAKERS_DOZEN_LAYOUT,
} from "@/games/bakers_dozen/bakers_dozen_layout";
import { SeahavenGame } from "@/games/seahaven/seahaven_game";
import {
  SEAHAVEN_ARRANGED_LAYOUTS,
  SEAHAVEN_LAYOUT,
} from "@/games/seahaven/seahaven_layout";
import { FortyThievesGame } from "@/games/forty_thieves/forty_thieves_game";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import {
  FORTY_THIEVES_ARRANGED_LAYOUTS,
  FORTY_THIEVES_LAYOUT,
  LIMITED_ARRANGED_LAYOUTS,
  LIMITED_LAYOUT,
  LUCAS_ARRANGED_LAYOUTS,
  LUCAS_LAYOUT,
  MARIA_ARRANGED_LAYOUTS,
  MARIA_LAYOUT,
} from "@/games/forty_thieves/forty_thieves_layout";
import { MontanaGame } from "@/games/montana/montana_game";
import {
  BLUE_MOON_LAYOUT,
  MONTANA_LAYOUT,
} from "@/games/montana/montana_layout";
import {
  DEFAULT_MAX_REDEALS,
  MaxRedeals,
  MontanaVariant,
} from "@/games/montana/montana_rules";
import { DoubleKlondikeGame } from "@/games/double_klondike/double_klondike_game";
import { DOUBLE_KLONDIKE_LAYOUT } from "@/games/double_klondike/double_klondike_layout";
import { EasthavenGame } from "@/games/easthaven/easthaven_game";
import {
  EASTHAVEN_ARRANGED_LAYOUTS,
  EASTHAVEN_LAYOUT,
} from "@/games/easthaven/easthaven_layout";
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import {
  SPIDERETTE_ARRANGED_LAYOUTS,
  SPIDERETTE_LAYOUT,
} from "@/games/spiderette/spiderette_layout";
import { BisleyGame } from "@/games/bisley/bisley_game";
import { BISLEY_LAYOUT } from "@/games/bisley/bisley_layout";
import { AcesUpGame } from "@/games/aces_up/aces_up_game";
import { ACES_UP_LAYOUT } from "@/games/aces_up/aces_up_layout";
import {
  AcesUpSpaces,
  DEFAULT_ACES_UP_SPACES,
} from "@/games/aces_up/aces_up_rules";
import { GolfGame } from "@/games/golf/golf_game";
import { GOLF_ARRANGED_LAYOUTS, GOLF_LAYOUT } from "@/games/golf/golf_layout";
import { DEFAULT_GOLF_VARIANT, GolfVariant } from "@/games/golf/golf_rules";
import { CalculationGame } from "@/games/calculation/calculation_game";
import { CALCULATION_LAYOUT } from "@/games/calculation/calculation_layout";
import {
  CalculationVariant,
  DEFAULT_CALCULATION_VARIANT,
} from "@/games/calculation/calculation_rules";
import { FlowerGardenGame } from "@/games/flower_garden/flower_garden_game";
import { FLOWER_GARDEN_LAYOUT } from "@/games/flower_garden/flower_garden_layout";
import { BristolGame } from "@/games/bristol/bristol_game";
import {
  BRISTOL_ARRANGED_LAYOUTS,
  BRISTOL_LAYOUT,
} from "@/games/bristol/bristol_layout";
import {
  BristolVariant,
  DEFAULT_BRISTOL_VARIANT,
} from "@/games/bristol/bristol_rules";
import { NestorGame } from "@/games/nestor/nestor_game";
import {
  NESTOR_ARRANGED_LAYOUTS,
  NESTOR_LAYOUT,
} from "@/games/nestor/nestor_layout";
import { MonteCarloGame } from "@/games/monte_carlo/monte_carlo_game";
import { MONTE_CARLO_LAYOUT } from "@/games/monte_carlo/monte_carlo_layout";
import {
  DEFAULT_MONTE_CARLO_VARIANT,
  MonteCarloVariant,
} from "@/games/monte_carlo/monte_carlo_rules";
import { LaBelleLucieGame } from "@/games/la_belle_lucie/la_belle_lucie_game";
import {
  LA_BELLE_LUCIE_LAYOUT,
  TREFOIL_LAYOUT,
} from "@/games/la_belle_lucie/la_belle_lucie_layout";
import {
  DEFAULT_LA_BELLE_LUCIE_VARIANT,
  LaBelleLucieVariant,
} from "@/games/la_belle_lucie/la_belle_lucie_rules";
import { CanfieldGame } from "@/games/canfield/canfield_game";
import { CANFIELD_LAYOUT } from "@/games/canfield/canfield_layout";
import {
  CanfieldVariant,
  DEFAULT_CANFIELD_VARIANT,
} from "@/games/canfield/canfield_rules";
import { PenguinGame } from "@/games/penguin/penguin_game";
import { PENGUIN_LAYOUT } from "@/games/penguin/penguin_layout";
import { BlackHoleGame } from "@/games/black_hole/black_hole_game";
import {
  ALL_IN_A_ROW_LAYOUT,
  BLACK_HOLE_LAYOUT,
} from "@/games/black_hole/black_hole_layout";
import { BlackHoleVariant } from "@/games/black_hole/black_hole_rules";
import { GrandfathersClockGame } from "@/games/grandfathers_clock/grandfathers_clock_game";
import { GRANDFATHERS_CLOCK_LAYOUT } from "@/games/grandfathers_clock/grandfathers_clock_layout";
import { PyramidGame } from "@/games/pyramid/pyramid_game";
import { PYRAMID_LAYOUT } from "@/games/pyramid/pyramid_layout";
import {
  DEFAULT_PYRAMID_GOAL,
  DEFAULT_PYRAMID_PASSES,
  PyramidGoal,
  PyramidPasses,
} from "@/games/pyramid/pyramid_rules";
import { TriPeaksGame } from "@/games/tri_peaks/tri_peaks_game";
import { TRI_PEAKS_LAYOUT } from "@/games/tri_peaks/tri_peaks_layout";
import { CastleGame } from "@/games/beleaguered_castle/castle_game";
import {
  BELEAGUERED_CASTLE_LAYOUT,
  FORTRESS_LAYOUT,
} from "@/games/beleaguered_castle/castle_layout";
import {
  CastleVariant,
  DEFAULT_CASTLE_VARIANT,
} from "@/games/beleaguered_castle/castle_rules";
import { PokerSquaresGame } from "@/games/poker_squares/poker_squares_game";
import { POKER_SQUARES_LAYOUT } from "@/games/poker_squares/poker_squares_layout";
import {
  DEFAULT_POKER_SQUARES_SCORING,
  PokerSquaresScoring,
} from "@/games/poker_squares/poker_squares_rules";

/**
 * Describes a value a rule option can take, and its name for a player.
 *
 * @template T The rule the game is handed, such as one of its variants.
 */
export interface GameOptionChoice<T = unknown> {
  /**
   * The number the choice is stored as, kept primitive so it round-trips
   * through storage, and kept stable so a saved preference still finds it.
   */
  readonly value: number;
  /** What the game is handed when this is chosen. */
  readonly rule: T;
  /** What the choice is called. */
  readonly label: string;
  /** What choosing it does, in a line, shown when the option is a list. */
  readonly description?: string;
}

/**
 * Describes a rule a game lets the player choose.
 *
 * @template T The rule the game is handed, which {@link optionRule} reads, so a
 *   game gets its own variant type while storage keeps a number.
 */
export interface GameOptionSpec<T = unknown> {
  /** Stable id, used for storage and for setting the value. */
  readonly id: string;
  /** What the option is called. */
  readonly label: string;
  /** A sentence explaining what choosing differently does. */
  readonly description?: string;
  /** The values on offer, in the order they are shown. */
  readonly choices: readonly GameOptionChoice<T>[];
  /**
   * How the choices are offered: side by side, or one to a row with each
   * choice's description in place of the option's.
   *
   * A list is for choices too many or too long to share a 320px row.
   */
  readonly control?: "segmented" | "list";
  /** The stored value used when the player has expressed no preference. */
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
  /** The rules this game lets the player choose. */
  readonly options: readonly GameOptionSpec[];
  /** The grid this game's board lies on, renderer-agnostic. */
  readonly layout: TableLayoutSpec;
  /**
   * How a player may arrange this game's board, on every shape of screen; a
   * game without it lies on {@link layout} everywhere.
   */
  readonly arrangement?: CatalogArrangement;
  /** Creates a dealt game playing by the given options. */
  create(values: GameOptionValues): CatalogSession<TGame>;
}

/**
 * Describes the grids a game's board lies on in every arrangement, and what the
 * settings drawer calls the piles the arrangement moves.
 */
export interface CatalogArrangement {
  /** The grids, on every shape of screen. */
  readonly layouts: ArrangedLayouts;
  /**
   * The piles that go at the top or the bottom, as a player calls them after
   * "the", such as "stock and foundations".
   */
  readonly pilesName: string;
  /**
   * The pile the side setting places, as a player calls it after "the", such
   * as "stock" or "free cells"; given exactly when the grids name a side pile.
   */
  readonly sideName?: string;
}

/** Holds a dealt game. */
export interface CatalogSession<TGame extends PlayableGame = PlayableGame> {
  readonly game: TGame;
}

/** Reads an option's stored value, falling back to its default. */
export function optionValue(
  values: GameOptionValues,
  spec: GameOptionSpec,
): number {
  const chosen = spec.choices.find(
    (choice) => choice.value === values[spec.id],
  );
  return chosen ? chosen.value : spec.defaultValue;
}

/** Reads the rule an option hands its game, falling back to its default. */
export function optionRule<T>(
  values: GameOptionValues,
  spec: GameOptionSpec<T>,
): T {
  const value = optionValue(values, spec);
  const chosen = spec.choices.find((choice) => choice.value === value);
  if (!chosen) throw new Error(`The option "${spec.id}" has no default.`);
  return chosen.rule;
}

/**
 * Builds an option whose stored default is the choice handing the game its own
 * default rule, so the two cannot disagree.
 *
 * @throws Error when no choice hands the game that rule.
 */
function gameOption<T>(
  spec: Omit<GameOptionSpec<T>, "defaultValue"> & { readonly defaultRule: T },
): GameOptionSpec<T> {
  const { defaultRule, ...rest } = spec;
  const fallback = spec.choices.find((choice) => choice.rule === defaultRule);
  if (!fallback) {
    throw new Error(`The option "${spec.id}" does not offer its default.`);
  }
  return { ...rest, defaultValue: fallback.value };
}

/** Returns whether two sets of rule values agree on every rule. */
export function sameOptionValues(
  a: GameOptionValues,
  b: GameOptionValues,
): boolean {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...ids].every((id) => a[id] === b[id]);
}

/** Deals a game and holds it as a session. */
function dealt<TGame extends PlayableGame>(game: TGame): CatalogSession<TGame> {
  game.startNewGame();
  return { game };
}

const KLONDIKE_DRAW_COUNT = gameOption<DrawCount>({
  id: "drawCount",
  label: "Draw Mode",
  description: "Draw 1 is easier; Draw 3 is the standard Solitaire challenge.",
  choices: [
    { value: 1, rule: 1, label: "Draw 1" },
    { value: 3, rule: 3, label: "Draw 3" },
  ],
  defaultRule: DEFAULT_DRAW_COUNT,
});

const KLONDIKE_SCORING = gameOption<KlondikeScoring>({
  id: "scoring",
  label: "Scoring",
  description:
    "Vegas buys the deck for $52 and pays $5 for every card on a foundation, but allows only one pass through the stock in Draw 1 and three in Draw 3.",
  choices: [
    { value: 0, rule: KlondikeScoring.STANDARD, label: "Standard" },
    { value: 1, rule: KlondikeScoring.VEGAS, label: "Vegas" },
  ],
  defaultRule: KlondikeScoring.STANDARD,
});

const KLONDIKE_ALMOST_WIN = gameOption<number>({
  id: "almostWin",
  label: "Almost Win Mode",
  description:
    "Pre-populates foundations so that dragging the remaining Kings will win the game.",
  choices: [
    { value: 0, rule: 0, label: "Normal" },
    { value: 1, rule: 1, label: "Almost Win" },
  ],
  defaultRule: 0,
  debugOnly: true,
});

const BAKERS_EMPTY_COLUMNS = gameOption<number>({
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Kings Only is the harder variant: it also caps how many cards move at once, because a run can no longer be staged in an empty column.",
  choices: [
    { value: 0, rule: 0, label: "Any Card" },
    { value: 1, rule: 1, label: "Kings Only" },
  ],
  defaultRule: 0,
});

const CHALLENGE_EMPTY_COLUMNS = gameOption<number>({
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Kings Only is Super Challenge FreeCell: it also caps how many cards move at once, because a run can no longer be staged in an empty column.",
  choices: [
    { value: 0, rule: 0, label: "Any Card" },
    { value: 1, rule: 1, label: "Kings Only" },
  ],
  defaultRule: 0,
});

const SPIDER_SUIT_COUNT = gameOption<SpiderSuitCount>({
  id: "suitCount",
  label: "Suits",
  description:
    "Always 104 cards — fewer suits means more copies of each, and a far gentler game.",
  choices: [
    { value: 1, rule: 1, label: "1 Suit" },
    { value: 2, rule: 2, label: "2 Suits" },
    { value: 4, rule: 4, label: "4 Suits" },
  ],
  defaultRule: 4,
});

/** Which of the Yukon family to deal. */
const YUKON_VARIANT = gameOption<YukonVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Alaska and Russian Solitaire deal like Yukon but build the columns by suit rather than by alternating color; Moosehide lets a card land on any suit but its own.",
  choices: [
    {
      value: 0,
      rule: YukonVariant.YUKON,
      label: "Yukon",
      description: "Build down in alternating colours.",
    },
    {
      value: 1,
      rule: YukonVariant.ALASKA,
      label: "Alaska",
      description: "Build up or down in suit.",
    },
    {
      value: 2,
      rule: YukonVariant.RUSSIAN,
      label: "Russian Solitaire",
      description: "Build down in suit; the hardest of the four.",
    },
    {
      value: 3,
      rule: YukonVariant.MOOSEHIDE,
      label: "Moosehide",
      description: "Build down on any suit but a card's own.",
    },
  ],
  control: "list",
  defaultRule: YukonVariant.YUKON,
});

/** Which of the Klondike family to deal. */
const KLONDIKE_VARIANT = gameOption<KlondikeVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Whitehead deals every card face-up and builds in one colour; Thumb and Pouch lets a card land on any suit but its own. Both let any card fill an empty column. Saratoga is Klondike with every column card dealt face-up.",
  choices: [
    {
      value: 0,
      rule: KlondikeVariant.KLONDIKE,
      label: "Klondike",
      description:
        "Build down in alternating colours; only a King fills an empty column.",
    },
    {
      value: 1,
      rule: KlondikeVariant.WHITEHEAD,
      label: "Whitehead",
      description:
        "Every card face-up, building down in one colour; any card fills an empty column.",
    },
    {
      value: 2,
      rule: KlondikeVariant.THUMB_AND_POUCH,
      label: "Thumb and Pouch",
      description:
        "Build on any suit but a card's own; any card fills an empty column.",
    },
    {
      value: 3,
      rule: KlondikeVariant.SARATOGA,
      label: "Saratoga",
      description: "Klondike with every column card dealt face-up.",
    },
  ],
  control: "list",
  defaultRule: KlondikeVariant.KLONDIKE,
});

/** Which of the Forty Thieves family to deal. */
const FORTY_THIEVES_VARIANT = gameOption<FortyThievesVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Josephine lets same-suit runs move as a unit; Rank and File builds in alternating colours but buries three of every four cards. Indian deals three to a column and builds on any other suit; Number Ten buries two of four and builds in alternating colours.",
  choices: [
    {
      value: 0,
      rule: FortyThievesVariant.FORTY_THIEVES,
      label: "Forty Thieves",
      description: "Build down in suit, one card at a time.",
    },
    {
      value: 1,
      rule: FortyThievesVariant.JOSEPHINE,
      label: "Josephine",
      description: "Build down in suit, and move a same-suit run as a unit.",
    },
    {
      value: 2,
      rule: FortyThievesVariant.RANK_AND_FILE,
      label: "Rank and File",
      description:
        "Alternating colours and runs, but three in four cards dealt face-down.",
    },
    {
      value: 5,
      rule: FortyThievesVariant.INDIAN,
      label: "Indian",
      description:
        "Three cards to a column, building on any suit but a card's own.",
    },
    {
      value: 6,
      rule: FortyThievesVariant.NUMBER_TEN,
      label: "Number Ten",
      description:
        "Alternating colours and runs, with half the deal face-down.",
    },
  ],
  control: "list",
  defaultRule: FortyThievesVariant.FORTY_THIEVES,
});

/** Which of the Scorpion family to deal. */
const SCORPION_VARIANT = gameOption<ScorpionVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Wasp lets any card or run fill an empty column; Scorpion II buries cards in only the first three columns.",
  choices: [
    {
      value: 0,
      rule: ScorpionVariant.SCORPION,
      label: "Scorpion",
      description:
        "Only a King fills an empty column; four columns hide three cards.",
    },
    {
      value: 1,
      rule: ScorpionVariant.WASP,
      label: "Wasp",
      description: "Any card, with all it carries, fills an empty column.",
    },
    {
      value: 2,
      rule: ScorpionVariant.SCORPION_II,
      label: "Scorpion II",
      description: "Only the first three columns hide cards.",
    },
  ],
  control: "list",
  defaultRule: ScorpionVariant.SCORPION,
});

/** How many redeals a Montana game allows. */
const MONTANA_REDEALS = gameOption<MaxRedeals>({
  id: "redeals",
  label: "Redeals",
  description:
    "Three redeals is the game called Addiction: one more chance to shuffle the stuck cards back out.",
  choices: [
    { value: 2, rule: 2, label: "2 Redeals" },
    { value: 3, rule: 3, label: "3 Redeals" },
  ],
  defaultRule: DEFAULT_MAX_REDEALS,
});

/** Which of the Moons to deal, which share a grid and differ in the deal. */
const MOON_DEAL = gameOption<MontanaVariant>({
  id: "variant",
  label: "Deal",
  description:
    "Red Moon deals the gaps right beside the Aces, so every row can start building at once; Blue Moon leaves them wherever the Aces fell.",
  choices: [
    {
      value: 1,
      rule: MontanaVariant.BLUE_MOON,
      label: "Blue Moon",
      description: "The gaps lie wherever the Aces were dealt.",
    },
    {
      value: 2,
      rule: MontanaVariant.RED_MOON,
      label: "Red Moon",
      description:
        "The gaps are dealt beside the Aces, so every row starts at once.",
    },
  ],
  control: "list",
  defaultRule: MontanaVariant.BLUE_MOON,
});

/** Which of the Spiderette pair to deal. */
const SPIDERETTE_VARIANT = gameOption<SpideretteVariant>({
  id: "variant",
  label: "Deal",
  description:
    "Will o' the Wisp deals a flat three cards to every column instead of Klondike's staircase, burying fewer cards but leaving more in the stock.",
  choices: [
    {
      value: 0,
      rule: SpideretteVariant.SPIDERETTE,
      label: "Spiderette",
      description:
        "Klondike's staircase of one to seven cards, with 24 in the stock.",
    },
    {
      value: 1,
      rule: SpideretteVariant.WILL_O_THE_WISP,
      label: "Will o' the Wisp",
      description:
        "Three cards to every column, burying fewer but leaving 31 in the stock.",
    },
  ],
  control: "list",
  defaultRule: SpideretteVariant.SPIDERETTE,
});

/** What may fill an empty column in Aces Up. */
const ACES_UP_SPACES = gameOption<AcesUpSpaces>({
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Aces Only is the harder game: a space can only take an Ace, so every other card has to wait for the discard.",
  choices: [
    { value: 0, rule: AcesUpSpaces.ANY_CARD, label: "Any Card" },
    { value: 1, rule: AcesUpSpaces.ACES_ONLY, label: "Aces Only" },
  ],
  defaultRule: DEFAULT_ACES_UP_SPACES,
});

/** Which of the Golf family to deal. */
const GOLF_VARIANT = gameOption<GolfVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Golf lets nothing onto a King; one house rule lets a Queen go there. Putt Putt turns the corner, so a King and an Ace are a rank apart both ways.",
  choices: [
    {
      value: 0,
      rule: GolfVariant.GOLF,
      label: "Golf",
      description:
        "Nothing goes on a King, so a King blocks until the next stock card.",
    },
    {
      value: 1,
      rule: GolfVariant.QUEENS_ON_KINGS,
      label: "Queens on Kings",
      description: "A Queen can go on a King, so a King no longer blocks.",
    },
    {
      value: 2,
      rule: GolfVariant.PUTT_PUTT,
      label: "Putt Putt",
      description:
        "The ranks turn the corner: a King takes an Ace, and an Ace a King.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_GOLF_VARIANT,
});

/** Which of the games on Calculation's board to deal. */
const CALCULATION_VARIANT = gameOption<CalculationVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Sir Tommy builds every foundation up by one from an Ace, which the player has to wait for, rather than by Calculation's four intervals.",
  choices: [
    {
      value: 0,
      rule: CalculationVariant.CALCULATION,
      label: "Calculation",
      description:
        "Foundations start on A, 2, 3 and 4, and build by ones, twos, threes and fours.",
    },
    {
      value: 1,
      rule: CalculationVariant.SIR_TOMMY,
      label: "Sir Tommy",
      description: "Each foundation starts on an Ace and builds up by one.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_CALCULATION_VARIANT,
});

/** Which of the games on Bristol's board to deal. */
const BRISTOL_VARIANT = gameOption<BristolVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Belvedere starts one foundation with an Ace, so there is somewhere to play from the first move.",
  choices: [
    {
      value: 0,
      rule: BristolVariant.BRISTOL,
      label: "Bristol",
      description: "Every foundation waits for an Ace to turn up.",
    },
    {
      value: 1,
      rule: BristolVariant.BELVEDERE,
      label: "Belvedere",
      description:
        "One Ace starts on a foundation, so there is a play from the first move.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_BRISTOL_VARIANT,
});

/** Which of the games on Monte Carlo's grid to deal. */
const MONTE_CARLO_VARIANT = gameOption<MonteCarloVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Thirteens pairs touching cards that add up to thirteen, and lets a King go on its own.",
  choices: [
    {
      value: 0,
      rule: MonteCarloVariant.MONTE_CARLO,
      label: "Monte Carlo",
      description: "Pair touching cards of the same rank.",
    },
    {
      value: 1,
      rule: MonteCarloVariant.THIRTEENS,
      label: "Thirteens",
      description:
        "Pair touching cards that add up to thirteen; a King goes alone.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_MONTE_CARLO_VARIANT,
});

/** Which of the games on La Belle Lucie's eighteen fans to deal. */
const LA_BELLE_LUCIE_VARIANT = gameOption<LaBelleLucieVariant>({
  id: "variant",
  label: "Variant",
  description:
    "The Fan lets a King fill an empty fan but allows no redeal; Shamrocks builds up or down in any suit, but never past three cards to a fan.",
  choices: [
    {
      value: 0,
      rule: LaBelleLucieVariant.LA_BELLE_LUCIE,
      label: "La Belle Lucie",
      description:
        "Build down in suit, with two redeals; empty fans stay empty.",
    },
    {
      value: 1,
      rule: LaBelleLucieVariant.THE_FAN,
      label: "The Fan",
      description: "Only a King fills an empty fan, and there is no redeal.",
    },
    {
      value: 2,
      rule: LaBelleLucieVariant.SHAMROCKS,
      label: "Shamrocks",
      description:
        "Build up or down in any suit, never past three cards; no redeal.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_LA_BELLE_LUCIE_VARIANT,
});

/** Which of the Canfield family to deal. */
const CANFIELD_VARIANT = gameOption<CanfieldVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Storehouse starts the foundations with the Twos and builds in suit; Superior Canfield deals the reserve face-up and leaves spaces for you to fill; Rainbow builds regardless of colour from a one-pass stock.",
  choices: [
    {
      value: 0,
      rule: CanfieldVariant.CANFIELD,
      label: "Canfield",
      description:
        "Alternating colours, with the stock drawn in threes and redealt freely.",
    },
    {
      value: 1,
      rule: CanfieldVariant.STOREHOUSE,
      label: "Storehouse",
      description:
        "The Twos start the foundations; build in suit, one card at a time.",
    },
    {
      value: 2,
      rule: CanfieldVariant.SUPERIOR,
      label: "Superior Canfield",
      description:
        "The reserve is dealt face-up, and you fill spaces yourself.",
    },
    {
      value: 3,
      rule: CanfieldVariant.RAINBOW,
      label: "Rainbow",
      description:
        "Build regardless of colour, one card at a time, with no redeal.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_CANFIELD_VARIANT,
});

/** When a game of Pyramid is won. */
const PYRAMID_GOAL = gameOption<PyramidGoal>({
  id: "goal",
  label: "Goal",
  description:
    "Pyramid Only is Relaxed Pyramid: clearing the pyramid wins, whatever is left in the stock and waste.",
  choices: [
    { value: 0, rule: PyramidGoal.ALL_CARDS, label: "All Cards" },
    {
      value: 1,
      rule: PyramidGoal.PYRAMID_ONLY,
      label: "Pyramid Only",
    },
  ],
  defaultRule: DEFAULT_PYRAMID_GOAL,
});

/** How many times Pyramid's stock may be gone through. */
const PYRAMID_PASSES = gameOption<PyramidPasses>({
  id: "passes",
  label: "Passes",
  description:
    "Three passes turns the waste back over twice, as Par Pyramid allows.",
  choices: [
    { value: 1, rule: 1, label: "1 Pass" },
    { value: 3, rule: 3, label: "3 Passes" },
  ],
  defaultRule: DEFAULT_PYRAMID_PASSES,
});

/** Which of the games on Beleaguered Castle's eight rows to deal. */
const CASTLE_VARIANT = gameOption<CastleVariant>({
  id: "variant",
  label: "Variant",
  description:
    "Streets and Alleys deals the Aces into the rows instead of the foundations; Citadel sends every card it can home while dealing.",
  choices: [
    {
      value: 0,
      rule: CastleVariant.BELEAGUERED_CASTLE,
      label: "Beleaguered Castle",
      description: "The Aces start on the foundations; six cards to a row.",
    },
    {
      value: 1,
      rule: CastleVariant.STREETS_AND_ALLEYS,
      label: "Streets and Alleys",
      description: "The Aces are shuffled in, and have to be dug out.",
    },
    {
      value: 2,
      rule: CastleVariant.CITADEL,
      label: "Citadel",
      description:
        "Cards go home as they are dealt, so the rows start shorter.",
    },
  ],
  control: "list",
  defaultRule: DEFAULT_CASTLE_VARIANT,
});

/** Which scoring Poker Squares counts its lines by. */
const POKER_SQUARES_SCORING = gameOption<PokerSquaresScoring>({
  id: "scoring",
  label: "Scoring",
  description:
    "American scoring pays most for flushes and wins at 200; English scoring pays more for a straight than a flush and wins at 70.",
  choices: [
    {
      value: 0,
      rule: PokerSquaresScoring.AMERICAN,
      label: "American",
    },
    { value: 1, rule: PokerSquaresScoring.ENGLISH, label: "English" },
  ],
  defaultRule: DEFAULT_POKER_SQUARES_SCORING,
});

/** How FreeCell, Baker's Game and Challenge FreeCell may be arranged. */
const FREECELL_ARRANGEMENT: CatalogArrangement = {
  layouts: FREECELL_ARRANGED_LAYOUTS,
  pilesName: "free cells and foundations",
  sideName: "free cells",
};

/*
 * The entries, each declared with `satisfies` so it keeps the literal id and
 * game type the board registry is checked against.
 */

const KLONDIKE = {
  id: "klondike" as const,
  name: "Klondike",
  options: [
    KLONDIKE_VARIANT,
    KLONDIKE_DRAW_COUNT,
    KLONDIKE_SCORING,
    KLONDIKE_ALMOST_WIN,
  ],
  layout: KLONDIKE_LAYOUT,
  arrangement: {
    layouts: KLONDIKE_ARRANGED_LAYOUTS,
    pilesName: "stock and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(
      new KlondikeGame({
        drawCount: optionRule(values, KLONDIKE_DRAW_COUNT),
        variant: optionRule(values, KLONDIKE_VARIANT),
        scoring: klondikeScoringPolicy(optionRule(values, KLONDIKE_SCORING)),
        almostWin: optionRule(values, KLONDIKE_ALMOST_WIN) === 1,
      }),
    ),
} satisfies CatalogEntry<KlondikeGame>;

const FREECELL = {
  id: "freecell" as const,
  name: "FreeCell",
  options: [],
  layout: FREECELL_LAYOUT,
  arrangement: FREECELL_ARRANGEMENT,
  create: () => dealt(new FreeCellGame()),
} satisfies CatalogEntry<FreeCellGame>;

const SPIDER = {
  id: "spider" as const,
  name: "Spider",
  options: [SPIDER_SUIT_COUNT],
  layout: SPIDER_LAYOUT,
  arrangement: {
    layouts: SPIDER_ARRANGED_LAYOUTS,
    pilesName: "stock and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(
      new SpiderGame({
        cardIds: deckCardIds(spiderDeck(optionRule(values, SPIDER_SUIT_COUNT))),
      }),
    ),
} satisfies CatalogEntry<SpiderGame>;

const YUKON = {
  id: "yukon" as const,
  name: "Yukon",
  options: [YUKON_VARIANT],
  layout: YUKON_LAYOUT,
  arrangement: { layouts: YUKON_ARRANGED_LAYOUTS, pilesName: "foundations" },
  create: (values: GameOptionValues) =>
    dealt(new YukonGame({ variant: optionRule(values, YUKON_VARIANT) })),
} satisfies CatalogEntry<YukonGame>;

const BAKERS = {
  id: "bakers" as const,
  name: "Baker's Game",
  options: [BAKERS_EMPTY_COLUMNS],
  layout: FREECELL_LAYOUT,
  arrangement: FREECELL_ARRANGEMENT,
  // FreeCell's class, playing by Baker's Game's column rules.
  create: (values: GameOptionValues) =>
    dealt(
      new FreeCellGame({
        variant:
          optionRule(values, BAKERS_EMPTY_COLUMNS) === 1
            ? FreeCellVariant.BAKERS_KINGS_ONLY
            : FreeCellVariant.BAKERS,
      }),
    ),
} satisfies CatalogEntry<FreeCellGame>;

/*
 * Challenge FreeCell is an entry of its own, as Baker's Game is, so that
 * FreeCell's entry can stay optionless.
 */

const CHALLENGE_FREECELL = {
  id: "challengefreecell" as const,
  name: "Challenge FreeCell",
  options: [CHALLENGE_EMPTY_COLUMNS],
  layout: FREECELL_LAYOUT,
  arrangement: FREECELL_ARRANGEMENT,
  create: (values: GameOptionValues) =>
    dealt(
      new FreeCellGame({
        variant:
          optionRule(values, CHALLENGE_EMPTY_COLUMNS) === 1
            ? FreeCellVariant.SUPER_CHALLENGE
            : FreeCellVariant.CHALLENGE,
      }),
    ),
} satisfies CatalogEntry<FreeCellGame>;

const EIGHT_OFF = {
  id: "eightoff" as const,
  name: "Eight Off",
  options: [],
  layout: EIGHT_OFF_LAYOUT,
  create: () => dealt(new EightOffGame()),
} satisfies CatalogEntry<EightOffGame>;

const SCORPION = {
  id: "scorpion" as const,
  name: "Scorpion",
  options: [SCORPION_VARIANT],
  layout: SCORPION_LAYOUT,
  arrangement: {
    layouts: SCORPION_ARRANGED_LAYOUTS,
    pilesName: "stock and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(new ScorpionGame({ variant: optionRule(values, SCORPION_VARIANT) })),
} satisfies CatalogEntry<ScorpionGame>;

const SIMPLE_SIMON = {
  id: "simplesimon" as const,
  name: "Simple Simon",
  options: [],
  layout: SIMPLE_SIMON_LAYOUT,
  arrangement: {
    layouts: SIMPLE_SIMON_ARRANGED_LAYOUTS,
    pilesName: "foundations",
  },
  create: () => dealt(new SimpleSimonGame()),
} satisfies CatalogEntry<SimpleSimonGame>;

/*
 * Mrs. Mop plays by Simple Simon's rules on a grid of its own, so it is an
 * entry of its own.
 */
const MRS_MOP = {
  id: "mrsmop" as const,
  name: "Mrs. Mop",
  options: [],
  layout: MRS_MOP_LAYOUT,
  arrangement: { layouts: MRS_MOP_ARRANGED_LAYOUTS, pilesName: "foundations" },
  create: () =>
    dealt(new SimpleSimonGame({ variant: SimpleSimonVariant.MRS_MOP })),
} satisfies CatalogEntry<SimpleSimonGame>;

const BAKERS_DOZEN = {
  id: "bakersdozen" as const,
  name: "Baker's Dozen",
  options: [],
  layout: BAKERS_DOZEN_LAYOUT,
  arrangement: {
    layouts: BAKERS_DOZEN_ARRANGED_LAYOUTS,
    pilesName: "foundations",
  },
  create: () => dealt(new BakersDozenGame()),
} satisfies CatalogEntry<BakersDozenGame>;

const SEAHAVEN = {
  id: "seahaven" as const,
  name: "Seahaven Towers",
  options: [],
  layout: SEAHAVEN_LAYOUT,
  arrangement: {
    layouts: SEAHAVEN_ARRANGED_LAYOUTS,
    pilesName: "cells and foundations",
    sideName: "cells",
  },
  create: () => dealt(new SeahavenGame()),
} satisfies CatalogEntry<SeahavenGame>;

const FORTY_THIEVES = {
  id: "fortythieves" as const,
  name: "Forty Thieves",
  options: [FORTY_THIEVES_VARIANT],
  layout: FORTY_THIEVES_LAYOUT,
  arrangement: {
    layouts: FORTY_THIEVES_ARRANGED_LAYOUTS,
    pilesName: "stock, waste and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(
      new FortyThievesGame({
        variant: optionRule(values, FORTY_THIEVES_VARIANT),
      }),
    ),
} satisfies CatalogEntry<FortyThievesGame>;

/*
 * Maria, Limited and Lucas are entries of their own rather than Forty Thieves
 * variants because they change the grid, not just the rules on it.
 */

const MARIA = {
  id: "maria" as const,
  name: "Maria",
  options: [],
  layout: MARIA_LAYOUT,
  arrangement: {
    layouts: MARIA_ARRANGED_LAYOUTS,
    pilesName: "stock, waste and foundations",
    sideName: "stock",
  },
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.MARIA })),
} satisfies CatalogEntry<FortyThievesGame>;

const LIMITED = {
  id: "limited" as const,
  name: "Limited",
  options: [],
  layout: LIMITED_LAYOUT,
  arrangement: {
    layouts: LIMITED_ARRANGED_LAYOUTS,
    pilesName: "stock, waste and foundations",
    sideName: "stock",
  },
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.LIMITED })),
} satisfies CatalogEntry<FortyThievesGame>;

const LUCAS = {
  id: "lucas" as const,
  name: "Lucas",
  options: [],
  layout: LUCAS_LAYOUT,
  arrangement: {
    layouts: LUCAS_ARRANGED_LAYOUTS,
    pilesName: "stock, waste and foundations",
    sideName: "stock",
  },
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.LUCAS })),
} satisfies CatalogEntry<FortyThievesGame>;

const MONTANA = {
  id: "montana" as const,
  name: "Montana",
  options: [MONTANA_REDEALS],
  layout: MONTANA_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new MontanaGame({ maxRedeals: optionRule(values, MONTANA_REDEALS) })),
} satisfies CatalogEntry<MontanaGame>;

/*
 * Blue Moon is an entry of its own because its grid is fourteen wide, not
 * Montana's thirteen. Red Moon shares its grid, so it is an option on it.
 */

const BLUE_MOON = {
  id: "bluemoon" as const,
  name: "Blue Moon",
  options: [MOON_DEAL],
  layout: BLUE_MOON_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new MontanaGame({ variant: optionRule(values, MOON_DEAL) })),
} satisfies CatalogEntry<MontanaGame>;

const DOUBLE_KLONDIKE = {
  id: "doubleklondike" as const,
  name: "Double Klondike",
  options: [],
  layout: DOUBLE_KLONDIKE_LAYOUT,
  create: () => dealt(new DoubleKlondikeGame()),
} satisfies CatalogEntry<DoubleKlondikeGame>;

const EASTHAVEN = {
  id: "easthaven" as const,
  name: "Easthaven",
  options: [],
  layout: EASTHAVEN_LAYOUT,
  arrangement: {
    layouts: EASTHAVEN_ARRANGED_LAYOUTS,
    pilesName: "stock and foundations",
    sideName: "stock",
  },
  create: () => dealt(new EasthavenGame()),
} satisfies CatalogEntry<EasthavenGame>;

const SPIDERETTE = {
  id: "spiderette" as const,
  name: "Spiderette",
  options: [SPIDERETTE_VARIANT],
  layout: SPIDERETTE_LAYOUT,
  arrangement: {
    layouts: SPIDERETTE_ARRANGED_LAYOUTS,
    pilesName: "stock and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(
      new SpideretteGame({ variant: optionRule(values, SPIDERETTE_VARIANT) }),
    ),
} satisfies CatalogEntry<SpideretteGame>;

const BISLEY = {
  id: "bisley" as const,
  name: "Bisley",
  options: [],
  layout: BISLEY_LAYOUT,
  create: () => dealt(new BisleyGame()),
} satisfies CatalogEntry<BisleyGame>;

const ACES_UP = {
  id: "acesup" as const,
  name: "Aces Up",
  options: [ACES_UP_SPACES],
  layout: ACES_UP_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new AcesUpGame({ spaces: optionRule(values, ACES_UP_SPACES) })),
} satisfies CatalogEntry<AcesUpGame>;

const GOLF = {
  id: "golf" as const,
  name: "Golf",
  options: [GOLF_VARIANT],
  layout: GOLF_LAYOUT,
  arrangement: {
    layouts: GOLF_ARRANGED_LAYOUTS,
    pilesName: "stock and foundation",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(new GolfGame({ variant: optionRule(values, GOLF_VARIANT) })),
} satisfies CatalogEntry<GolfGame>;

const CALCULATION = {
  id: "calculation" as const,
  name: "Calculation",
  options: [CALCULATION_VARIANT],
  layout: CALCULATION_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new CalculationGame({
        variant: optionRule(values, CALCULATION_VARIANT),
      }),
    ),
} satisfies CatalogEntry<CalculationGame>;

const FLOWER_GARDEN = {
  id: "flowergarden" as const,
  name: "Flower Garden",
  options: [],
  layout: FLOWER_GARDEN_LAYOUT,
  create: () => dealt(new FlowerGardenGame()),
} satisfies CatalogEntry<FlowerGardenGame>;

const BRISTOL = {
  id: "bristol" as const,
  name: "Bristol",
  options: [BRISTOL_VARIANT],
  layout: BRISTOL_LAYOUT,
  arrangement: {
    layouts: BRISTOL_ARRANGED_LAYOUTS,
    pilesName: "stock, reserves and foundations",
    sideName: "stock",
  },
  create: (values: GameOptionValues) =>
    dealt(new BristolGame({ variant: optionRule(values, BRISTOL_VARIANT) })),
} satisfies CatalogEntry<BristolGame>;

const NESTOR = {
  id: "nestor" as const,
  name: "Nestor",
  options: [],
  layout: NESTOR_LAYOUT,
  arrangement: {
    layouts: NESTOR_ARRANGED_LAYOUTS,
    pilesName: "reserve and discard",
    sideName: "reserve",
  },
  create: () => dealt(new NestorGame()),
} satisfies CatalogEntry<NestorGame>;

const MONTE_CARLO = {
  id: "montecarlo" as const,
  name: "Monte Carlo",
  options: [MONTE_CARLO_VARIANT],
  layout: MONTE_CARLO_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new MonteCarloGame({ variant: optionRule(values, MONTE_CARLO_VARIANT) }),
    ),
} satisfies CatalogEntry<MonteCarloGame>;

const LA_BELLE_LUCIE = {
  id: "labellelucie" as const,
  name: "La Belle Lucie",
  options: [LA_BELLE_LUCIE_VARIANT],
  layout: LA_BELLE_LUCIE_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new LaBelleLucieGame({
        variant: optionRule(values, LA_BELLE_LUCIE_VARIANT),
      }),
    ),
} satisfies CatalogEntry<LaBelleLucieGame>;

/*
 * Trefoil plays by La Belle Lucie's rules on sixteen fans, a grid of its own,
 * so it is an entry of its own.
 */
const TREFOIL = {
  id: "trefoil" as const,
  name: "Trefoil",
  options: [],
  layout: TREFOIL_LAYOUT,
  create: () =>
    dealt(new LaBelleLucieGame({ variant: LaBelleLucieVariant.TREFOIL })),
} satisfies CatalogEntry<LaBelleLucieGame>;

const CANFIELD = {
  id: "canfield" as const,
  name: "Canfield",
  options: [CANFIELD_VARIANT],
  layout: CANFIELD_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new CanfieldGame({ variant: optionRule(values, CANFIELD_VARIANT) })),
} satisfies CatalogEntry<CanfieldGame>;

const PENGUIN = {
  id: "penguin" as const,
  name: "Penguin",
  options: [],
  layout: PENGUIN_LAYOUT,
  create: () => dealt(new PenguinGame()),
} satisfies CatalogEntry<PenguinGame>;

const BLACK_HOLE = {
  id: "blackhole" as const,
  name: "Black Hole",
  options: [],
  layout: BLACK_HOLE_LAYOUT,
  create: () => dealt(new BlackHoleGame()),
} satisfies CatalogEntry<BlackHoleGame>;

/*
 * All in a Row plays by Black Hole's rules on thirteen columns, a grid of its
 * own, so it is an entry of its own.
 */
const ALL_IN_A_ROW = {
  id: "allinarow" as const,
  name: "All in a Row",
  options: [],
  layout: ALL_IN_A_ROW_LAYOUT,
  create: () =>
    dealt(new BlackHoleGame({ variant: BlackHoleVariant.ALL_IN_A_ROW })),
} satisfies CatalogEntry<BlackHoleGame>;

const GRANDFATHERS_CLOCK = {
  id: "grandfathersclock" as const,
  name: "Grandfather's Clock",
  options: [],
  layout: GRANDFATHERS_CLOCK_LAYOUT,
  create: () => dealt(new GrandfathersClockGame()),
} satisfies CatalogEntry<GrandfathersClockGame>;

const PYRAMID = {
  id: "pyramid" as const,
  name: "Pyramid",
  options: [PYRAMID_GOAL, PYRAMID_PASSES],
  layout: PYRAMID_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new PyramidGame({
        goal: optionRule(values, PYRAMID_GOAL),
        passes: optionRule(values, PYRAMID_PASSES),
      }),
    ),
} satisfies CatalogEntry<PyramidGame>;

const TRI_PEAKS = {
  id: "tripeaks" as const,
  name: "TriPeaks",
  options: [],
  layout: TRI_PEAKS_LAYOUT,
  create: () => dealt(new TriPeaksGame()),
} satisfies CatalogEntry<TriPeaksGame>;

const BELEAGUERED_CASTLE = {
  id: "beleagueredcastle" as const,
  name: "Beleaguered Castle",
  options: [CASTLE_VARIANT],
  layout: BELEAGUERED_CASTLE_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new CastleGame({ variant: optionRule(values, CASTLE_VARIANT) })),
} satisfies CatalogEntry<CastleGame>;

/*
 * Fortress deals ten rows rather than eight, a grid of its own, so it is an
 * entry of its own.
 */
const FORTRESS = {
  id: "fortress" as const,
  name: "Fortress",
  options: [],
  layout: FORTRESS_LAYOUT,
  create: () => dealt(new CastleGame({ variant: CastleVariant.FORTRESS })),
} satisfies CatalogEntry<CastleGame>;

const POKER_SQUARES = {
  id: "pokersquares" as const,
  name: "Poker Squares",
  options: [POKER_SQUARES_SCORING],
  layout: POKER_SQUARES_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new PokerSquaresGame({
        scoring: optionRule(values, POKER_SQUARES_SCORING),
      }),
    ),
} satisfies CatalogEntry<PokerSquaresGame>;

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
  CHALLENGE_FREECELL,
  EIGHT_OFF,
  SCORPION,
  SIMPLE_SIMON,
  MRS_MOP,
  BAKERS_DOZEN,
  SEAHAVEN,
  SPIDERETTE,
  EASTHAVEN,
  FORTY_THIEVES,
  MARIA,
  LIMITED,
  LUCAS,
  DOUBLE_KLONDIKE,
  MONTANA,
  BLUE_MOON,
  BISLEY,
  ACES_UP,
  GOLF,
  CALCULATION,
  FLOWER_GARDEN,
  BRISTOL,
  NESTOR,
  MONTE_CARLO,
  LA_BELLE_LUCIE,
  TREFOIL,
  CANFIELD,
  PENGUIN,
  BLACK_HOLE,
  ALL_IN_A_ROW,
  GRANDFATHERS_CLOCK,
  PYRAMID,
  TRI_PEAKS,
  BELEAGUERED_CASTLE,
  FORTRESS,
  POKER_SQUARES,
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

/**
 * Returns the stored value of the choice that hands a game a rule, for data
 * written in the game's own terms, such as a rules page.
 *
 * @throws Error when the game offers no such option or rule.
 */
export function storedValue(
  gameId: GameId,
  optionId: string,
  rule: unknown,
): number {
  const option = catalogEntry(gameId).options.find(
    (candidate) => candidate.id === optionId,
  );
  const choice = option?.choices.find((candidate) => candidate.rule === rule);
  if (!choice) {
    throw new Error(`${gameId} offers no "${optionId}" of ${String(rule)}.`);
  }
  return choice.value;
}

/**
 * Returns the stored values that hand a game the given rules, for data written
 * in the game's own terms, such as a named variant's profile.
 *
 * @throws Error when the game offers no such option or rule.
 */
export function storedValues(
  gameId: GameId,
  rules: Readonly<Record<string, unknown>>,
): GameOptionValues {
  return Object.fromEntries(
    Object.entries(rules).map(([optionId, rule]) => [
      optionId,
      storedValue(gameId, optionId, rule),
    ]),
  );
}

/** Returns every grid a catalog entry's board may lie on. */
export function boardLayoutsOf(entry: CatalogEntry): BoardLayouts {
  return { roomy: entry.layout, arranged: entry.arrangement?.layouts };
}

/** Returns the catalog entry with the given id, or the first one. */
export function catalogEntry(id: string | null | undefined): CatalogEntry {
  return GAME_CATALOG.find((entry) => entry.id === id) ?? CATALOG_ENTRIES[0];
}
