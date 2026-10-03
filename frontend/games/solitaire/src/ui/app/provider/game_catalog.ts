import { PlayableGame } from "@/engine/tableau/playable_game";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { deckCardIds } from "@/engine/core/card/deck";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import {
  DEFAULT_DRAW_COUNT,
  DrawCount,
  KlondikeVariant,
} from "@/games/klondike/klondike_rules";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";
import {
  KlondikeScoring,
  klondikeScoringPolicy,
} from "@/games/klondike/scoring_policy";
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
import { ScorpionVariant } from "@/games/scorpion/scorpion_rules";
import { SCORPION_LAYOUT } from "@/games/scorpion/scorpion_layout";
import { SimpleSimonGame } from "@/games/simple_simon/simple_simon_game";
import { SimpleSimonVariant } from "@/games/simple_simon/simple_simon_rules";
import {
  MRS_MOP_LAYOUT,
  SIMPLE_SIMON_LAYOUT,
} from "@/games/simple_simon/simple_simon_layout";
import { BakersDozenGame } from "@/games/bakers_dozen/bakers_dozen_game";
import { BAKERS_DOZEN_LAYOUT } from "@/games/bakers_dozen/bakers_dozen_layout";
import { SeahavenGame } from "@/games/seahaven/seahaven_game";
import { SEAHAVEN_LAYOUT } from "@/games/seahaven/seahaven_layout";
import { FortyThievesGame } from "@/games/forty_thieves/forty_thieves_game";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import {
  FORTY_THIEVES_LAYOUT,
  LIMITED_LAYOUT,
  LUCAS_LAYOUT,
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
import { EASTHAVEN_LAYOUT } from "@/games/easthaven/easthaven_layout";
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import { SPIDERETTE_LAYOUT } from "@/games/spiderette/spiderette_layout";
import { BisleyGame } from "@/games/bisley/bisley_game";
import { BISLEY_LAYOUT } from "@/games/bisley/bisley_layout";
import { AcesUpGame } from "@/games/aces_up/aces_up_game";
import { ACES_UP_LAYOUT } from "@/games/aces_up/aces_up_layout";
import {
  AcesUpSpaces,
  DEFAULT_ACES_UP_SPACES,
} from "@/games/aces_up/aces_up_rules";
import { GolfGame } from "@/games/golf/golf_game";
import { GOLF_LAYOUT } from "@/games/golf/golf_layout";
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
import { BRISTOL_LAYOUT } from "@/games/bristol/bristol_layout";
import {
  BristolVariant,
  DEFAULT_BRISTOL_VARIANT,
} from "@/games/bristol/bristol_rules";
import { NestorGame } from "@/games/nestor/nestor_game";
import { NESTOR_LAYOUT } from "@/games/nestor/nestor_layout";
import { MonteCarloGame } from "@/games/monte_carlo/monte_carlo_game";
import { MONTE_CARLO_LAYOUT } from "@/games/monte_carlo/monte_carlo_layout";
import {
  DEFAULT_MONTE_CARLO_VARIANT,
  MonteCarloVariant,
} from "@/games/monte_carlo/monte_carlo_rules";

/**
 * Describes a value a rule option can take, and its name for a player.
 *
 * @template T The values the option can take, such as a game's variants.
 */
export interface GameOptionChoice<T extends number = number> {
  /** The stored value, kept primitive so it round-trips through storage. */
  readonly value: T;
  /** What the choice is called. */
  readonly label: string;
}

/**
 * Describes a rule a game lets the player choose.
 *
 * @template T The values the option can take, which {@link optionValue} hands
 *   back typed, so a game gets its own variant type rather than a number.
 */
export interface GameOptionSpec<T extends number = number> {
  /** Stable id, used for storage and for setting the value. */
  readonly id: string;
  /** What the option is called. */
  readonly label: string;
  /** A sentence explaining what choosing differently does. */
  readonly description?: string;
  /** The values on offer, in the order they are shown. */
  readonly choices: readonly GameOptionChoice<T>[];
  /** The value used when the player has expressed no preference. */
  readonly defaultValue: T;
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
  /** Creates a dealt game playing by the given options. */
  create(values: GameOptionValues): CatalogSession<TGame>;
}

/** Holds a dealt game. */
export interface CatalogSession<TGame extends PlayableGame = PlayableGame> {
  readonly game: TGame;
}

/** Reads an option's value, falling back to its default. */
export function optionValue<T extends number>(
  values: GameOptionValues,
  spec: GameOptionSpec<T>,
): T {
  const chosen = spec.choices.find(
    (choice) => choice.value === values[spec.id],
  );
  return chosen ? chosen.value : spec.defaultValue;
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

const KLONDIKE_DRAW_COUNT: GameOptionSpec<DrawCount> = {
  id: "drawCount",
  label: "Draw Mode",
  description: "Draw 1 is easier; Draw 3 is the standard Solitaire challenge.",
  choices: [
    { value: 1, label: "Draw 1" },
    { value: 3, label: "Draw 3" },
  ],
  defaultValue: DEFAULT_DRAW_COUNT,
};

const KLONDIKE_SCORING: GameOptionSpec<KlondikeScoring> = {
  id: "scoring",
  label: "Scoring",
  description:
    "Vegas buys the deck for $52 and pays $5 for every card on a foundation, but allows only one pass through the stock in Draw 1 and three in Draw 3.",
  choices: [
    { value: KlondikeScoring.STANDARD, label: "Standard" },
    { value: KlondikeScoring.VEGAS, label: "Vegas" },
  ],
  defaultValue: KlondikeScoring.STANDARD,
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

const CHALLENGE_EMPTY_COLUMNS: GameOptionSpec = {
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Kings Only is Super Challenge FreeCell: it also caps how many cards move at once, because a run can no longer be staged in an empty column.",
  choices: [
    { value: 0, label: "Any Card" },
    { value: 1, label: "Kings Only" },
  ],
  defaultValue: 0,
};

const SPIDER_SUIT_COUNT: GameOptionSpec<SpiderSuitCount> = {
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
const YUKON_VARIANT: GameOptionSpec<YukonVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Alaska and Russian Solitaire deal like Yukon but build the columns by suit rather than by alternating color; Moosehide lets a card land on any suit but its own.",
  choices: [
    { value: YukonVariant.YUKON, label: "Yukon" },
    { value: YukonVariant.ALASKA, label: "Alaska" },
    { value: YukonVariant.RUSSIAN, label: "Russian Solitaire" },
    { value: YukonVariant.MOOSEHIDE, label: "Moosehide" },
  ],
  defaultValue: YukonVariant.YUKON,
};

/** Which of the Klondike family to deal. */
const KLONDIKE_VARIANT: GameOptionSpec<KlondikeVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Whitehead deals every card face-up and builds in one colour; Thumb and Pouch lets a card land on any suit but its own. Both let any card fill an empty column. Saratoga is Klondike with every column card dealt face-up.",
  choices: [
    { value: KlondikeVariant.KLONDIKE, label: "Klondike" },
    { value: KlondikeVariant.WHITEHEAD, label: "Whitehead" },
    { value: KlondikeVariant.THUMB_AND_POUCH, label: "Thumb and Pouch" },
    { value: KlondikeVariant.SARATOGA, label: "Saratoga" },
  ],
  defaultValue: KlondikeVariant.KLONDIKE,
};

/** Which of the Forty Thieves family to deal. */
const FORTY_THIEVES_VARIANT: GameOptionSpec<FortyThievesVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Josephine lets same-suit runs move as a unit; Rank and File builds in alternating colours but buries three of every four cards. Indian deals three to a column and builds on any other suit; Number Ten buries two of four and builds in alternating colours.",
  choices: [
    { value: FortyThievesVariant.FORTY_THIEVES, label: "Forty Thieves" },
    { value: FortyThievesVariant.JOSEPHINE, label: "Josephine" },
    { value: FortyThievesVariant.RANK_AND_FILE, label: "Rank and File" },
    { value: FortyThievesVariant.INDIAN, label: "Indian" },
    { value: FortyThievesVariant.NUMBER_TEN, label: "Number Ten" },
  ],
  defaultValue: FortyThievesVariant.FORTY_THIEVES,
};

/** Which of the Scorpion family to deal. */
const SCORPION_VARIANT: GameOptionSpec<ScorpionVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Wasp lets any card or run fill an empty column; Scorpion II buries cards in only the first three columns.",
  choices: [
    { value: ScorpionVariant.SCORPION, label: "Scorpion" },
    { value: ScorpionVariant.WASP, label: "Wasp" },
    { value: ScorpionVariant.SCORPION_II, label: "Scorpion II" },
  ],
  defaultValue: ScorpionVariant.SCORPION,
};

/** How many redeals a Montana game allows. */
const MONTANA_REDEALS: GameOptionSpec<MaxRedeals> = {
  id: "redeals",
  label: "Redeals",
  description:
    "Three redeals is the game called Addiction: one more chance to shuffle the stuck cards back out.",
  choices: [
    { value: 2, label: "2 Redeals" },
    { value: 3, label: "3 Redeals" },
  ],
  defaultValue: DEFAULT_MAX_REDEALS,
};

/** Which of the Moons to deal, which share a grid and differ in the deal. */
const MOON_DEAL: GameOptionSpec<MontanaVariant> = {
  id: "variant",
  label: "Deal",
  description:
    "Red Moon deals the gaps right beside the Aces, so every row can start building at once; Blue Moon leaves them wherever the Aces fell.",
  choices: [
    { value: MontanaVariant.BLUE_MOON, label: "Blue Moon" },
    { value: MontanaVariant.RED_MOON, label: "Red Moon" },
  ],
  defaultValue: MontanaVariant.BLUE_MOON,
};

/** Which of the Spiderette pair to deal. */
const SPIDERETTE_VARIANT: GameOptionSpec<SpideretteVariant> = {
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

/** What may fill an empty column in Aces Up. */
const ACES_UP_SPACES: GameOptionSpec<AcesUpSpaces> = {
  id: "emptyColumns",
  label: "Empty Columns",
  description:
    "Aces Only is the harder game: a space can only take an Ace, so every other card has to wait for the discard.",
  choices: [
    { value: AcesUpSpaces.ANY_CARD, label: "Any Card" },
    { value: AcesUpSpaces.ACES_ONLY, label: "Aces Only" },
  ],
  defaultValue: DEFAULT_ACES_UP_SPACES,
};

/** Which of the Golf family to deal. */
const GOLF_VARIANT: GameOptionSpec<GolfVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Golf lets nothing onto a King; one house rule lets a Queen go there. Putt Putt turns the corner, so a King and an Ace are a rank apart both ways.",
  choices: [
    { value: GolfVariant.GOLF, label: "Golf" },
    { value: GolfVariant.QUEENS_ON_KINGS, label: "Queens on Kings" },
    { value: GolfVariant.PUTT_PUTT, label: "Putt Putt" },
  ],
  defaultValue: DEFAULT_GOLF_VARIANT,
};

/** Which of the games on Calculation's board to deal. */
const CALCULATION_VARIANT: GameOptionSpec<CalculationVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Sir Tommy builds every foundation up by one from an Ace, which the player has to wait for, rather than by Calculation's four intervals.",
  choices: [
    { value: CalculationVariant.CALCULATION, label: "Calculation" },
    { value: CalculationVariant.SIR_TOMMY, label: "Sir Tommy" },
  ],
  defaultValue: DEFAULT_CALCULATION_VARIANT,
};

/** Which of the games on Bristol's board to deal. */
const BRISTOL_VARIANT: GameOptionSpec<BristolVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Belvedere starts one foundation with an Ace, so there is somewhere to play from the first move.",
  choices: [
    { value: BristolVariant.BRISTOL, label: "Bristol" },
    { value: BristolVariant.BELVEDERE, label: "Belvedere" },
  ],
  defaultValue: DEFAULT_BRISTOL_VARIANT,
};

/** Which of the games on Monte Carlo's grid to deal. */
const MONTE_CARLO_VARIANT: GameOptionSpec<MonteCarloVariant> = {
  id: "variant",
  label: "Variant",
  description:
    "Thirteens pairs touching cards that add up to thirteen, and lets a King go on its own.",
  choices: [
    { value: MonteCarloVariant.MONTE_CARLO, label: "Monte Carlo" },
    { value: MonteCarloVariant.THIRTEENS, label: "Thirteens" },
  ],
  defaultValue: DEFAULT_MONTE_CARLO_VARIANT,
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
  create: (values: GameOptionValues) =>
    dealt(
      new KlondikeGame({
        drawCount: optionValue(values, KLONDIKE_DRAW_COUNT),
        variant: optionValue(values, KLONDIKE_VARIANT),
        scoring: klondikeScoringPolicy(optionValue(values, KLONDIKE_SCORING)),
        almostWin: optionValue(values, KLONDIKE_ALMOST_WIN) === 1,
      }),
    ),
} satisfies CatalogEntry<KlondikeGame>;

const FREECELL = {
  id: "freecell" as const,
  name: "FreeCell",
  options: [],
  layout: FREECELL_LAYOUT,
  create: () => dealt(new FreeCellGame()),
} satisfies CatalogEntry<FreeCellGame>;

const SPIDER = {
  id: "spider" as const,
  name: "Spider",
  options: [SPIDER_SUIT_COUNT],
  layout: SPIDER_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new SpiderGame({
        cardIds: deckCardIds(
          spiderDeck(optionValue(values, SPIDER_SUIT_COUNT)),
        ),
      }),
    ),
} satisfies CatalogEntry<SpiderGame>;

const YUKON = {
  id: "yukon" as const,
  name: "Yukon",
  options: [YUKON_VARIANT],
  layout: YUKON_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new YukonGame({ variant: optionValue(values, YUKON_VARIANT) })),
} satisfies CatalogEntry<YukonGame>;

const BAKERS = {
  id: "bakers" as const,
  name: "Baker's Game",
  options: [BAKERS_EMPTY_COLUMNS],
  layout: FREECELL_LAYOUT,
  // FreeCell's class, playing by Baker's Game's column rules.
  create: (values: GameOptionValues) =>
    dealt(
      new FreeCellGame({
        variant:
          optionValue(values, BAKERS_EMPTY_COLUMNS) === 1
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
  create: (values: GameOptionValues) =>
    dealt(
      new FreeCellGame({
        variant:
          optionValue(values, CHALLENGE_EMPTY_COLUMNS) === 1
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
  create: (values: GameOptionValues) =>
    dealt(new ScorpionGame({ variant: optionValue(values, SCORPION_VARIANT) })),
} satisfies CatalogEntry<ScorpionGame>;

const SIMPLE_SIMON = {
  id: "simplesimon" as const,
  name: "Simple Simon",
  options: [],
  layout: SIMPLE_SIMON_LAYOUT,
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
  create: () =>
    dealt(new SimpleSimonGame({ variant: SimpleSimonVariant.MRS_MOP })),
} satisfies CatalogEntry<SimpleSimonGame>;

const BAKERS_DOZEN = {
  id: "bakersdozen" as const,
  name: "Baker's Dozen",
  options: [],
  layout: BAKERS_DOZEN_LAYOUT,
  create: () => dealt(new BakersDozenGame()),
} satisfies CatalogEntry<BakersDozenGame>;

const SEAHAVEN = {
  id: "seahaven" as const,
  name: "Seahaven Towers",
  options: [],
  layout: SEAHAVEN_LAYOUT,
  create: () => dealt(new SeahavenGame()),
} satisfies CatalogEntry<SeahavenGame>;

const FORTY_THIEVES = {
  id: "fortythieves" as const,
  name: "Forty Thieves",
  options: [FORTY_THIEVES_VARIANT],
  layout: FORTY_THIEVES_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new FortyThievesGame({
        variant: optionValue(values, FORTY_THIEVES_VARIANT),
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
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.MARIA })),
} satisfies CatalogEntry<FortyThievesGame>;

const LIMITED = {
  id: "limited" as const,
  name: "Limited",
  options: [],
  layout: LIMITED_LAYOUT,
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.LIMITED })),
} satisfies CatalogEntry<FortyThievesGame>;

const LUCAS = {
  id: "lucas" as const,
  name: "Lucas",
  options: [],
  layout: LUCAS_LAYOUT,
  create: () =>
    dealt(new FortyThievesGame({ variant: FortyThievesVariant.LUCAS })),
} satisfies CatalogEntry<FortyThievesGame>;

const MONTANA = {
  id: "montana" as const,
  name: "Montana",
  options: [MONTANA_REDEALS],
  layout: MONTANA_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new MontanaGame({ maxRedeals: optionValue(values, MONTANA_REDEALS) }),
    ),
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
    dealt(new MontanaGame({ variant: optionValue(values, MOON_DEAL) })),
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
  create: () => dealt(new EasthavenGame()),
} satisfies CatalogEntry<EasthavenGame>;

const SPIDERETTE = {
  id: "spiderette" as const,
  name: "Spiderette",
  options: [SPIDERETTE_VARIANT],
  layout: SPIDERETTE_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new SpideretteGame({ variant: optionValue(values, SPIDERETTE_VARIANT) }),
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
    dealt(new AcesUpGame({ spaces: optionValue(values, ACES_UP_SPACES) })),
} satisfies CatalogEntry<AcesUpGame>;

const GOLF = {
  id: "golf" as const,
  name: "Golf",
  options: [GOLF_VARIANT],
  layout: GOLF_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(new GolfGame({ variant: optionValue(values, GOLF_VARIANT) })),
} satisfies CatalogEntry<GolfGame>;

const CALCULATION = {
  id: "calculation" as const,
  name: "Calculation",
  options: [CALCULATION_VARIANT],
  layout: CALCULATION_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new CalculationGame({
        variant: optionValue(values, CALCULATION_VARIANT),
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
  create: (values: GameOptionValues) =>
    dealt(new BristolGame({ variant: optionValue(values, BRISTOL_VARIANT) })),
} satisfies CatalogEntry<BristolGame>;

const NESTOR = {
  id: "nestor" as const,
  name: "Nestor",
  options: [],
  layout: NESTOR_LAYOUT,
  create: () => dealt(new NestorGame()),
} satisfies CatalogEntry<NestorGame>;

const MONTE_CARLO = {
  id: "montecarlo" as const,
  name: "Monte Carlo",
  options: [MONTE_CARLO_VARIANT],
  layout: MONTE_CARLO_LAYOUT,
  create: (values: GameOptionValues) =>
    dealt(
      new MonteCarloGame({ variant: optionValue(values, MONTE_CARLO_VARIANT) }),
    ),
} satisfies CatalogEntry<MonteCarloGame>;

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
  return GAME_CATALOG.find((entry) => entry.id === id) ?? CATALOG_ENTRIES[0];
}
