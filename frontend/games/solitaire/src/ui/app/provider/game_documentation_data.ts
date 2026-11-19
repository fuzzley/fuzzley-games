import { InjectionToken } from "@angular/core";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import type { GameDocumentation } from "../model/game_documentation.model";
import { type GameId, storedValue } from "./game_catalog";

/**
 * Maps a game id to its documentation, as a consumer receives it.
 *
 * Loose in its keys so a spec can document only the games it offers; what
 * ships is held to {@link CompleteGameDocumentation}.
 */
export type GameDocumentationRegistry = Readonly<
  Record<string, GameDocumentation>
>;

/**
 * Maps every game in the catalog to its documentation, so a game without a
 * rules page does not compile.
 */
export type CompleteGameDocumentation = Readonly<
  Record<GameId, GameDocumentation>
>;

/** The documentation the application shows, as a token a spec can replace. */
export const GAME_DOCUMENTATION = new InjectionToken<GameDocumentationRegistry>(
  "GAME_DOCUMENTATION",
  {
    providedIn: "root",
    factory: () => GAME_DOCUMENTATION_REGISTRY,
  },
);

/** The rules page of every game in the catalog. */
export const GAME_DOCUMENTATION_REGISTRY: GameDocumentationRegistry &
  CompleteGameDocumentation = {
  klondike: {
    title: "Klondike Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/klondike/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 7 columns below.",
      altText:
        "A new game of Klondike, with 1 card face up on each of 7 columns.",
    },
    summary: {
      facts: "1 deck. Draw 1 or Draw 3.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 4 empty piles.",
        "Tableau: 7 columns of 1 to 7 cards. Only the top card is face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "Click the stock to turn over 1 card, or 3 in Draw 3.",
        "You can move a face-up run as one.",
        "Only a King can fill an empty column.",
        "When the stock runs out, click it to turn the waste over and go through it again.",
      ],
      goodToKnow: ["You can take a card back from a foundation."],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game.",
          },
          {
            value: 1,
            effect:
              "Every card in the columns is dealt face up. Columns build down in the same color. Any card can fill an empty column.",
          },
          {
            value: 2,
            effect:
              "A 9 of hearts goes on any 10 except the 10 of hearts. Any card can fill an empty column.",
          },
          {
            value: 3,
            effect:
              "Every card in the columns is dealt face up. The other rules are the same as Klondike.",
          },
        ],
      },
      {
        optionId: "drawCount",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "You turn over 1 card at a time, so you can reach every card in the stock.",
          },
          {
            value: 3,
            effect:
              "You turn over 3 cards at a time, and you can only play the top one.",
          },
        ],
      },
      {
        optionId: "scoring",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "You score 10 points for each card you put on a foundation. Going through the stock again can cost points.",
          },
          {
            value: 1,
            effect:
              "You pay $52 for the deck and win $5 for each card on a foundation. 1 pass through the stock in Draw 1, 3 in Draw 3.",
          },
        ],
      },
    ],
  },
  freecell: {
    title: "FreeCell",
    wikipediaUrl: "https://en.wikipedia.org/wiki/FreeCell",
    screenshot: {
      url: "./docs/screenshots/freecell/overview.webp",
      caption:
        "A new deal, with the free cells at the top left and 8 columns below.",
      altText: "A new game of FreeCell, with every card face up in 8 columns.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Free cells: 4 spaces, for 1 card each.",
        "Foundations: 4 empty piles.",
        "Tableau: 8 columns of 6 or 7 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can move the top card of a column to an empty free cell.",
        "Any card can fill an empty column.",
        "You can move several cards at once if there are enough free cells and empty columns to move them one at a time. With 2 free cells and no empty column, that is 3 cards.",
      ],
      goodToKnow: [
        "When you move cards into an empty column, that column doesn't count toward how many you can move.",
      ],
    },
    settingsAndVariants: [],
  },
  spider: {
    title: "Spider Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Spider_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/spider/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 8 foundations beside it.",
      altText:
        "A new game of Spider, with 10 columns and 1 card face up on each.",
    },
    summary: {
      facts: "2 decks. 1, 2 or 4 suits. No redeal.",
      goal: "Clear the table by building 8 runs, each from King down to Ace in a single suit.",
    },
    detailedRules: {
      layout: [
        "Stock: the 50 cards left over, face down.",
        "Foundations: 8 empty piles, where finished runs go.",
        "Tableau: 10 columns of 5 or 6 cards. Only the top card is face up.",
      ],
      moves: [
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can move several cards at once only if they run down in the same suit.",
        "Any card or run can fill an empty column.",
        "Click the stock to deal 1 card face up onto every column.",
        "When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.",
      ],
      goodToKnow: ["You can't deal from the stock while a column is empty."],
    },
    settingsAndVariants: [
      {
        optionId: "suitCount",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "All 104 cards are spades, so any run you build can be moved and finished.",
          },
          {
            value: 2,
            effect: "Half the cards are spades and half are hearts.",
          },
          {
            value: 4,
            effect:
              "2 full decks in all 4 suits. This is the usual game, and the hardest.",
          },
        ],
      },
    ],
  },
  yukon: {
    title: "Yukon Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Yukon_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/yukon/overview.webp",
      caption: "A new deal, with 4 foundations at the top and 7 columns below.",
      altText:
        "A new game of Yukon, with most of the cards face up in 7 columns.",
    },
    summary: {
      facts: "1 deck, all dealt to the columns. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 empty piles.",
        "Tableau: 7 columns. The first has 1 card. The others have 1 to 6 face-down cards under 5 face-up ones.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can pick up any face-up card, with all the cards on top of it.",
        "Only a King can fill an empty column.",
      ],
      goodToKnow: [
        "The cards on top don't need to be in order. Only the card you pick up has to fit where it goes.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: storedValue("yukon", "variant", YukonVariant.YUKON),
            effect: "The usual game. Columns build down in alternating colors.",
          },
          {
            value: storedValue("yukon", "variant", YukonVariant.ALASKA),
            effect:
              "Columns build up or down by suit. A 9 of hearts goes on the 8 or the 10 of hearts.",
          },
          {
            value: storedValue("yukon", "variant", YukonVariant.RUSSIAN),
            effect:
              "Columns build down by suit instead of alternating colors. It is much harder than Yukon.",
          },
          {
            value: storedValue("yukon", "variant", YukonVariant.MOOSEHIDE),
            effect:
              "Columns build down in another suit. A 9 of hearts goes on any 10 except the 10 of hearts.",
          },
        ],
      },
    ],
  },
  bakers: {
    title: "Baker's Game",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Baker%27s_Game",
    screenshot: {
      url: "./docs/screenshots/bakers/overview.webp",
      caption:
        "A new deal, with the free cells at the top left and 8 columns below.",
      altText:
        "A new game of Baker's Game, with every card face up in 8 columns.",
    },
    summary: {
      facts: "FreeCell, building by suit. 1 deck, all dealt face up.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Free cells: 4 spaces, for 1 card each.",
        "Foundations: 4 empty piles.",
        "Tableau: 8 columns of 6 or 7 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of spades goes on the 10 of spades.",
        "You can move the top card of a column to an empty free cell.",
        "Any card can fill an empty column, unless you choose Kings only.",
        "You can move several cards at once if there are enough free cells and empty columns to move them one at a time.",
      ],
      goodToKnow: [
        "When you move cards into an empty column, that column doesn't count toward how many you can move.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Any card can fill an empty column. Each empty column doubles how many cards you can move at once.",
          },
          {
            value: 1,
            effect:
              "Only a King can fill an empty column, and you can't use empty columns to move more cards at once.",
          },
        ],
      },
    ],
  },
  challengefreecell: {
    title: "Challenge FreeCell",
    screenshot: {
      url: "./docs/screenshots/challengefreecell/overview.webp",
      caption: "A new deal, where every column starts with an Ace or a 2.",
      altText:
        "A new game of Challenge FreeCell, with every card face up in 8 columns.",
    },
    summary: {
      facts:
        "FreeCell with every Ace and 2 dealt to the bottom. 1 deck, all face up.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Free cells: 4 spaces, for 1 card each.",
        "Foundations: 4 empty piles.",
        "Tableau: 8 columns of 6 or 7 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can move the top card of a column to an empty free cell.",
        "Any card can fill an empty column, unless you choose Kings only.",
        "You can move several cards at once if there are enough free cells and empty columns to move them one at a time.",
      ],
      goodToKnow: [
        "You can't start a foundation until you clear all the cards off an Ace.",
        "If you move cards into an empty column, that column doesn't count.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Any card can fill an empty column. Each empty column doubles how many cards you can move at once.",
          },
          {
            value: 1,
            effect:
              "Only a King can fill an empty column, and you can't use empty columns to move more cards at once.",
          },
        ],
      },
    ],
  },
  eightoff: {
    title: "Eight Off",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Eight_Off",
    screenshot: {
      url: "./docs/screenshots/eightoff/overview.webp",
      caption: "A new deal, with 4 of the 8 free cells holding a card.",
      altText: "A new game of Eight Off, with 8 columns of 6 cards face up.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Free cells: 8 spaces, for 1 card each. 4 of them start with a card.",
        "Foundations: 4 empty piles.",
        "Tableau: 8 columns of 6 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of spades goes on the 10 of spades.",
        "You can move the top card of a column to an empty free cell.",
        "Only a King can fill an empty column.",
        "You can move several cards at once if there are enough empty free cells to move them one at a time. With 4 empty free cells, that is 5 cards.",
      ],
      goodToKnow: [
        "Unlike in FreeCell, you can't use an empty column to move more cards at once.",
      ],
    },
    settingsAndVariants: [],
  },
  scorpion: {
    title: "Scorpion Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Scorpion_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/scorpion/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 7 columns below.",
      altText:
        "A new game of Scorpion, with face-down cards in the first 4 columns.",
    },
    summary: {
      facts: "1 deck. A stock of 3 cards, dealt once.",
      goal: "Clear the table by building 4 runs, each from King down to Ace in a single suit.",
    },
    detailedRules: {
      layout: [
        "Stock: the 3 cards left over, face down.",
        "Foundations: 4 empty piles, where finished runs go.",
        "Tableau: 7 columns of 7 cards. The first 4 have 3 face-down cards under 4 face-up ones.",
      ],
      moves: [
        "Tableau: build down by suit. The 9 of spades goes on the 10 of spades.",
        "You can pick up any face-up card, with all the cards on top of it.",
        "Only a King can fill an empty column.",
        "Click the stock to deal its 3 cards face up onto the first 3 columns.",
        "When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.",
      ],
      goodToKnow: ["The cards on top don't need to be in order."],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The usual game. Only a King can fill an empty column, and 4 columns start with 3 face-down cards.",
          },
          {
            value: 1,
            effect:
              "Scorpion, but any card can fill an empty column, with all the cards on top of it.",
          },
          {
            value: 2,
            effect:
              "Only the first 3 columns have face-down cards, so 9 start hidden instead of 12.",
          },
        ],
      },
    ],
  },
  simplesimon: {
    title: "Simple Simon",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Simple_Simon_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/simplesimon/overview.webp",
      caption: "A new deal, with 10 columns stepping down from 8 cards to 1.",
      altText:
        "A new game of Simple Simon, with every card face up in 10 columns.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Clear the table by building 4 runs, each from King down to Ace in a single suit.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 empty piles, where finished runs go.",
        "Tableau: 10 columns. The first 3 have 8 cards, and the rest go down from 7 to 1.",
      ],
      moves: [
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can move several cards at once only if they run down in the same suit.",
        "Any card or run can fill an empty column.",
        "When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.",
      ],
    },
    settingsAndVariants: [],
  },
  mrsmop: {
    title: "Mrs. Mop",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Mrs._Mop",
    screenshot: {
      url: "./docs/screenshots/mrsmop/overview.webp",
      caption:
        "A new deal, with 8 foundations at the top and 13 columns below.",
      altText: "A new game of Mrs. Mop, with 13 columns of 8 cards face up.",
    },
    summary: {
      facts: "Simple Simon with 2 decks, on 13 columns. No stock.",
      goal: "Clear the table by building 8 runs, each from King down to Ace in a single suit.",
    },
    detailedRules: {
      layout: [
        "Foundations: 8 empty piles, where finished runs go.",
        "Tableau: 13 columns of 8 cards, all face up.",
      ],
      moves: [
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can move several cards at once only if they run down in the same suit.",
        "Any card or run can fill an empty column.",
        "When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.",
      ],
    },
    settingsAndVariants: [],
  },
  bakersdozen: {
    title: "Baker's Dozen",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Baker's_Dozen_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/bakersdozen/overview.webp",
      caption:
        "A new deal, with the foundations at the top right and 13 columns below.",
      altText:
        "A new game of Baker's Dozen, with 13 columns of 4 cards face up.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 empty piles.",
        "Tableau: 13 columns of 4 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can only move the top card of a column, 1 card at a time.",
        "Nothing can fill an empty column, so once a column is empty it stays empty.",
      ],
      goodToKnow: [
        "A King can never move to another column. So the deal puts every King under the other cards in its column.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  seahaven: {
    title: "Seahaven Towers",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Seahaven_Towers",
    screenshot: {
      url: "./docs/screenshots/seahaven/overview.webp",
      caption: "A new deal, with 2 of the 4 free cells holding a card.",
      altText:
        "A new game of Seahaven Towers, with 10 columns of 5 cards face up.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Free cells: 4 spaces, for 1 card each. 2 of them start with a card.",
        "Foundations: 4 empty piles.",
        "Tableau: 10 columns of 5 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of spades goes on the 10 of spades.",
        "You can move the top card of a column to an empty free cell.",
        "Only a King can fill an empty column.",
        "You can move several cards at once if there are enough empty free cells to move them one at a time. With 2 empty free cells, that is 3 cards.",
      ],
      goodToKnow: [
        "Unlike in FreeCell, you can't use an empty column to move more cards at once.",
      ],
    },
    settingsAndVariants: [],
  },
  spiderette: {
    title: "Spiderette",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Spiderette",
    screenshot: {
      url: "./docs/screenshots/spiderette/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 4 foundations beside it.",
      altText:
        "A new game of Spiderette, with 7 columns and 1 card face up on each.",
    },
    summary: {
      facts: "Spider with 1 deck, on 7 columns. No redeal.",
      goal: "Clear the table by building 4 runs, each from King down to Ace in a single suit.",
    },
    detailedRules: {
      layout: [
        "Stock: the 24 cards left over, face down.",
        "Foundations: 4 empty piles, where finished runs go.",
        "Tableau: 7 columns of 1 to 7 cards. Only the top card is face up.",
      ],
      moves: [
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can move several cards at once only if they run down in the same suit.",
        "Any card or run can fill an empty column.",
        "Click the stock to deal 1 card face up onto every column.",
        "When you finish a run from King to Ace in a single suit, it moves to a foundation on its own.",
      ],
      goodToKnow: [
        "Unlike in Spider, you can deal from the stock while a column is empty.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Columns of 1 to 7 cards, like Klondike, with 24 cards in the stock.",
          },
          {
            value: 1,
            effect:
              "Spiderette with 3 cards in every column, 1 face up. Fewer cards start hidden, and the stock has 31.",
          },
        ],
      },
    ],
  },
  easthaven: {
    title: "Easthaven",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Easthaven_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/easthaven/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 7 columns below.",
      altText:
        "A new game of Easthaven, with 1 card face up on each of 7 columns.",
    },
    summary: {
      facts: "1 deck. The stock deals a row at a time. No redeal.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the 31 cards left over, face down.",
        "Foundations: 4 empty piles.",
        "Tableau: 7 columns of 3 cards. Only the top card is face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can move several cards at once only if they run down in alternating colors.",
        "Only a King can fill an empty column.",
        "Click the stock to deal 1 card face up onto every column.",
      ],
      goodToKnow: [
        "You can't deal from the stock while a column is empty.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  fortythieves: {
    title: "Forty Thieves",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/fortythieves/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 8 foundations beside it.",
      altText:
        "A new game of Forty Thieves, with 10 columns of 4 cards face up.",
    },
    summary: {
      facts: "2 decks. Draw 1. No redeal.",
      goal: "Move all 104 cards to the 8 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the 64 cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 8 empty piles.",
        "Tableau: 10 columns of 4 cards, all face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of spades goes on the 10 of spades.",
        "You can only move 1 card at a time, from the top of a column or the waste.",
        "Any card can fill an empty column.",
        "Click the stock to turn over 1 card.",
      ],
      goodToKnow: ["You can take a card back from a foundation."],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The usual game. Columns build down by suit, and you move 1 card at a time.",
          },
          {
            value: 1,
            effect:
              "Forty Thieves, but you can move a run of cards in the same suit as one.",
          },
          {
            value: 2,
            effect:
              "Build down in alternating colors and move runs as one. Each column has 3 face-down cards under 1 face-up card.",
          },
          {
            value: 5,
            effect:
              "Columns of 3 cards, 1 face down. Build down in any other suit, 1 card at a time.",
          },
          {
            value: 6,
            effect:
              "Build down in alternating colors and move runs as one. Each column has 2 face-down cards under 2 face-up ones.",
          },
        ],
      },
    ],
  },
  maria: {
    title: "Maria",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/maria/overview.webp",
      caption:
        "A new deal, with the stock at the top left and 9 columns below.",
      altText: "A new game of Maria, with 9 columns of 4 cards face up.",
    },
    summary: {
      facts:
        "Forty Thieves on 9 columns, in alternating colors. 2 decks. Draw 1. No redeal.",
      goal: "Move all 104 cards to the 8 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the 68 cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 8 empty piles.",
        "Tableau: 9 columns of 4 cards, all face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can move several cards at once only if they run down in alternating colors.",
        "Any card can fill an empty column.",
        "Click the stock to turn over 1 card.",
      ],
      goodToKnow: ["You can take a card back from a foundation."],
    },
    settingsAndVariants: [],
  },
  limited: {
    title: "Limited",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/limited/overview.webp",
      caption:
        "A new deal, with the stock and 8 foundations above 12 short columns.",
      altText:
        "A new game of Limited, with 3 face-up cards on each of 12 columns.",
    },
    summary: {
      facts: "2 decks. Draw 1. No redeal.",
      goal: "Move all 104 cards to the 8 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the 68 cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 8 empty piles.",
        "Tableau: 12 columns of 3 cards, all face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. A 9 of spades goes on a 10 of spades.",
        "You can move several cards at once if they run down in the same suit.",
        "Any card can fill an empty column.",
        "Click the stock to turn over 1 card.",
      ],
      goodToKnow: [
        "It is Forty Thieves on 12 columns of 3, except that you can move runs.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  lucas: {
    title: "Lucas",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/lucas/overview.webp",
      caption:
        "A new deal, with all 8 Aces on the foundations and 13 short columns.",
      altText: "A new game of Lucas, with 8 Aces above 13 columns of 3 cards.",
    },
    summary: {
      facts: "2 decks. Draw 1. No redeal.",
      goal: "Move all 104 cards to the 8 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the 57 cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 8 piles, each started with an Ace.",
        "Tableau: 13 columns of 3 cards, all face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. A 9 of spades goes on a 10 of spades.",
        "You can move several cards at once if they run down in the same suit.",
        "Any card can fill an empty column.",
        "Click the stock to turn over 1 card.",
      ],
      goodToKnow: [
        "It is Forty Thieves on 13 columns of 3, with the Aces dealt first. Here you can move runs.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  doubleklondike: {
    title: "Double Klondike",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/doubleklondike/overview.webp",
      caption: "A new deal, with the stock and 8 foundations above 9 columns.",
      altText: "A new game of Double Klondike, with 9 columns of 1 to 9 cards.",
    },
    summary: {
      facts: "2 decks. Draw 3. No limit on redeals.",
      goal: "Move all 104 cards to the 8 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Stock: the cards left over, face down.",
        "Waste: the cards you turn over. You can play the top one.",
        "Foundations: 8 empty piles.",
        "Tableau: 9 columns of 1 to 9 cards. Only the top card is face up.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in alternating colors. A red 9 goes on a black 10.",
        "You can move a face-up run as one.",
        "Only a King can fill an empty column.",
        "Click the stock to turn over 3 cards.",
        "When the stock runs out, click it to turn the waste over and go through it again.",
      ],
      goodToKnow: [
        "After the 3rd redeal, each one costs 20 points.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  montana: {
    title: "Montana",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Montana_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/montana/overview.webp",
      caption:
        "A new deal, with 4 rows of cards, 4 gaps and the redeal button.",
      altText: "A new game of Montana, with 48 cards in 4 rows and 4 gaps.",
    },
    summary: {
      facts: "1 deck without the Aces, all dealt face up. 2 or 3 redeals.",
      goal: "Put each row in order in one suit, from 2 at the left to King.",
    },
    detailedRules: {
      layout: [
        "Grid: 4 rows of 13 spaces, with 48 cards and 4 gaps.",
        "Redeal: a button that shuffles the cards out of place. Its dots show the redeals you have left.",
      ],
      moves: [
        "You can fill a gap with the card 1 rank higher than the card left of the gap, in the same suit. The 7 of hearts goes after the 6 of hearts.",
        "Any 2 can go in a gap at the left end of a row.",
        "Nothing can go in a gap after a King.",
      ],
      goodToKnow: [
        "When you redeal, the cards already in order at the left of a row stay put. The rest are shuffled and dealt again. Each row gets 1 gap, just after the cards that stayed.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "redeals",
        choicesExplanation: [
          {
            value: 2,
            effect: "The usual game.",
          },
          {
            value: 3,
            effect: "Montana with 3 redeals instead of 2.",
          },
        ],
      },
    ],
  },
  bluemoon: {
    title: "Blue Moon",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaps",
    screenshot: {
      url: "./docs/screenshots/bluemoon/overview.webp",
      caption: "A new deal, with an Ace at the start of each row and 4 gaps.",
      altText: "A new game of Blue Moon, with 52 cards in 4 rows and 4 gaps.",
    },
    summary: {
      facts: "1 deck, all dealt face up. 2 redeals.",
      goal: "Put each row in order in one suit, from the Ace at the left to King.",
    },
    detailedRules: {
      layout: [
        "Grid: 4 rows of 14 spaces. Each row starts with an Ace, and there are 4 gaps.",
        "Redeal: a button that shuffles the cards out of place. Its dots show the redeals you have left.",
      ],
      moves: [
        "You can fill a gap with the card 1 rank higher than the card left of the gap, in the same suit. The 7 of hearts goes after the 6 of hearts.",
        "Nothing can go in a gap after a King.",
        "The Aces never move.",
      ],
      goodToKnow: [
        "It is Montana with the Aces in play.",
        "When you redeal, the cards already in order at the left of a row stay put. The rest are shuffled and dealt again. Each row gets 1 gap, just after the cards that stayed.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "The Aces move to the start of the rows, and the gaps are left where the Aces were dealt.",
          },
          {
            value: 2,
            effect:
              "Each Ace starts a row with a gap right after it, so every row can take its 2 at once.",
          },
        ],
      },
    ],
  },
  bisley: {
    title: "Bisley",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Bisley_(card_game)",
    screenshot: {
      url: "./docs/screenshots/bisley/overview.webp",
      caption:
        "A new deal, with the Aces and the empty King foundations above 13 columns.",
      altText: "A new game of Bisley, with 4 Aces above 13 face-up columns.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the foundations, building each suit up from its Ace and down from its King.",
    },
    detailedRules: {
      layout: [
        "Ace foundations: 4 piles, each started with an Ace.",
        "King foundations: 4 empty piles.",
        "Tableau: 13 columns, 4 of them with 3 cards and 9 with 4.",
      ],
      moves: [
        "Ace foundations: build up by suit.",
        "King foundations: the Kings go in the same suit order as the Aces. Then build down by suit.",
        "Tableau: build up or down by suit. The 7 of clubs goes on the 6 or the 8 of clubs.",
        "You can only move the top card of a column.",
        "An empty column stays empty.",
      ],
      goodToKnow: [
        "The 2 foundations of a suit can meet at any rank. When they hold all 13 cards, that suit is done.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  acesup: {
    title: "Aces Up",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aces_Up",
    screenshot: {
      url: "./docs/screenshots/acesup/overview.webp",
      caption:
        "A new deal, with the stock, 4 columns of 1 card and the empty discard.",
      altText:
        "A new game of Aces Up, with 1 face-up card on each of 4 columns.",
    },
    summary: {
      facts: "1 deck. No redeal.",
      goal: "Discard every card except the 4 Aces.",
    },
    detailedRules: {
      layout: [
        "Stock: the 48 cards left over, face down.",
        "Tableau: 4 columns, each dealt 1 card to start.",
        "Discard: where the cards you discard go.",
      ],
      moves: [
        "You can discard the top card of a column if another column has a higher card of the same suit on top.",
        "Aces are high, so you can never discard one.",
        "You can move the top card of a column into an empty column.",
        "Click the stock to deal 1 card onto each column.",
      ],
      goodToKnow: [
        "You can deal whenever you like, even with moves left.",
        "Each deal covers the cards below. To reach them, discard the top card or move it into an empty column.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game. Any top card can fill an empty column.",
          },
          {
            value: 1,
            effect:
              "Only an Ace can fill an empty column, which makes the game much harder.",
          },
        ],
      },
    ],
  },
  golf: {
    title: "Golf",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Golf_(patience)",
    screenshot: {
      url: "./docs/screenshots/golf/overview.webp",
      caption:
        "A new deal, with the stock, 1 card on the foundation and 7 columns.",
      altText: "A new game of Golf, with 5 face-up cards on each of 7 columns.",
    },
    summary: {
      facts: "1 deck. No redeal.",
      goal: "Clear all 7 columns by playing their cards onto the foundation.",
    },
    detailedRules: {
      layout: [
        "Stock: the 16 cards left over, face down.",
        "Foundation: 1 pile, started with a card from the deal.",
        "Tableau: 7 columns of 5 cards, all face up.",
      ],
      moves: [
        "You can play the top card of a column on the foundation if it is 1 rank higher or lower, in any suit. A 9 or a Jack goes on a 10.",
        "Click a card to play it, or drag it.",
        "Nothing goes on a King, and only a 2 goes on an Ace.",
        "Click the stock to turn its top card onto the foundation, whatever its rank.",
      ],
      goodToKnow: [
        "You win when the columns are empty, even with cards left in the stock.",
        "You can't take a card back from the foundation.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The usual game. Nothing goes on a King, so a King blocks play until you turn the next card.",
          },
          {
            value: 1,
            effect:
              "Golf where a Queen can go on a King, so a King no longer blocks the foundation.",
          },
          {
            value: 2,
            effect:
              "Golf where Ace and King count as 1 rank apart, so no card blocks the foundation.",
          },
        ],
      },
    ],
  },
  calculation: {
    title: "Calculation",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Calculation_(card_game)",
    screenshot: {
      url: "./docs/screenshots/calculation/overview.webp",
      caption: "A new deal, with an Ace, 2, 3 and 4 starting the foundations.",
      altText:
        "A new game of Calculation, with 4 foundations started and 4 empty waste piles.",
    },
    summary: {
      facts: "1 deck. No redeal.",
      goal: "Build all 4 foundations up to King, each counting by its own step, in any suit.",
    },
    detailedRules: {
      layout: [
        "Stock: the cards left over, face down.",
        "Hand: the card you just turned over.",
        "Foundations: 4 piles, started with an Ace, 2, 3 and 4.",
        "Waste: 4 empty piles, for cards you can't play yet.",
      ],
      moves: [
        "Foundations: build up in any suit, each by the rank it started on.",
        "The foundation started on a 2 goes 2 4 6 8 10 Q A 3 5 7 9 J K.",
        "Click the stock to turn a card into your hand. Place it before you turn the next.",
        "You can put the card in your hand on a foundation or on any waste pile.",
        "You can only move the top card of a waste pile, and only to a foundation.",
      ],
      goodToKnow: ["You can't take a card back from a foundation."],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game.",
          },
          {
            value: 1,
            effect:
              "Calculation with empty foundations. Any Ace starts one, and each builds up by 1 in any suit.",
          },
        ],
      },
    ],
  },
  flowergarden: {
    title: "Flower Garden",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Flower_Garden_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/flowergarden/overview.webp",
      caption: "A new deal, with the bouquet fanned out above 6 columns.",
      altText:
        "A new game of Flower Garden, with a 16-card bouquet and 6 columns of 6.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Bouquet: 16 cards. You can play any of them.",
        "Foundations: 4 empty piles.",
        "Tableau: 6 columns of 6 cards.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can play any card in the bouquet on a foundation or a column.",
        "You can only move the top card of a column.",
        "Any card can fill an empty column.",
        "Nothing goes back into the bouquet.",
      ],
      goodToKnow: ["You can take a card back from a foundation."],
    },
    settingsAndVariants: [],
  },
  bristol: {
    title: "Bristol",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Bristol_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/bristol/overview.webp",
      caption:
        "A new deal, with the stock, 3 reserves, 4 foundations and 8 columns.",
      altText:
        "A new game of Bristol, with 3 face-up cards on each of 8 columns.",
    },
    summary: {
      facts: "1 deck. No redeal.",
      goal: "Move all 52 cards to the 4 foundations, building each up from Ace to King in any suit.",
    },
    detailedRules: {
      layout: [
        "Stock: the 25 cards left over, face down.",
        "Reserves: 3 piles the stock deals onto. You can play the top card of each.",
        "Foundations: 4 empty piles.",
        "Tableau: 8 columns of 3 cards, all face up.",
      ],
      moves: [
        "Foundations: any Ace starts one. Then build up in any suit.",
        "Tableau: build down in any suit. Any 9 goes on any 10.",
        "You can only move the top card of a column or a reserve.",
        "Click the stock to deal 1 card onto each reserve.",
      ],
      goodToKnow: [
        "An empty column stays empty.",
        "Kings are dealt to the bottom of their columns, since a King can only go to a foundation.",
        "Dealing covers the reserve cards, so play what you can first.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game. Every foundation starts empty.",
          },
          {
            value: 1,
            effect:
              "Bristol with 1 Ace already on a foundation, and 24 cards in the stock.",
          },
        ],
      },
    ],
  },
  nestor: {
    title: "Nestor",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Nestor_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/nestor/overview.webp",
      caption:
        "A new deal, with 4 reserve cards above 8 columns and the empty discard.",
      altText:
        "A new game of Nestor, with 6 face-up cards on each of 8 columns.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Discard all 52 cards in pairs of the same rank.",
    },
    detailedRules: {
      layout: [
        "Reserve: 4 cards. You can play any of them.",
        "Discard: where the pairs go.",
        "Tableau: 8 columns of 6 cards.",
      ],
      moves: [
        "You can pair 2 cards of the same rank, in any suit. A 7 pairs with any 7.",
        "You can only use the top card of a column, or any reserve card.",
        "Drag one card onto the other, and both go to the discard.",
      ],
      goodToKnow: [
        "No column is dealt 2 cards of the same rank, unless the deal can't avoid it.",
      ],
    },
    settingsAndVariants: [],
  },
  montecarlo: {
    title: "Monte Carlo",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Monte_Carlo_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/montecarlo/overview.webp",
      caption: "A new deal, with the stock beside 25 cards in a 5 by 5 grid.",
      altText:
        "A new game of Monte Carlo, with 25 face-up cards in 5 rows of 5.",
    },
    summary: {
      facts: "1 deck. No redeal.",
      goal: "Discard all 52 cards in pairs of the same rank that touch.",
    },
    detailedRules: {
      layout: [
        "Stock: the 27 cards left over, face down.",
        "Grid: 5 rows of 5 cards, all face up.",
        "Discard: where the pairs go.",
      ],
      moves: [
        "You can pair 2 cards of the same rank if they touch, even at a corner.",
        "Drag one card onto the other, and both go to the discard.",
        "Click the stock to close the gaps. The cards left slide along in reading order to fill them. Then the stock fills the spaces at the end.",
      ],
      goodToKnow: [
        "Closing the gaps changes which cards touch, so choose your pairs with that in mind.",
        "When the stock is empty, click its place to close the gaps.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game. Pair touching cards of the same rank.",
          },
          {
            value: 1,
            effect:
              "Pair touching cards that add up to 13, with Jack 11 and Queen 12. Drag a King to the discard.",
          },
        ],
      },
    ],
  },
  labellelucie: {
    title: "La Belle Lucie",
    wikipediaUrl: "https://en.wikipedia.org/wiki/La_Belle_Lucie",
    screenshot: {
      url: "./docs/screenshots/labellelucie/overview.webp",
      caption:
        "A new deal, with the redeal space at the top left and 18 fans below.",
      altText:
        "A new game of La Belle Lucie, with every card face up in 18 fans.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock. 2 redeals.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 empty piles.",
        "Tableau: 17 fans of 3 cards and 1 fan of 1 card.",
        "Redeal: the space you click to redeal. Its dots show the redeals left.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of hearts goes on the 10 of hearts.",
        "You can only move the top card of a fan.",
        "An empty fan stays empty.",
        "When you redeal, the cards left in the fans are shuffled and dealt out again in fans of 3.",
      ],
      goodToKnow: [
        "A King can only go to a foundation. If it covers lower cards of the same suit, they are stuck until you redeal.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game.",
          },
          {
            value: 1,
            effect:
              "La Belle Lucie with no redeal, but a King can fill an empty fan.",
          },
          {
            value: 2,
            effect:
              "La Belle Lucie with no redeal. Fans build up or down in any suit, and hold 3 cards at most.",
          },
        ],
      },
    ],
  },
  trefoil: {
    title: "Trefoil",
    wikipediaUrl: "https://en.wikipedia.org/wiki/La_Belle_Lucie",
    screenshot: {
      url: "./docs/screenshots/trefoil/overview.webp",
      caption:
        "A new deal, with the 4 Aces on the foundations and 16 fans below.",
      altText:
        "A new game of Trefoil, with the 4 Aces on the foundations and 16 fans.",
    },
    summary: {
      facts:
        "La Belle Lucie with the Aces already on the foundations. 1 deck, all face up. 2 redeals.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 piles, each started with an Ace.",
        "Tableau: 16 fans of 3 cards.",
        "Redeal: the space you click to redeal. Its dots show the redeals left.",
      ],
      moves: [
        "Foundations: build up by suit, from Ace to King.",
        "Tableau: build down by suit. The 9 of hearts goes on the 10 of hearts.",
        "You can only move the top card of a fan.",
        "An empty fan stays empty.",
        "When you redeal, the cards left in the fans are shuffled and dealt out again in fans of 3.",
      ],
      goodToKnow: [
        "A King can only go to a foundation. If it covers lower cards of the same suit, they are stuck until you redeal.",
        "You can take a card back from a foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  canfield: {
    title: "Canfield",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Canfield_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/canfield/overview.webp",
      caption:
        "A new deal, with the reserve under the stock and 4 columns of 1 card.",
      altText: "A new game of Canfield, with a King on the first foundation.",
    },
    summary: {
      facts: "1 deck. Draw 3. Unlimited redeals.",
      goal: "Move all 52 cards to the 4 foundations, building each suit up from the rank the deal turns over.",
    },
    detailedRules: {
      layout: [
        "Stock: the cards left over.",
        "Waste: the cards you turn over.",
        "Reserve: 13 cards. You can play the top one.",
        "Foundations: 4 piles, 1 started by the deal.",
        "Tableau: 4 columns of 1 card.",
      ],
      moves: [
        "Foundations: build up by suit. If the first card is a 7, each suit goes 7 to King, then Ace to 6.",
        "Tableau: build down in alternating colors, and a King can go on an Ace.",
        "You can move a run as one.",
        "Click the stock to turn over 3 cards, and the empty stock to turn the waste back over.",
      ],
      goodToKnow: [
        "The top card of the reserve fills an empty column at once. Once the reserve is gone, only the top card of the waste can fill it.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "The usual game.",
          },
          {
            value: 1,
            effect:
              "Canfield with the 4 Twos dealt to the foundations. Columns build down by suit. Draw 1, with 2 redeals.",
          },
          {
            value: 2,
            effect:
              "Canfield with the reserve face up. You fill empty columns yourself, with any card or run.",
          },
          {
            value: 3,
            effect:
              "Canfield with columns that build down in any suit. Draw 1, and no redeal.",
          },
        ],
      },
    ],
  },
  penguin: {
    title: "Penguin",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Penguin_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/penguin/overview.webp",
      caption:
        "A new deal, with 3 foundations started and 7 columns of 7 cards.",
      altText:
        "A new game of Penguin, with 49 cards face up in 7 columns of 7.",
    },
    summary: {
      facts: "1 deck, all face up. No stock.",
      goal: "Move all 52 cards to the 4 foundations, building up by suit from the rank of the first card dealt.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns of 7. The first card dealt is under 6 others in the first column.",
        "Foundations: 4 piles, 3 started by the deal.",
        "Free cells: 7 spaces, for 1 card each.",
      ],
      moves: [
        "Foundations: build up by suit. After the King comes the Ace.",
        "Tableau: build down by suit. A King goes on an Ace.",
        "You can move a run as one, however few free cells are empty.",
        "You can move the top card of a column to an empty free cell.",
        "Only a card 1 rank below the first card dealt, or a run starting with one, can fill an empty column. If it is a 5, that is a 4.",
      ],
      goodToKnow: [
        "To start the fourth foundation, dig out the first card dealt.",
      ],
    },
    settingsAndVariants: [],
  },
  blackhole: {
    title: "Black Hole",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Black_Hole_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/blackhole/overview.webp",
      caption: "A new deal, with the Ace of spades in the hole and 17 fans.",
      altText: "A new game of Black Hole, with the Ace of spades in the hole.",
    },
    summary: {
      facts: "1 deck, all dealt face up. No stock.",
      goal: "Play every card into the hole.",
    },
    detailedRules: {
      layout: [
        "Hole: 1 pile, started with the Ace of spades.",
        "Tableau: 17 fans of 3 cards.",
      ],
      moves: [
        "You can play the top card of a fan into the hole if it is 1 rank above or below the top card there. Suits don't matter, so any 5 goes on any 4 or 6.",
        "A King and an Ace count as 1 rank apart, so either can go on the other.",
        "Click a top card to play it, or drag it.",
        "Nothing goes on a fan. Cards only leave it.",
      ],
      goodToKnow: ["You can't take a card back out of the hole."],
    },
    settingsAndVariants: [],
  },
  allinarow: {
    title: "All in a Row",
    screenshot: {
      url: "./docs/screenshots/allinarow/overview.webp",
      caption:
        "A new deal, with the empty foundation above 13 columns of 4 cards.",
      altText: "A new game of All in a Row, with 13 columns of face-up cards.",
    },
    summary: {
      facts:
        "Black Hole with 13 columns and nothing on the foundation. 1 deck, all dealt face up. No stock.",
      goal: "Play every card onto the foundation.",
    },
    detailedRules: {
      layout: ["Foundation: 1 empty pile.", "Tableau: 13 columns of 4 cards."],
      moves: [
        "You can start the foundation with the top card of any column.",
        "After that, you can play a top card onto the foundation if it is 1 rank above or below the top card there. Suits don't matter, so any 5 goes on any 4 or 6.",
        "A King and an Ace count as 1 rank apart, so either can go on the other.",
        "Click a top card to play it, or drag it.",
        "Nothing goes on a column. Cards only leave it.",
      ],
      goodToKnow: [
        "The card you start with matters most. Look ahead before you play it.",
        "You can't take a card back off the foundation.",
      ],
    },
    settingsAndVariants: [],
  },
  grandfathersclock: {
    title: "Grandfather's Clock",
    screenshot: {
      url: "./docs/screenshots/grandfathersclock/overview.webp",
      caption:
        "Grandfather's Clock board showing twelve foundations laid round a dial at the left, from the Nine of Diamonds at twelve o'clock round to the Eight of Clubs at eleven, and eight face-up columns of five beside it.",
      altText: "Grandfather's Clock solitaire board overview",
    },
    summary: {
      facts: "",
      goal: "Build each of the twelve foundations round the dial up in suit until its top card shows the hour it stands at.",
    },
    detailedRules: {
      layout: [
        "Dial: 12 foundations in a circle at the left, started with the Two of Spades at five o'clock through to the King of Diamonds at four o'clock, the suits taken in turn: spades, hearts, clubs, diamonds.",
        "Tableau: 8 columns of 5 face-up cards beside the dial.",
      ],
      moves: [
        "Foundations: Built UP in SAME SUIT from their starting card, from King round to Ace, until the top card's rank is the hour — so those from five to twelve o'clock take three more cards, and those from one to four o'clock take four.",
        "Tableau: Built DOWN by RANK in ANY SUIT.",
        "Only the top card of a column can be moved, one card at a time.",
        "A card can go onto a column whose top card is exactly 1 rank higher, in any suit.",
        "Any card can fill an empty column.",
        "Double-press a card to send it to the foundation that takes it; each card fits only one.",
      ],
      goodToKnow: [
        "Telling the Time: Ace counts one, Jack eleven and Queen twelve; once a foundation shows its hour it is complete and takes nothing more.",
        "One of the more forgiving patiences: with spaces open to any card, most deals come out.",
      ],
    },
    settingsAndVariants: [],
  },
  pyramid: {
    title: "Pyramid",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Pyramid_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/pyramid/overview.webp",
      caption:
        "Pyramid board showing twenty-eight face-up cards in a pyramid of seven rows, the stock and hand at the top-left and the waste and discard at the top-right.",
      altText: "Pyramid solitaire board overview",
    },
    summary: {
      facts: "",
      goal: "Discard the whole deck in pairs that total thirteen, and Kings on their own.",
    },
    detailedRules: {
      layout: [
        "Pyramid: 28 face-up cards in 7 rows, each card half covered by the two below it.",
        "Stock: the other 24 cards, face-down at the top-left, with the hand beside it.",
        "Waste: the turned cards that found no pair, at the top-right; only its top card is free.",
        "Discard: a single pile at the top-right, initially empty.",
      ],
      moves: [
        "Nothing is built: cards only leave, two at a time or a King alone.",
        "Values: Ace 1, Two to Ten as marked, Jack 11, Queen 12, King 13.",
        "A free card is a pyramid card with nothing over it, the card in the hand, or the waste's top card.",
        "Drag a free card onto another free card that adds up to thirteen with it, and both go to the discard.",
        "Drag a King to the discard, or double-press it; it needs no partner.",
        "Double-press a free card to pair it with the first free partner.",
        "Press the stock to turn its top card into the hand; the card held there moves to the waste.",
      ],
      goodToKnow: [
        "Covered Cards: each pyramid card is held by the two cards that overlap it from below; it frees once both are gone.",
        "Passes: the stock is gone through once, or three times with the 3 Passes option, counted in pips on the empty stock.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "goal",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "All Cards: the game is won only once every card, stock and waste included, is discarded.",
          },
          {
            value: 1,
            effect:
              "Pyramid Only: Relaxed Pyramid — clearing the pyramid wins, whatever is left in the stock and waste.",
          },
        ],
      },
      {
        optionId: "passes",
        choicesExplanation: [
          {
            value: 1,
            effect: "1 Pass: the stock is gone through once.",
          },
          {
            value: 3,
            effect:
              "3 Passes: once the stock is out, pressing its slot turns the waste back over, twice per game — Par Pyramid's allowance.",
          },
        ],
      },
    ],
  },
  tripeaks: {
    title: "TriPeaks",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Tri_Peaks_(game)",
    screenshot: {
      url: "./docs/screenshots/tripeaks/overview.webp",
      caption:
        "TriPeaks board showing three overlapping peaks of face-down cards over a base of ten face-up cards, with the stock and the waste centred beneath.",
      altText: "TriPeaks solitaire board overview",
    },
    summary: {
      facts: "",
      goal: "Clear all three peaks by playing their cards onto the waste, one rank up or down at a time.",
    },
    detailedRules: {
      layout: [
        "Peaks: 28 cards — rows of 3, 6 and 9 face-down cards over a base of 10 face-up cards, each row half covering the one above.",
        "Stock: 23 face-down cards beneath the peaks, turned one at a time.",
        "Waste: a single pile beside the stock, started with one card from the deal.",
      ],
      moves: [
        "Waste: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent — a chain can climb, fall and turn the corner.",
        "Press an uncovered card to play it onto the waste, or drag it there.",
        "A card is uncovered once both cards overlapping it from below are gone, and turns face-up at that moment.",
        "Press the stock to turn its top card onto the waste, whatever its rank.",
      ],
      goodToKnow: [
        "One Pass: the stock is never recycled.",
        "Long Chains: the art is to keep a chain going as long as you can before turning the next stock card, and to uncover the face-down cards of all three peaks evenly.",
      ],
    },
    settingsAndVariants: [],
  },
  beleagueredcastle: {
    title: "Beleaguered Castle",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Beleaguered_Castle",
    screenshot: {
      url: "./docs/screenshots/beleagueredcastle/overview.webp",
      caption:
        "Beleaguered Castle board showing the four Aces in a column down the middle, and eight rows of six cards fanned sideways, four on each side.",
      altText: "Beleaguered Castle solitaire board overview",
    },
    summary: {
      facts: "",
      goal: "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 piles in a column down the middle, each started with an Ace.",
        "Rows: 8 rows of 6 face-up cards, fanned sideways, four on each side of the foundations.",
        "No Stock: every card is in view from the first move.",
      ],
      moves: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Rows: Built DOWN by RANK in ANY SUIT.",
        "Only the last card of a row — the one fully in view — can be moved, one card at a time.",
        "A card can go onto a row whose last card is exactly 1 rank higher, in any suit.",
        "Any card can fill an empty row.",
      ],
      goodToKnow: [
        "Every row fans to the right, so the free card of a row in the left wing is the one nearest the foundations.",
        "Empty Rows: with no cells, an empty row is the only place to park a card — they are worth more than any single move.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Beleaguered Castle: the Aces start on the foundations and the rows are dealt six each.",
          },
          {
            value: 1,
            effect:
              "Streets and Alleys: the Aces are shuffled in, so the left wing's rows are dealt seven cards and the right wing's six, and every foundation waits for its Ace to be dug out. Harder.",
          },
          {
            value: 2,
            effect:
              "Citadel: as Beleaguered Castle, but while the cards are dealt, any card that can go onto a foundation goes there at once, so the rows start shorter. Easier.",
          },
        ],
      },
    ],
  },
  fortress: {
    title: "Fortress",
    screenshot: {
      url: "./docs/screenshots/fortress/overview.webp",
      caption:
        "Fortress board showing four empty foundations in a column down the middle and ten rows fanned sideways, five on each side.",
      altText: "Fortress solitaire board overview",
    },
    summary: {
      facts: "",
      goal: "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 empty piles in a column down the middle.",
        "Rows: 10 face-up rows fanned sideways, five on each side — the first two of six cards, the rest of five.",
        "No Stock: every card is in view from the first move.",
      ],
      moves: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Rows: Built UP or DOWN in SAME SUIT, and a row may change direction.",
        "Only the last card of a row can be moved, one card at a time.",
        "A card can go onto a row whose last card is the same suit and exactly 1 rank higher or lower.",
        "Any card can fill an empty row.",
      ],
      goodToKnow: [
        "A Very Hard Game: with the Aces buried and no cells, PySol calls it a very hard game; plan the order the suits come home in before the first move.",
      ],
    },
    settingsAndVariants: [],
  },
  pokersquares: {
    title: "Poker Squares",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Poker_squares",
    screenshot: {
      url: "./docs/screenshots/pokersquares/overview.webp",
      caption:
        "Poker Squares board showing the stock and the card to place at the left, and the empty five-by-five grid beside them.",
      altText: "Poker Squares board overview",
    },
    summary: {
      facts: "",
      goal: "Place twenty-five cards in a five-by-five grid so its five rows and five columns make the best poker hands you can.",
    },
    detailedRules: {
      layout: [
        "Stock: the face-down cards at the top-left.",
        "Hand: the card to place next, beneath the stock.",
        "Grid: 25 empty squares in five rows of five.",
      ],
      moves: [
        "American scoring: royal flush 100, straight flush 75, four of a kind 50, full house 25, flush 20, straight 15, three of a kind 10, two pair 5, one pair 2.",
        "English scoring: royal or straight flush 30, four of a kind 16, straight 12, full house 10, three of a kind 6, flush 5, two pair 3, one pair 1.",
        "A straight can run from Ace to Five or from Ten to Ace, but not round the corner.",
        "Drag the card in the hand into any empty square; the next card turns up at once.",
        "A placed card never moves.",
        "Only 25 of the 52 cards are played: the game ends when the grid is full.",
      ],
      goodToKnow: [
        "Running Score: a line counts the pairs, threes and fours it already holds, so the score rises as you go; straights and flushes count once all five cards are in.",
        "Every Card Counts Twice: each square sits in one row and one column, so the art is to build flushes one way and pairs the other.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "scoring",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "American: flushes outscore straights, and a score of 200 wins.",
          },
          {
            value: 1,
            effect:
              "English: a straight is worth more than a flush or a full house, reflecting how hard straights are to build in the grid, and a score of 70 wins.",
          },
        ],
      },
    ],
  },
};
