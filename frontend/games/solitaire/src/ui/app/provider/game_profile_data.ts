import { InjectionToken } from "@angular/core";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import { ScorpionVariant } from "@/games/scorpion/scorpion_rules";
import { MontanaVariant } from "@/games/montana/montana_rules";
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
  },
};
