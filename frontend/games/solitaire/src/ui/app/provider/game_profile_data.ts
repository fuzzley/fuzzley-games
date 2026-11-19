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
  type GameFamilyProfile,
  type GameProfile,
  type GameProfileRegistry,
} from "../model/game_profile.model";
import { type GameId, storedValues } from "./game_catalog";

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
      "Build down the columns to turn up the cards dealt face down, with more cards to come from the stock.",
  },
  {
    id: "freecell",
    name: "FreeCell family",
    description:
      "Every card is dealt face up, with free cells to park cards in while you sort the columns.",
  },
  {
    id: "spider",
    name: "Spider family",
    description:
      "Build King-to-Ace runs by suit, and each full run leaves the board.",
  },
  {
    id: "yukon",
    name: "Yukon family",
    description:
      "You can move any face-up card with everything on top of it, and there is no stock.",
  },
  {
    id: "fortythieves",
    name: "Forty Thieves family",
    description:
      "Build down on shallow columns from 2 decks, with a long stock to work through.",
  },
  {
    id: "golf",
    name: "Golf family",
    description:
      "Play cards 1 rank up or down onto a single pile until the tableau is clear.",
  },
  {
    id: "fan",
    name: "Fan family",
    description:
      "Move 1 card at a time between fans of 3, with no free cells to fall back on.",
  },
  {
    id: "pairing",
    name: "Pairing games",
    description: "Clear the board by pairing cards that match or add up to 13.",
  },
  {
    id: "canfield",
    name: "Canfield family",
    description:
      "Play off a 13-card reserve, with foundations that can start at any rank.",
  },
  {
    id: "castle",
    name: "Castle family",
    description:
      "Move 1 card at a time between open rows on either side of the foundations.",
  },
  {
    id: "other",
    name: "More games",
    description: "Games that don't fit a family.",
  },
];

/** The profile of every game in the catalog, and the families they form. */
export const GAME_PROFILE_REGISTRY: CompleteGameProfiles = {
  families: FAMILIES,
  games: {
    klondike: {
      family: "klondike",
      tagline:
        "Build down in alternating colors. Draw 3, or Draw 1 for an easier game.",
      difficulty: {
        optionId: "drawCount",
        byChoice: { 1: Difficulty.EASY, 3: Difficulty.MEDIUM },
      },
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Whitehead",
          values: storedValues("klondike", {
            variant: KlondikeVariant.WHITEHEAD,
          }),
          tagline:
            "Klondike, but dealt face up, and you build down in the same color.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Thumb and Pouch",
          values: storedValues("klondike", {
            variant: KlondikeVariant.THUMB_AND_POUCH,
          }),
          tagline: "Klondike, but you build down on a different suit.",
          difficulty: Difficulty.EASY,
        },
        {
          name: "Saratoga",
          values: storedValues("klondike", {
            variant: KlondikeVariant.SARATOGA,
          }),
          tagline: "Klondike, but the columns are dealt face up.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    freecell: {
      family: "freecell",
      tagline:
        "Build down in alternating colors, with 4 free cells to park cards in.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    spider: {
      family: "spider",
      tagline: "Build King-to-Ace runs by suit across 10 columns.",
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
      tagline:
        "No stock. Move any face-up card, along with everything on top of it.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Alaska",
          values: storedValues("yukon", { variant: YukonVariant.ALASKA }),
          tagline: "Yukon, but you build up or down by suit.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Russian Solitaire",
          values: storedValues("yukon", { variant: YukonVariant.RUSSIAN }),
          tagline: "Yukon, but you build down by suit.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Moosehide",
          values: storedValues("yukon", { variant: YukonVariant.MOOSEHIDE }),
          tagline: "Yukon, but you build down on a different suit.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    bakers: {
      family: "freecell",
      tagline: "FreeCell's ancestor. Build the columns down by suit.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    challengefreecell: {
      family: "freecell",
      tagline: "FreeCell with every Ace and 2 dealt to the bottom.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Super Challenge FreeCell",
          values: { emptyColumns: 1 },
          tagline:
            "Challenge FreeCell, but only a King can fill an empty column.",
          difficulty: Difficulty.HARD,
        },
      ],
    },
    eightoff: {
      family: "freecell",
      tagline:
        "8 cells, 4 of them filled, and columns that build down by suit.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    scorpion: {
      family: "spider",
      tagline:
        "Move any face-up card to build King-to-Ace runs by suit, like Spider.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Wasp",
          values: storedValues("scorpion", { variant: ScorpionVariant.WASP }),
          tagline: "Scorpion, but any card can fill an empty column.",
          difficulty: Difficulty.EASY,
        },
        {
          name: "Scorpion II",
          values: storedValues("scorpion", {
            variant: ScorpionVariant.SCORPION_II,
          }),
          tagline: "Scorpion, but only 3 columns start with cards face down.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    simplesimon: {
      family: "spider",
      tagline: "Spider with 1 deck, every card face up and no stock.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    mrsmop: {
      family: "spider",
      tagline: "2 decks dealt face up across 13 columns, with no stock.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: true,
    },
    bakersdozen: {
      family: "other",
      tagline:
        "13 columns with the Kings at the bottom. Empty columns stay empty.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    seahaven: {
      family: "freecell",
      tagline:
        "10 columns and 4 cells. Build by suit. Only Kings go in empty columns.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    spiderette: {
      family: "spider",
      tagline: "Spider with 1 deck, on 7 columns.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Will o' the Wisp",
          values: storedValues("spiderette", {
            variant: SpideretteVariant.WILL_O_THE_WISP,
          }),
          tagline: "Spiderette, but each column is dealt 3 cards.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    easthaven: {
      family: "klondike",
      tagline: "Like Klondike, but the stock deals a card onto every column.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
    },
    fortythieves: {
      family: "fortythieves",
      tagline: "Build down by suit across 10 columns. Move 1 card at a time.",
      difficulty: Difficulty.HARD,
      decks: 2,
      allCardsVisible: false,
      variants: [
        {
          name: "Josephine",
          values: storedValues("fortythieves", {
            variant: FortyThievesVariant.JOSEPHINE,
          }),
          tagline: "Forty Thieves, but you can move runs of the same suit.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Streets"],
        },
        {
          name: "Rank and File",
          values: storedValues("fortythieves", {
            variant: FortyThievesVariant.RANK_AND_FILE,
          }),
          tagline:
            "Forty Thieves, but you build in alternating colors and can move runs.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Indian",
          values: storedValues("fortythieves", {
            variant: FortyThievesVariant.INDIAN,
          }),
          tagline:
            "Forty Thieves on columns of 3, and you build down on a different suit.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Number Ten",
          values: storedValues("fortythieves", {
            variant: FortyThievesVariant.NUMBER_TEN,
          }),
          tagline:
            "Like Rank and File, but only 2 cards in each column start face down.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    maria: {
      family: "fortythieves",
      tagline: "Forty Thieves on 9 columns, in alternating colors.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    limited: {
      family: "fortythieves",
      tagline: "Forty Thieves spread over 12 shallow columns.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    lucas: {
      family: "fortythieves",
      tagline: "13 columns of 3, with the Aces already on the foundations.",
      difficulty: Difficulty.MEDIUM,
      decks: 2,
      allCardsVisible: false,
    },
    doubleklondike: {
      family: "klondike",
      tagline: "Klondike from 2 decks, on 9 columns.",
      difficulty: Difficulty.EASY,
      decks: 2,
      allCardsVisible: false,
    },
    montana: {
      family: "other",
      tagline: "Move cards into the gaps to sort each row by suit, 2 to King.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      aliases: ["Gaps"],
      variants: [
        {
          name: "Addiction",
          values: { redeals: 3 },
          tagline: "Montana, but you get 3 redeals.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    bluemoon: {
      family: "other",
      tagline: "Montana with the Aces in play, at the start of each row.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Red Moon",
          values: storedValues("bluemoon", {
            variant: MontanaVariant.RED_MOON,
          }),
          tagline: "Blue Moon, but each gap starts next to an Ace.",
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
      tagline: "Discard any card that has a higher card of its suit showing.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
    },
    golf: {
      family: "golf",
      tagline:
        "Clear 7 columns by playing cards 1 rank up or down onto 1 pile.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Queens on Kings",
          values: storedValues("golf", {
            variant: GolfVariant.QUEENS_ON_KINGS,
          }),
          tagline: "Golf, but you can play a Queen on a King.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Putt Putt",
          values: storedValues("golf", { variant: GolfVariant.PUTT_PUTT }),
          tagline: "Golf, but the ranks wrap around from King to Ace.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    calculation: {
      family: "other",
      tagline: "Build 4 foundations, counting up by 1s, 2s, 3s and 4s.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Broken Intervals"],
      variants: [
        {
          name: "Sir Tommy",
          values: storedValues("calculation", {
            variant: CalculationVariant.SIR_TOMMY,
          }),
          tagline:
            "Calculation, but every foundation goes up by 1 from an Ace.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Old Patience"],
        },
      ],
    },
    flowergarden: {
      family: "other",
      tagline: "6 beds, and a bouquet of 16 cards you can play at any time.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      aliases: ["The Garden", "Bouquet"],
    },
    bristol: {
      family: "fan",
      tagline: "8 fans, and 3 reserves that the stock deals onto.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Belvedere",
          values: storedValues("bristol", {
            variant: BristolVariant.BELVEDERE,
          }),
          tagline: "Bristol, but 1 Ace starts on a foundation.",
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
      tagline: "Pair touching cards in a 5 by 5 grid, then close the gaps.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Weddings"],
      variants: [
        {
          name: "Monte Carlo Thirteens",
          values: storedValues("montecarlo", {
            variant: MonteCarloVariant.THIRTEENS,
          }),
          tagline: "Monte Carlo, but the pairs add up to 13.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    labellelucie: {
      family: "fan",
      tagline: "18 fans built down by suit, with 2 redeals.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
      aliases: ["Fair Lucy", "Midnight Oil"],
      variants: [
        {
          name: "The Fan",
          values: storedValues("labellelucie", {
            variant: LaBelleLucieVariant.THE_FAN,
          }),
          tagline:
            "La Belle Lucie with no redeals, and Kings can fill empty fans.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Shamrocks",
          values: storedValues("labellelucie", {
            variant: LaBelleLucieVariant.SHAMROCKS,
          }),
          tagline:
            "La Belle Lucie, but you build up or down in any suit, with no redeals.",
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
        "Clear a 13-card reserve. Foundations start at the rank the deal turns up.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Demon", "Fascination"],
      variants: [
        {
          name: "Storehouse",
          values: storedValues("canfield", {
            variant: CanfieldVariant.STOREHOUSE,
          }),
          tagline:
            "Canfield, but the Twos start the foundations and you build by suit.",
          difficulty: Difficulty.MEDIUM,
          aliases: ["Thirteen Up", "Reserve"],
        },
        {
          name: "Superior Canfield",
          values: storedValues("canfield", {
            variant: CanfieldVariant.SUPERIOR,
          }),
          tagline:
            "Canfield with the reserve face up, and any card can fill an empty column.",
          difficulty: Difficulty.MEDIUM,
        },
        {
          name: "Rainbow",
          values: storedValues("canfield", {
            variant: CanfieldVariant.RAINBOW,
          }),
          tagline:
            "Canfield, but you build down in any suit. Draw 1, with no redeals.",
          difficulty: Difficulty.HARD,
        },
      ],
    },
    penguin: {
      family: "freecell",
      tagline:
        "7 columns, 7 cells. Foundations start at the rank of the first card dealt.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    blackhole: {
      family: "golf",
      tagline: "Play every card into the hole, 1 rank up or down.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    allinarow: {
      family: "golf",
      tagline:
        "13 columns of 4. Play every card onto 1 pile, starting with any card.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
    },
    grandfathersclock: {
      family: "other",
      tagline: "Build 12 foundations around a clock face, each up to its hour.",
      difficulty: Difficulty.EASY,
      decks: 1,
      allCardsVisible: true,
      aliases: ["Clock"],
    },
    pyramid: {
      family: "pairing",
      tagline: "Pair free cards that add up to 13 to take the pyramid apart.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: false,
      variants: [
        {
          name: "Relaxed Pyramid",
          values: storedValues("pyramid", { goal: PyramidGoal.PYRAMID_ONLY }),
          tagline: "Pyramid, but you win when the pyramid is clear.",
          difficulty: Difficulty.MEDIUM,
        },
      ],
    },
    tripeaks: {
      family: "golf",
      tagline:
        "Clear 3 peaks by playing cards 1 rank up or down onto the waste.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Three Peaks", "Tri Towers"],
    },
    beleagueredcastle: {
      family: "castle",
      tagline: "8 open rows around the Aces. Move 1 card at a time.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: true,
      variants: [
        {
          name: "Streets and Alleys",
          values: storedValues("beleagueredcastle", {
            variant: CastleVariant.STREETS_AND_ALLEYS,
          }),
          tagline: "Beleaguered Castle, but the Aces are dealt into the rows.",
          difficulty: Difficulty.HARD,
        },
        {
          name: "Citadel",
          values: storedValues("beleagueredcastle", {
            variant: CastleVariant.CITADEL,
          }),
          tagline:
            "Beleaguered Castle, but cards go to the foundations during the deal.",
          difficulty: Difficulty.EASY,
        },
      ],
    },
    fortress: {
      family: "castle",
      tagline: "Free the Aces from 10 open rows, building up or down by suit.",
      difficulty: Difficulty.HARD,
      decks: 1,
      allCardsVisible: true,
    },
    pokersquares: {
      family: "other",
      tagline: "Place 25 cards in a grid to make 10 poker hands.",
      difficulty: Difficulty.MEDIUM,
      decks: 1,
      allCardsVisible: false,
      aliases: ["Poker Solitaire"],
    },
  },
};
