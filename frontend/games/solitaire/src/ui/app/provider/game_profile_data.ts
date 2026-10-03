import { InjectionToken } from "@angular/core";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import { ScorpionVariant } from "@/games/scorpion/scorpion_rules";
import { MontanaVariant } from "@/games/montana/montana_rules";
import { GolfVariant } from "@/games/golf/golf_rules";
import { CalculationVariant } from "@/games/calculation/calculation_rules";
import { BristolVariant } from "@/games/bristol/bristol_rules";
import { MonteCarloVariant } from "@/games/monte_carlo/monte_carlo_rules";
import { LaBelleLucieVariant } from "@/games/la_belle_lucie/la_belle_lucie_rules";
import { CanfieldVariant } from "@/games/canfield/canfield_rules";
import { PyramidGoal } from "@/games/pyramid/pyramid_rules";
import { CastleVariant } from "@/games/beleaguered_castle/castle_rules";
import {
  Difficulty,
  GameFamilyProfile,
  GameProfile,
  GameProfileRegistry,
} from "../model/game_profile.model";
import { GameId } from "./game_catalog";

/**
 * Holds a profile for every game in the catalog, so a game without one does
 * not compile.
 */
export interface CompleteGameProfiles extends GameProfileRegistry {
  readonly games: Readonly<Record<GameId, GameProfile>>;
}

/** The profiles the browser shows, as a token a spec can replace. */
export const GAME_PROFILES = new InjectionToken<GameProfileRegistry>(
  "GAME_PROFILES",
  {
    providedIn: "root",
    factory: () => GAME_PROFILE_REGISTRY,
  },
);

const FAMILIES: readonly GameFamilyProfile[] = [
  {
    id: "klondike",
    name: "Klondike family",
    description:
      "Turn cards from a stock and build down the columns, uncovering the cards dealt face-down.",
  },
  {
    id: "freecell",
    name: "FreeCell family",
    description:
      "Every card is dealt face-up, with free cells to park cards in while you sort the columns.",
  },
  {
    id: "spider",
    name: "Spider family",
    description:
      "Build complete King-to-Ace runs in one suit, which then clear from the board.",
  },
  {
    id: "yukon",
    name: "Yukon family",
    description:
      "No stock: move any face-up card, taking every card on top of it along.",
  },
  {
    id: "fortythieves",
    name: "Forty Thieves family",
    description:
      "Two decks dealt into shallow columns, with a long stock to work through.",
  },
  {
    id: "golf",
    name: "Golf family",
    description:
      "Play cards one rank up or down onto a single pile until the tableau is clear.",
  },
  {
    id: "fan",
    name: "Fan family",
    description:
      "Short fans of cards played off one at a time, with no free cells to fall back on.",
  },
  {
    id: "pairing",
    name: "Pairing games",
    description:
      "Clear the board two cards at a time, pairing cards that match or add up.",
  },
  {
    id: "canfield",
    name: "Canfield family",
    description:
      "Feed four columns from a reserve, with foundations that start wherever the deal says.",
  },
  {
    id: "castle",
    name: "Castle family",
    description:
      "Rows fanned sideways either side of the foundations, every card in view and moved one at a time.",
  },
  {
    id: "other",
    name: "More games",
    description: "Games that follow a pattern of their own.",
  },
];

/** The profile of every game in the catalog, and the families they form. */
export const GAME_PROFILE_REGISTRY: CompleteGameProfiles = {
  families: FAMILIES,
  games: {
    klondike: {
      family: "klondike",
      tagline:
        "The classic: turn the stock, build down in alternating colours.",
      difficulty: {
        optionId: "drawCount",
        byChoice: { 1: Difficulty.EASY, 3: Difficulty.MEDIUM },
      },
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Whitehead",
          values: { variant: KlondikeVariant.WHITEHEAD },
          tagline: "Klondike dealt face-up, building down in one colour.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Thumb and Pouch",
          values: { variant: KlondikeVariant.THUMB_AND_POUCH },
          tagline: "Klondike where a card lands on any suit but its own.",
          difficulty: Difficulty.EASY,
        },
        {
          name: "Saratoga",
          values: { variant: KlondikeVariant.SARATOGA },
          tagline: "Klondike with every column card dealt face-up.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    freecell: {
      family: "freecell",
      tagline: "Every card face-up, with four cells to park cards in.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    spider: {
      family: "spider",
      tagline: "Build King-to-Ace runs by suit across ten columns.",
      difficulty: {
        optionId: "suitCount",
        byChoice: {
          1: Difficulty.EASY,
          2: Difficulty.MEDIUM,
          4: Difficulty.HARD,
        },
      },
      decks: 2,
      allCardsVisible: false,
    },
    yukon: {
      family: "yukon",
      tagline: "No stock: move any face-up card with everything on it.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Alaska",
          values: { variant: YukonVariant.ALASKA },
          tagline: "Yukon building up or down in the same suit.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Russian Solitaire",
          values: { variant: YukonVariant.RUSSIAN },
          tagline: "Yukon building down in the same suit only.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Moosehide",
          values: { variant: YukonVariant.MOOSEHIDE },
          tagline: "Yukon where a card lands on any suit but its own.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    bakers: {
      family: "freecell",
      tagline: "FreeCell's ancestor: columns build in a single suit.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    challengefreecell: {
      family: "freecell",
      tagline: "FreeCell with every Ace and Two dealt to the bottom.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Super Challenge FreeCell",
          values: { emptyColumns: 1 },
          tagline: "Challenge FreeCell where only Kings fill a space.",
          difficulty: Difficulty.HARD,
        },
      ],
    },
    eightoff: {
      family: "freecell",
      tagline: "Eight cells, half of them filled, and same-suit columns.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    scorpion: {
      family: "spider",
      tagline: "Drag any face-up card to build Spider's same-suit runs.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Wasp",
          values: { variant: ScorpionVariant.WASP },
          tagline: "Scorpion where any card can fill an empty column.",
          difficulty: Difficulty.EASY,
        },
        {
          name: "Scorpion II",
          values: { variant: ScorpionVariant.SCORPION_II },
          tagline: "Scorpion with cards hidden in only three columns.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    simplesimon: {
      family: "spider",
      tagline: "Spider on an open board: every card face-up, no stock.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    mrsmop: {
      family: "spider",
      tagline: "Two decks dealt face-up across thirteen columns, no stock.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: true,
    },
    bakersdozen: {
      family: "other",
      tagline: "Thirteen open columns, Kings sunk, and spaces never refill.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    seahaven: {
      family: "freecell",
      tagline: "Ten columns and four cells, building in suit, Kings to spaces.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    spiderette: {
      family: "spider",
      tagline: "One-deck Spider on seven columns.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Will o' the Wisp",
          values: { variant: SpideretteVariant.WILL_O_THE_WISP },
          tagline: "Spiderette dealt three cards to every column.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    easthaven: {
      family: "klondike",
      tagline: "Klondike's building with Spider's row-dealing stock.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
    },
    fortythieves: {
      family: "fortythieves",
      tagline: "One card at a time, from a waste that never recycles.",
      difficulty: Difficulty.HARD,
      decks: 2,
      allCardsVisible: false,
      variants: [
        {
          name: "Josephine",
          values: { variant: FortyThievesVariant.JOSEPHINE },
          tagline: "Forty Thieves where same-suit runs move as a unit.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Streets"],
        },
        {
          name: "Rank and File",
          values: { variant: FortyThievesVariant.RANK_AND_FILE },
          tagline: "Alternating colours, but most of the deal face-down.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Indian",
          values: { variant: FortyThievesVariant.INDIAN },
          tagline: "Columns of three, building on any suit but a card's own.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Number Ten",
          values: { variant: FortyThievesVariant.NUMBER_TEN },
          tagline: "Alternating colours with runs, half the deal face-down.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    maria: {
      family: "fortythieves",
      tagline: "Forty Thieves on nine columns, in alternating colours.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    limited: {
      family: "fortythieves",
      tagline: "Forty Thieves spread over twelve shallow columns.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    lucas: {
      family: "fortythieves",
      tagline: "Thirteen columns of three, with the Aces already home.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    doubleklondike: {
      family: "klondike",
      tagline: "Klondike from two decks, on nine columns.",
      difficulty: Difficulty.EASY,
      decks: 2,
      allCardsVisible: false,
    },
    montana: {
      family: "other",
      tagline: "Move cards into the gaps to sort four rows of thirteen.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      aliases: ["Gaps"],
      variants: [
        {
          name: "Addiction",
          values: { redeals: 3 },
          tagline: "Montana with a third redeal.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    bluemoon: {
      family: "other",
      tagline: "Montana with the Aces in play, fixed at the head of each row.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Red Moon",
          values: { variant: MontanaVariant.RED_MOON },
          tagline: "Blue Moon with every gap dealt beside its Ace.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    bisley: {
      family: "other",
      tagline: "Build each suit up from its Ace and down from its King.",
      difficulty: Difficulty.EASY,
      decks: 1,
      allCardsVisible: true,
    },
    acesup: {
      family: "other",
      tagline: "Discard every card a higher card of its suit outranks.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
    },
    golf: {
      family: "golf",
      tagline:
        "Play cards a rank up or down onto one pile to clear seven columns.",
      difficulty: {
        optionId: "variant",
        byChoice: {
          [GolfVariant.GOLF]: Difficulty.HARD,
          [GolfVariant.QUEENS_ON_KINGS]: Difficulty.HARD,
          [GolfVariant.PUTT_PUTT]: Difficulty.MEDIUM,
        },
      },
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Putt Putt",
          values: { variant: GolfVariant.PUTT_PUTT },
          tagline: "Golf where the ranks turn the corner from King to Ace.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    calculation: {
      family: "other",
      tagline: "Build four foundations by ones, twos, threes and fours.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Broken Intervals"],
      variants: [
        {
          name: "Sir Tommy",
          values: { variant: CalculationVariant.SIR_TOMMY },
          tagline:
            "Four foundations from Ace to King, any suit, four waste piles.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Old Patience"],
        },
      ],
    },
    flowergarden: {
      family: "other",
      tagline:
        "Six beds and a sixteen-card bouquet, every bouquet card in play.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      aliases: ["The Garden", "Bouquet"],
    },
    bristol: {
      family: "fan",
      tagline: "Eight fans and three reserves the stock deals onto.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Belvedere",
          values: { variant: BristolVariant.BELVEDERE },
          tagline: "Bristol with one Ace already on a foundation.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    nestor: {
      family: "pairing",
      tagline: "Pair free cards of the same rank until the board is clear.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    montecarlo: {
      family: "pairing",
      tagline: "Pair touching cards in a five-by-five grid, then close it up.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Weddings"],
      variants: [
        {
          name: "Monte Carlo Thirteens",
          values: { variant: MonteCarloVariant.THIRTEENS },
          tagline: "Monte Carlo pairing cards that add up to thirteen.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    labellelucie: {
      family: "fan",
      tagline: "Eighteen fans built down in suit, with two redeals.",
      difficulty: {
        optionId: "variant",
        byChoice: {
          [LaBelleLucieVariant.LA_BELLE_LUCIE]: Difficulty.HARD,
          [LaBelleLucieVariant.THE_FAN]: Difficulty.HARD,
          [LaBelleLucieVariant.SHAMROCKS]: Difficulty.MEDIUM,
        },
      },
      decks: 1,
      allCardsVisible: true,
      aliases: ["Fair Lucy", "Midnight Oil"],
      variants: [
        {
          name: "The Fan",
          values: { variant: LaBelleLucieVariant.THE_FAN },
          tagline:
            "La Belle Lucie where Kings fill empty fans, with no redeal.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Shamrocks",
          values: { variant: LaBelleLucieVariant.SHAMROCKS },
          tagline: "Fans of at most three, built up or down in any suit.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    trefoil: {
      family: "fan",
      tagline: "La Belle Lucie with the Aces already on the foundations.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    canfield: {
      family: "canfield",
      tagline:
        "Work through a thirteen-card reserve onto foundations of any rank.",
      difficulty: {
        optionId: "variant",
        byChoice: {
          [CanfieldVariant.CANFIELD]: Difficulty.HARD,
          [CanfieldVariant.STOREHOUSE]: Difficulty.MEDIUM,
          [CanfieldVariant.SUPERIOR]: Difficulty.MEDIUM,
          [CanfieldVariant.RAINBOW]: Difficulty.HARD,
        },
      },
      decks: 1,
      allCardsVisible: false,
      aliases: ["Demon", "Fascination"],
      variants: [
        {
          name: "Storehouse",
          values: { variant: CanfieldVariant.STOREHOUSE },
          tagline: "Canfield from the Twos, building in suit.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Thirteen Up", "Reserve"],
        },
        {
          name: "Superior Canfield",
          values: { variant: CanfieldVariant.SUPERIOR },
          tagline: "Canfield with the reserve face-up and spaces left open.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Rainbow",
          values: { variant: CanfieldVariant.RAINBOW },
          tagline: "Canfield building regardless of colour, one pass.",
          difficulty: Difficulty.HARD,
        },
      ],
    },
    penguin: {
      family: "freecell",
      tagline: "Seven columns in suit, a seven-cell flipper, and a dealt beak.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    blackhole: {
      family: "golf",
      tagline:
        "Play every card into the hole, a rank up or down round the corner.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    allinarow: {
      family: "golf",
      tagline: "Thirteen columns of four, played onto one pile from any start.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    grandfathersclock: {
      family: "other",
      tagline: "Build twelve foundations round a dial, each to its hour.",
      difficulty: Difficulty.EASY,
      decks: 1,
      allCardsVisible: true,
      aliases: ["Clock"],
    },
    pyramid: {
      family: "pairing",
      tagline: "Pair free cards totalling thirteen to take the pyramid apart.",
      difficulty: {
        optionId: "goal",
        byChoice: {
          [PyramidGoal.ALL_CARDS]: Difficulty.HARD,
          [PyramidGoal.PYRAMID_ONLY]: Difficulty.MEDIUM,
        },
      },
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Relaxed Pyramid",
          values: { goal: PyramidGoal.PYRAMID_ONLY },
          tagline: "Pyramid won once the pyramid itself is cleared.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    tripeaks: {
      family: "golf",
      tagline: "Clear three peaks onto the waste, a rank up or down at a time.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Three Peaks", "Tri Towers"],
    },
    beleagueredcastle: {
      family: "castle",
      tagline: "Eight open rows around the Aces, one card at a time.",
      difficulty: {
        optionId: "variant",
        byChoice: {
          [CastleVariant.BELEAGUERED_CASTLE]: Difficulty.MEDIUM,
          [CastleVariant.STREETS_AND_ALLEYS]: Difficulty.HARD,
          [CastleVariant.CITADEL]: Difficulty.EASY,
        },
      },
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Streets and Alleys",
          values: { variant: CastleVariant.STREETS_AND_ALLEYS },
          tagline: "Beleaguered Castle with the Aces dealt into the rows.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Citadel",
          values: { variant: CastleVariant.CITADEL },
          tagline: "Beleaguered Castle sending cards home as they are dealt.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    fortress: {
      family: "castle",
      tagline: "Ten open rows built up or down in suit, Aces buried.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    pokersquares: {
      family: "other",
      tagline: "Place 25 cards in a grid to make ten poker hands.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Poker Solitaire"],
    },
  },
};
