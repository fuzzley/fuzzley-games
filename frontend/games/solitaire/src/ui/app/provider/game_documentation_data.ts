import { YukonVariant } from "@/games/yukon/yukon_rules";
import { GameDocumentation } from "../model/game_documentation.model";

/**
 * Registry containing comprehensive, verified documentation and hero screenshot visual aids
 * for all solitaire games in fSolitaire.
 */
export const GAME_DOCUMENTATION_REGISTRY: Readonly<
  Record<string, GameDocumentation>
> = {
  klondike: {
    title: "Klondike Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/klondike/overview.png",
      caption:
        "Klondike initial deal showing seven tableau columns, stock, waste, and four foundation piles.",
      altText: "Klondike solitaire board overview",
    },
    summary: {
      objective:
        "Build all 52 cards onto the four foundation piles by suit in ascending order from Ace to King.",
      winCondition:
        "All cards are transferred to the foundations (Ace through King for Hearts, Diamonds, Clubs, and Spades).",
      quickOverview:
        "Klondike is the classic solitaire game. Cards are dealt into 7 tableau columns with increasing hidden cards. Players draw cards from the stock to the waste pile and build tableau runs in descending rank with alternating colors.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns containing 1 to 7 cards respectively (top card face-up).",
        "Foundations: 4 suit piles, initially empty.",
        "Stock: Remaining cards face-down in top-left.",
        "Waste: Face-up pile where drawn cards land.",
      ],
      cardMovement: [
        "Cards on the waste pile or tableau columns can be moved to foundations or other tableau columns.",
        "Face-up sequences of cards in alternating colors can be moved together as a unit.",
        "Only a King (or a stack headed by a King) can be placed into an empty tableau column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in the SAME SUIT from Ace (1) to King (13).",
        "Tableau: Built DOWN in ALTERNATING COLORS (e.g., Red 9 on Black 10).",
      ],
      specialRules: [
        "Draw Mode: Configurable between Draw 1 (draw one card at a time from stock) and Draw 3 (draw three cards at a time).",
        "Stock Recycle: When the stock empties, clicking it recycles cards from the waste pile back into the stock.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "drawCount",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "Easier mode. Flips 1 card at a time, making every stock card directly accessible.",
          },
          {
            value: 3,
            effect:
              "Standard challenge. Flips 3 cards at a time; only the top card of the 3 is immediately playable.",
          },
        ],
      },
    ],
  },
  freecell: {
    title: "FreeCell",
    wikipediaUrl: "https://en.wikipedia.org/wiki/FreeCell",
    screenshot: {
      url: "./docs/screenshots/freecell/overview.png",
      caption:
        "FreeCell board with 4 free cells top-left, 4 foundations top-right, and 8 fully face-up tableau columns.",
      altText: "FreeCell board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 52 cards are sorted into their respective suit foundations from Ace through King.",
      quickOverview:
        "FreeCell is a highly strategic solitaire game played with all cards dealt face-up into 8 columns. Four free cells act as temporary storage locations while you arrange columns in descending order with alternating colors.",
    },
    detailedRules: {
      layout: [
        "Free Cells: 4 single-card holding cells at top-left.",
        "Foundations: 4 suit piles at top-right, initially empty.",
        "Tableau: 8 columns with all 52 cards dealt completely face-up.",
      ],
      cardMovement: [
        "Any single card can be placed into an empty Free Cell.",
        "Any card can start an empty tableau column.",
        "Multi-card moves (supermoves) simulate moving cards through open Free Cells and empty tableau columns.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in ALTERNATING COLORS.",
      ],
      specialRules: [
        "Supermove Capacity Formula: Maximum cards moved at once is (Free Cells + 1) * 2^(Empty Tableaus).",
        "No Stock: FreeCell has no stock or hidden cards; all cards are visible from the deal.",
      ],
    },
    settingsAndVariants: [],
  },
  spider: {
    title: "Spider Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Spider_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/spider/overview.png",
      caption:
        "Spider board featuring 10 tableau columns and stock deals at bottom-left.",
      altText: "Spider solitaire board overview",
    },
    summary: {
      objective:
        "Assemble 8 full same-suit sequences from King down to Ace on the tableau to clear them.",
      winCondition:
        "All 8 13-card sequences (King to Ace of same suit) are completed and removed from the board.",
      quickOverview:
        "Spider uses two 52-card decks (104 cards total). Players build descending sequences in 10 tableau columns. Completed King-to-Ace same-suit runs are automatically cleared to foundation slots.",
    },
    detailedRules: {
      layout: [
        "Tableau: 10 columns (first 4 columns have 6 cards, remaining 6 have 5 cards; top card face-up).",
        "Stock: Holds remaining 50 cards (dealt 10 cards at a time, one to each column).",
        "Foundations: Holds completed 13-card sequences.",
      ],
      cardMovement: [
        "Cards can be placed on any tableau card of next higher rank, regardless of suit (e.g. 7 of Clubs on 8 of Hearts).",
        "Only same-suit runs can be moved together as a stack.",
        "Any card or valid same-suit run can fill an empty tableau column.",
      ],
      sequenceBuilding: [
        "Tableau: Built DOWN by RANK (regardless of suit for single cards, same suit for multi-card moves).",
        "Completion: Complete King-down-to-Ace sequence of the SAME suit automatically moves to foundations.",
      ],
      specialRules: [
        "Stock Dealing: Dealing from stock places 1 face-up card on top of every tableau column.",
        "Empty Column Requirement: All tableau columns must contain at least 1 card before dealing from the stock.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "suitCount",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "Easiest mode (104 Spades). Every run is in suit, allowing easy multi-card moves and sequence builds.",
          },
          {
            value: 2,
            effect:
              "Medium mode (Spades & Hearts). Requires balancing mixed-suit building with same-suit runs.",
          },
          {
            value: 4,
            effect:
              "Classic hard challenge (Spades, Hearts, Diamonds, Clubs). Highly tactical and tight sequence control.",
          },
        ],
      },
    ],
  },
  yukon: {
    title: "Yukon Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Yukon_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/yukon/overview.png",
      caption:
        "Yukon board featuring 7 tableau columns with face-down and face-up card groups, and 4 foundations.",
      altText: "Yukon solitaire board overview",
    },
    summary: {
      objective:
        "Build all 52 cards onto four foundations by suit from Ace to King.",
      winCondition: "All cards are placed in order on the foundations.",
      quickOverview:
        "Yukon is a fast-paced game with no stock pile. All cards are dealt to the tableau at the start. The signature rule of Yukon is that ANY face-up card can be moved regardless of how many cards are sitting on top of it.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns (column 1 has 1 face-up card; columns 2-7 have 1-6 face-down cards plus 5 face-up cards).",
        "Foundations: 4 suit piles at top-right, built Ace to King.",
      ],
      cardMovement: [
        "Any face-up card anywhere in a column can be grabbed and moved, taking all cards above it along for the ride.",
        "The grabbed card must land on a valid receiving card according to the variant build rule.",
        "Only Kings (and stacks led by a King) can fill empty tableau columns.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau (Yukon): Built DOWN in ALTERNATING COLORS.",
        "Tableau (Alaska): Built UP or DOWN in SAME SUIT.",
        "Tableau (Russian): Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "No Staging Penalty: Stacks being moved do not need to be in sequence; only the targeted card and destination card must match placement rules.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: YukonVariant.YUKON,
            effect:
              "Standard game. Tableau columns build down in alternating colors.",
          },
          {
            value: YukonVariant.ALASKA,
            effect:
              "Gentler suit variant. Tableau columns build either UP or DOWN in the SAME SUIT.",
          },
          {
            value: YukonVariant.RUSSIAN,
            effect:
              "Hardest variant. Tableau columns build DOWN in the SAME SUIT.",
          },
        ],
      },
    ],
  },
  bakers: {
    title: "Baker's Game",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Baker%27s_Game",
    screenshot: {
      url: "./docs/screenshots/bakers/overview.png",
      caption:
        "Baker's Game board with 4 free cells, 4 foundations, and 8 same-suit building tableau columns.",
      altText: "Baker's Game board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the foundations from Ace to King by suit.",
      winCondition: "All four foundations completed from Ace through King.",
      quickOverview:
        "Baker's Game is the direct predecessor to FreeCell. It shares FreeCell's deal and 4 free cells, but requires tableau columns to be built strictly in the SAME SUIT rather than alternating colors.",
    },
    detailedRules: {
      layout: [
        "Free Cells: 4 single-card holding cells.",
        "Foundations: 4 suit piles, Ace to King.",
        "Tableau: 8 columns, all 52 cards dealt face-up.",
      ],
      cardMovement: [
        "Single cards can move to any empty free cell.",
        "Supermove limits apply based on available free cells and empty columns.",
        "Cards on tableau columns must build DOWN in the SAME SUIT.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in SAME SUIT (e.g. 9 of Spades on 10 of Spades).",
      ],
      specialRules: [
        "Empty Columns Rule: Configurable between Any Card or Kings Only.",
        "Kings Only Staging Limit: When empty columns accept Kings only, empty columns contribute zero staging capacity for supermoves, making multi-card moves strictly (Free Cells + 1).",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Standard Baker's Game. Any card can enter an empty column, providing full supermove staging capacity.",
          },
          {
            value: 1,
            effect:
              "Harder variant. Only Kings can enter empty columns, restricting supermoves to (Free Cells + 1).",
          },
        ],
      },
    ],
  },
  eightoff: {
    title: "Eight Off",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Eight_Off",
    screenshot: {
      url: "./docs/screenshots/eightoff/overview.png",
      caption:
        "Eight Off board featuring 8 free cells, 4 foundations, and 8 tableau columns.",
      altText: "Eight Off board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four suit foundation piles, built Ace to King.",
      winCondition:
        "All cards transferred to suit foundations Ace through King.",
      quickOverview:
        "Eight Off is a cousin of FreeCell and Baker's Game featuring 8 free cells instead of 4. Four of the cells start occupied by cards during deal. Tableau columns build strictly down in the same suit, and empty columns accept Kings only.",
    },
    detailedRules: {
      layout: [
        "Free Cells: 8 single-card holding cells (4 dealt with cards at start, 4 empty).",
        "Foundations: 4 suit piles, initially empty.",
        "Tableau: 8 columns of 6 cards each, all dealt face-up.",
      ],
      cardMovement: [
        "Single cards can move to any empty free cell.",
        "Tableau columns build strictly DOWN in the SAME SUIT.",
        "Only Kings can fill an empty tableau column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "Supermove Capacity: Because empty columns accept Kings only, multi-card supermoves are strictly capped at (Free Cells + 1).",
      ],
    },
    settingsAndVariants: [],
  },
  scorpion: {
    title: "Scorpion Solitaire",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Scorpion_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/scorpion/overview.png",
      caption:
        "Scorpion board featuring 7 tableau columns, stock reserve, and foundation area.",
      altText: "Scorpion solitaire board overview",
    },
    summary: {
      objective:
        "Build four 13-card same-suit sequences from King down to Ace on the tableau.",
      winCondition:
        "All 4 suits assembled in complete King-to-Ace runs on the board.",
      quickOverview:
        "Scorpion combines the open-stack dragging mechanics of Yukon with the same-suit sequence completion goals of Spider. Players move any face-up card along with all cards on top of it to build same-suit descending runs.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns of 7 cards each (columns 1-4 have 3 face-down cards and 4 face-up; columns 5-7 have 7 face-up cards).",
        "Stock: 3 remaining cards dealt in a single press.",
        "Foundations: Automated slots for completed King-to-Ace same-suit runs.",
      ],
      cardMovement: [
        "Any face-up card in a column can be moved regardless of what is on top of it.",
        "The grabbed card must land on a card of the SAME SUIT and exactly 1 rank higher (e.g., 7 of Spades on 8 of Spades).",
        "Only Kings (or stacks led by a King) can fill empty tableau columns.",
      ],
      sequenceBuilding: [
        "Tableau: Built DOWN in SAME SUIT.",
        "Completion: Complete King-to-Ace same-suit runs automatically clear to foundation slots.",
      ],
      specialRules: [
        "Reserve Deal: Clicking the 3-card stock deals 1 card face-up onto each of the first 3 tableau columns.",
      ],
    },
    settingsAndVariants: [],
  },
};
