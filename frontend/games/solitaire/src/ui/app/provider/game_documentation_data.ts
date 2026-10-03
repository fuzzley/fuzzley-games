import { InjectionToken } from "@angular/core";
import { YukonVariant } from "@/games/yukon/yukon_rules";
import { GameDocumentation } from "../model/game_documentation.model";
import { GameId } from "./game_catalog";

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
        "Stock Recycle: When the stock empties, clicking it recycles cards from the waste pile back into the stock — as often as you like under standard scoring, and a limited number of times under Vegas scoring.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The original: columns build down in alternating colours and only a King can fill an empty column.",
          },
          {
            value: 1,
            effect:
              "Whitehead: every card is dealt face-up, columns build down in the SAME COLOUR, any card can fill an empty column, and only proper runs can be lifted. Nothing is hidden, so the whole game is planning.",
          },
          {
            value: 2,
            effect:
              "Thumb and Pouch: a card can land on any suit except its own, and any card can fill an empty column — a much looser build than the original, though the deal still hides most of the board.",
          },
          {
            value: 3,
            effect:
              "Saratoga: the original rules, but all 28 column cards are dealt face-up. Only proper alternating-colour runs can be lifted, and only a King can fill an empty column; the stock is the only thing left hidden.",
          },
        ],
      },
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
      {
        optionId: "scoring",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Standard scoring: 10 points for each card to a foundation, 5 for a waste card onto a column and for each card turned over, minus 15 for taking a card back off a foundation, and a penalty for recycling the stock past the free passes. The score never drops below zero, and the stock can be recycled as often as you like.",
          },
          {
            value: 1,
            effect:
              "Las Vegas scoring: you start $52 down, having bought the deck at a dollar a card, and win $5 back for every card you put on a foundation (taking one back costs $5). The score can stay negative. The stock can be gone through only once in Draw 1, or three times in Draw 3; pips on the empty stock count the recycles left, and once they are spent it becomes a plain outline.",
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
        "Tableau (Moosehide): Built DOWN in ANY SUIT BUT THE CARD'S OWN.",
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
          {
            value: YukonVariant.MOOSEHIDE,
            effect:
              "Moosehide: tableau columns build DOWN in any suit except the card's own — Thumb and Pouch's rule on Yukon's deal, and looser than alternating colours.",
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
  challengefreecell: {
    title: "Challenge FreeCell",
    screenshot: {
      url: "./docs/screenshots/challengefreecell/overview.png",
      caption:
        "Challenge FreeCell board with 4 free cells, 4 foundations, and 8 face-up columns, each with an Ace or a Two at the bottom.",
      altText: "Challenge FreeCell board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 52 cards are sorted into their suit foundations from Ace through King.",
      quickOverview:
        "Challenge FreeCell is FreeCell with the deal rigged against you: the four Aces and four Twos are dealt first, one to the bottom of each column, so every foundation starts at the very bottom of the board. Super Challenge FreeCell also lets only Kings fill an empty column.",
    },
    detailedRules: {
      layout: [
        "Free Cells: 4 single-card holding cells at top-left.",
        "Foundations: 4 suit piles at top-right, initially empty.",
        "Tableau: 8 columns with all 52 cards dealt face-up, an Ace or a Two at the bottom of each.",
      ],
      cardMovement: [
        "Any single card can be placed into an empty free cell.",
        "Any card can start an empty column, or only a King under Super Challenge.",
        "Multi-card moves (supermoves) simulate moving cards through open free cells and empty columns.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in ALTERNATING COLORS.",
      ],
      specialRules: [
        "Buried Foundations: no foundation can be started until a whole column has been dismantled down to its Ace, so the opening is spent clearing columns rather than playing up.",
        "Supermove Capacity: (Free Cells + 1) * 2^(Empty Columns) with any card in a space; strictly (Free Cells + 1) when only Kings fill a space, because a moving run's only King is its bottom card.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Challenge FreeCell. Any card can enter an empty column, giving full supermove staging capacity.",
          },
          {
            value: 1,
            effect:
              "Super Challenge FreeCell. Only Kings can enter an empty column, restricting supermoves to (Free Cells + 1).",
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
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The original: only a King, or a run headed by one, can fill an empty column, and the first four columns each hide three cards.",
          },
          {
            value: 1,
            effect:
              "Wasp: any card, with everything resting on it, can fill an empty column. Clearing a column becomes a real gain rather than a parking place for one King.",
          },
          {
            value: 2,
            effect:
              "Scorpion II: only the first three columns hide cards, so 40 of the 49 dealt cards are visible from the start. Empty columns still take Kings only.",
          },
        ],
      },
    ],
  },
  simplesimon: {
    title: "Simple Simon",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Simple_Simon_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/simplesimon/overview.png",
      caption:
        "Simple Simon board showing ten fully face-up tableau columns and four foundation slots.",
      altText: "Simple Simon solitaire board overview",
    },
    summary: {
      objective:
        "Build four 13-card same-suit sequences from King down to Ace on the tableau.",
      winCondition:
        "All 4 suits assembled in complete King-to-Ace runs and cleared to the foundations.",
      quickOverview:
        "Simple Simon plays by Spider's rules on an open board: one deck, ten columns, every card face-up, and no stock at all. Columns build down by rank in any suit, but only a same-suit run can be picked up, so the whole game is deciding which mixed piles you can afford to build.",
    },
    detailedRules: {
      layout: [
        "Tableau: 10 columns dealt 8, 8, 8, 7, 6, 5, 4, 3, 2, 1 cards, all face-up.",
        "Foundations: 4 automated slots for completed King-to-Ace same-suit runs.",
        "No Stock: every one of the 52 cards is on the tableau from the first move.",
      ],
      cardMovement: [
        "A card can be picked up only with an unbroken same-suit descending run resting on it.",
        "Any card, or any run, can be moved into an empty tableau column.",
        "There is no limit on how many cards move at once: a run travels in one piece rather than being staged through spare squares.",
      ],
      sequenceBuilding: [
        "Tableau: Built DOWN by RANK in ANY SUIT.",
        "Lifting: Only unbroken SAME SUIT descending runs can be moved.",
        "Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.",
      ],
      specialRules: [
        "No Recovery: with no stock and no face-down cards, a position played into a corner cannot be rescued — every deal is winnable or not from the opening move.",
        "The Staircase: the short columns on the right are the cheapest to clear, and opening a column early is usually worth more than any single run.",
      ],
    },
    settingsAndVariants: [],
  },
  mrsmop: {
    title: "Mrs. Mop",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Mrs._Mop",
    screenshot: {
      url: "./docs/screenshots/mrsmop/overview.png",
      caption:
        "Mrs. Mop board showing thirteen face-up columns of eight cards and eight foundation slots.",
      altText: "Mrs. Mop solitaire board overview",
    },
    summary: {
      objective:
        "Build eight 13-card same-suit sequences from King down to Ace on the tableau.",
      winCondition:
        "All 8 runs, two per suit, assembled from King to Ace and cleared to the foundations.",
      quickOverview:
        "Mrs. Mop is Spider with nothing hidden: both decks are dealt face-up into thirteen columns of eight, and there is no stock at all. Columns build down by rank in any suit, but only a same-suit run can be picked up. Charles Jewell invented it.",
    },
    detailedRules: {
      layout: [
        "Tableau: 13 columns of 8 cards, all 104 cards face-up.",
        "Foundations: 8 automated slots for completed King-to-Ace same-suit runs.",
        "No Stock: every card is on the tableau from the first move.",
      ],
      cardMovement: [
        "A card can be picked up only with an unbroken same-suit descending run resting on it.",
        "Any card, or any run, can be moved into an empty column.",
        "There is no limit on how many cards move at once: a run travels in one piece.",
      ],
      sequenceBuilding: [
        "Tableau: Built DOWN by RANK in ANY SUIT.",
        "Lifting: Only unbroken SAME SUIT descending runs can be moved.",
        "Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.",
      ],
      specialRules: [
        "Open Information: with both decks visible and no stock, every deal can be planned from the first move, as in Simple Simon.",
        "Two of Everything: each card has a twin, so a run can often be finished from either of two places — and blocked in either of two.",
      ],
    },
    settingsAndVariants: [],
  },
  bakersdozen: {
    title: "Baker's Dozen",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Baker's_Dozen_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/bakersdozen/overview.png",
      caption:
        "Baker's Dozen board showing thirteen face-up columns of four cards and four foundation slots.",
      altText: "Baker's Dozen solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 52 cards are sorted into their suit foundations from Ace through King.",
      quickOverview:
        "Baker's Dozen deals thirteen columns of four cards face-up with the Kings sunk to the bottom of their columns. Cards move one at a time and build down by rank in any suit — but an emptied column can never be refilled, which inverts the instinct every other solitaire teaches.",
    },
    detailedRules: {
      layout: [
        "Tableau: 13 columns of 4 cards each, all face-up.",
        "Foundations: 4 suit piles at the right of the top row, initially empty.",
        "No Stock: all 52 cards are on the tableau from the first move.",
      ],
      cardMovement: [
        "Only the top card of a column can be moved, one card at a time.",
        "A card can go onto any column whose top card is exactly 1 rank higher, of any suit.",
        "Empty columns cannot be filled by any card — once a column is cleared it stays empty for the rest of the game.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN by RANK in ANY SUIT.",
      ],
      specialRules: [
        "Kings Sink: after the deal, every King is moved to the bottom of its column. A King can never be moved, so one left on top would bury the cards beneath it for the whole game.",
        "Dead Columns: because empty columns cannot be refilled, clearing one is a loss of working space rather than a gain — the opposite of Klondike, FreeCell and Spider.",
        "No Staging: with no free cells and no usable empty columns, there is nowhere to park a card, so multi-card moves are impossible by construction.",
      ],
    },
    settingsAndVariants: [],
  },
  seahaven: {
    title: "Seahaven Towers",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Seahaven_Towers",
    screenshot: {
      url: "./docs/screenshots/seahaven/overview.png",
      caption:
        "Seahaven Towers board with 4 cells top-left, 4 foundations top-right, and 10 face-up columns of five.",
      altText: "Seahaven Towers solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 52 cards are sorted into their suit foundations from Ace through King.",
      quickOverview:
        "Seahaven Towers deals ten columns of five face-up cards, with the two leftover cards already filling two of its four cells. Columns build down in a single suit and open only to a King, which makes it the tightest of the cell games.",
    },
    detailedRules: {
      layout: [
        "Cells: 4 single-card holding cells at top-left, two of them filled by the deal.",
        "Foundations: 4 suit piles at top-right, initially empty.",
        "Tableau: 10 columns of 5 cards, all face-up.",
      ],
      cardMovement: [
        "Any single card can be placed into an empty cell.",
        "Only a King (or a run headed by a King) can start an empty column.",
        "Multi-card moves simulate moving cards one at a time through the open cells.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "Supermove Capacity: strictly (Free Cells + 1), with no doubling for empty columns. Because an empty column accepts only a King and a moving run's only King is its bottom card, an empty column can never stage part of a run.",
        "Opening Squeeze: the deal spends two of the four cells, so the game begins with the least slack of any cell game here — freeing those two cells is usually the first task.",
      ],
    },
    settingsAndVariants: [],
  },
  spiderette: {
    title: "Spiderette",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Spiderette",
    screenshot: {
      url: "./docs/screenshots/spiderette/overview.png",
      caption:
        "Spiderette board showing seven columns dealt in a staircase, the row-dealing stock, and four foundation slots.",
      altText: "Spiderette solitaire board overview",
    },
    summary: {
      objective:
        "Build four 13-card same-suit sequences from King down to Ace on the tableau.",
      winCondition:
        "All 4 suits assembled in complete King-to-Ace runs and cleared to the foundations.",
      quickOverview:
        "Spiderette is Spider played with one deck on seven columns. Columns build down by rank in any suit but only same-suit runs can be lifted, and the stock deals a card onto every column at once rather than turning cards into a waste.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns dealt 1 to 7 cards, only the top card of each face-up.",
        "Stock: the remaining 24 cards, dealt a row at a time.",
        "Foundations: 4 automated slots for completed King-to-Ace same-suit runs.",
      ],
      cardMovement: [
        "A card can be picked up only with an unbroken same-suit descending run resting on it.",
        "Any card, or any run, can be moved into an empty column.",
        "Turning over a column's newly exposed card happens automatically.",
      ],
      sequenceBuilding: [
        "Tableau: Built DOWN by RANK in ANY SUIT.",
        "Lifting: Only unbroken SAME SUIT descending runs can be moved.",
        "Completion: Complete King-to-Ace same-suit runs clear to the foundations automatically.",
      ],
      specialRules: [
        "Row Deal: pressing the stock deals one card face-up onto every column at once.",
        "Deals Onto Empty Columns: unlike Spider, the stock will deal even when a column is empty. Neither deal divides evenly by seven, so the final row is always short and refusing would strand it.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The standard deal: Klondike's staircase of 1 to 7 cards, burying 21 cards and leaving 24 in the stock.",
          },
          {
            value: 1,
            effect:
              "Will o' the Wisp: a flat 3 cards to every column, burying only 14 but leaving 31 in the stock — fewer hidden cards up front, more forced deals later.",
          },
        ],
      },
    ],
  },
  easthaven: {
    title: "Easthaven",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Easthaven_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/easthaven/overview.png",
      caption:
        "Easthaven board showing seven columns of three, the row-dealing stock, and four foundation piles.",
      altText: "Easthaven solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 52 cards are sorted into their suit foundations from Ace through King.",
      quickOverview:
        "Easthaven joins Spider's stock to Klondike's objective. Seven columns of three build down in alternating colours, but the stock deals a card onto every column at once — and it refuses to deal at all while any column stands empty.",
    },
    detailedRules: {
      layout: [
        "Tableau: 7 columns of 3 cards, two face-down under one face-up.",
        "Stock: the remaining 31 cards, dealt a row at a time.",
        "Foundations: 4 suit piles, filled by the player one card at a time.",
      ],
      cardMovement: [
        "A card can be picked up only with an unbroken alternating-colour descending run resting on it — stricter than Klondike, which allows a broken pile to be dragged.",
        "Only a King (or a run headed by a King) can fill an empty column.",
        "Turning over a column's newly exposed card happens automatically.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in ALTERNATING COLORS.",
      ],
      specialRules: [
        "Row Deal: pressing the stock deals one card face-up onto every column at once. The stock holds 31 against 7 columns, so the final row is a short one of three.",
        "No Deal Onto Empty Columns: the stock refuses while any column stands empty. Combined with Kings-only spaces, a player holding an empty column and no free King has neither a move that fills it nor a stock that will deal — which is how Easthaven is lost outright rather than merely stalled.",
      ],
    },
    settingsAndVariants: [],
  },
  fortythieves: {
    title: "Forty Thieves",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/fortythieves/overview.png",
      caption:
        "Forty Thieves board with stock and waste top-left, eight foundations across the top, and ten columns of four.",
      altText: "Forty Thieves solitaire board overview",
    },
    summary: {
      objective:
        "Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 104 cards are sorted onto the eight foundations, two per suit.",
      quickOverview:
        "Forty Thieves deals two decks into ten columns of four and turns the stock one card at a time onto a waste that is never recycled. Columns build down in a single suit and move one card at a time, which makes it one of the hardest classic patiences.",
    },
    detailedRules: {
      layout: [
        "Tableau: 10 columns of 4 cards, all face-up in the standard game.",
        "Foundations: 8 suit piles, two per suit for the two decks.",
        "Stock: the remaining 64 cards, drawn one at a time.",
        "Waste: a single face-up card where the drawn card lands.",
      ],
      cardMovement: [
        "The top card of any column, or the card on the waste, can be moved.",
        "Any card can start an empty column — the only real generosity in the game, since there are no free cells.",
        "The top card of a foundation can be taken back down onto a column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "No Recycle: the stock is dealt through exactly once. When the 64 cards are gone they are gone, so every drawn card must be placed now or buried under the next.",
        "One Card At A Time: the standard game moves a single card per move, with no free cells and no staging, so a column is dismantled card by card or not at all.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "The original and the hardest: build down in suit and move exactly one card at a time.",
          },
          {
            value: 1,
            effect:
              "Josephine (also called Streets): the same same-suit build, but a complete same-suit run can be moved as a unit, which is a large easing.",
          },
          {
            value: 2,
            effect:
              "Rank and File: columns build down in alternating colours and runs move as a unit, but three of every four dealt cards start face-down.",
          },
          {
            value: 5,
            effect:
              "Indian: only three cards to a column, the bottom one face-down, leaving 74 in the stock. A card lands on any suit except its own, one card at a time.",
          },
          {
            value: 6,
            effect:
              "Number Ten: four cards to a column with the bottom two face-down. Columns build down in alternating colours, and a run in sequence moves as a unit.",
          },
        ],
      },
    ],
  },
  maria: {
    title: "Maria",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/maria/overview.png",
      caption:
        "Maria board showing nine face-up columns of four centred beneath the stock, waste and eight foundations.",
      altText: "Maria solitaire board overview",
    },
    summary: {
      objective:
        "Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 104 cards are sorted onto the eight foundations, two per suit.",
      quickOverview:
        "Maria is Forty Thieves on a narrower board: nine columns of four instead of ten, built down in alternating colours with runs moving as a unit. Fewer columns means a smaller tableau and a longer stock to work through.",
    },
    detailedRules: {
      layout: [
        "Tableau: 9 columns of 4 cards, all face-up.",
        "Foundations: 8 suit piles, two per suit.",
        "Stock: the remaining 68 cards, drawn one at a time onto a waste.",
      ],
      cardMovement: [
        "A card can be picked up with an unbroken alternating-colour descending run resting on it.",
        "Any card can start an empty column.",
        "The top card of a foundation can be taken back down onto a column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in ALTERNATING COLORS.",
      ],
      specialRules: [
        "No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family.",
        "Narrow Board: nine columns hold only 36 of the 104 cards, so more of the deck arrives through the stock than in Forty Thieves proper.",
      ],
    },
    settingsAndVariants: [],
  },
  limited: {
    title: "Limited",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/limited/overview.png",
      caption:
        "Limited board showing twelve shallow face-up columns of three beneath the stock, waste and eight foundations.",
      altText: "Limited solitaire board overview",
    },
    summary: {
      objective:
        "Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 104 cards are sorted onto the eight foundations, two per suit.",
      quickOverview:
        "Limited spreads Forty Thieves wider and shallower: twelve columns of three, built down in a single suit with runs moving as a unit. Every column is only two cards deep beneath its top, so far more of the tableau is immediately playable.",
    },
    detailedRules: {
      layout: [
        "Tableau: 12 columns of 3 cards, all face-up.",
        "Foundations: 8 suit piles, two per suit.",
        "Stock: the remaining 68 cards, drawn one at a time onto a waste.",
      ],
      cardMovement: [
        "A card can be picked up with an unbroken same-suit descending run resting on it.",
        "Any card can start an empty column.",
        "The top card of a foundation can be taken back down onto a column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family.",
        "Shallow Columns: with only three cards per column, almost the whole tableau is reachable from the opening position.",
      ],
    },
    settingsAndVariants: [],
  },
  lucas: {
    title: "Lucas",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)",
    screenshot: {
      url: "./docs/screenshots/lucas/overview.png",
      caption:
        "Lucas board showing the eight Aces on the foundations and thirteen face-up columns of three beneath them.",
      altText: "Lucas solitaire board overview",
    },
    summary: {
      objective:
        "Move all 104 cards from two decks onto the eight foundation piles, built up by suit from Ace to King.",
      winCondition:
        "All 104 cards are sorted onto the eight foundations, two per suit.",
      quickOverview:
        "Lucas is Forty Thieves with a head start: the eight Aces begin on the foundations, and the rest is dealt into thirteen shallow columns of three. Columns build down in suit and a same-suit run moves as a unit, but the stock still goes through only once.",
    },
    detailedRules: {
      layout: [
        "Foundations: 8 suit piles, each dealt one of the eight Aces.",
        "Tableau: 13 columns of 3 cards, all face-up — the widest board in the family.",
        "Stock: the remaining 57 cards, drawn one at a time onto a waste.",
      ],
      cardMovement: [
        "A card can be picked up with an unbroken same-suit descending run resting on it.",
        "Any card can start an empty column.",
        "The top card of a foundation can be taken back down onto a column.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from the Ace already there to King.",
        "Tableau: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "Aces Home: with every foundation already started, any Two that turns up can go straight home.",
        "No Recycle: the stock is dealt through exactly once, as in the rest of the Forty Thieves family. About one deal in three can be won.",
      ],
    },
    settingsAndVariants: [],
  },
  doubleklondike: {
    title: "Double Klondike",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/doubleklondike/overview.png",
      caption:
        "Double Klondike board showing nine tableau columns, stock and waste, and eight foundation piles.",
      altText: "Double Klondike solitaire board overview",
    },
    summary: {
      objective:
        "Build all 104 cards from two decks onto the eight foundation piles by suit, from Ace to King.",
      winCondition:
        "All 104 cards are transferred to the eight foundations, two per suit.",
      quickOverview:
        "Double Klondike is Klondike dealt from two decks: nine columns in the familiar staircase, eight foundations, and a stock of 59 drawn three at a time with unlimited recycles.",
    },
    detailedRules: {
      layout: [
        "Tableau: 9 columns containing 1 to 9 cards respectively, top card face-up.",
        "Foundations: 8 suit piles, two per suit for the two decks.",
        "Stock: the remaining 59 cards, face-down at top-left.",
        "Waste: face-up pile where drawn cards land, fanned three at a time.",
      ],
      cardMovement: [
        "Any face-up card can be moved along with everything stacked on it, ordered or not.",
        "Only a King (or a stack headed by a King) can be placed into an empty column — but with two decks there are eight Kings, so spaces are far easier to fill than in Klondike.",
        "Cards on the waste or the tableau can be moved to foundations or other columns.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Tableau: Built DOWN in ALTERNATING COLORS.",
      ],
      specialRules: [
        "Stock Recycle: when the stock empties, clicking it recycles the waste back into the stock, as often as you like.",
        "Congested Middle Game: eight foundations must be fed from a tableau only two columns wider than Klondike's, so twice the cards does not mean twice the room.",
        "Scoring: the same scoring as Klondike — 10 points to a foundation, 5 for a waste card onto a column, 5 for turning a card over, and a penalty for recycling past the free passes.",
      ],
    },
    settingsAndVariants: [],
  },
  montana: {
    title: "Montana",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Montana_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/montana/overview.png",
      caption:
        "Montana board showing 48 cards laid in a grid of four rows by thirteen, with four gaps and the redeal marker beside it.",
      altText: "Montana solitaire board overview",
    },
    summary: {
      objective:
        "Arrange each of the four rows into a single suit running from Two up to King.",
      winCondition:
        "Every row reads Two through King in one suit, with the gap parked at the end.",
      quickOverview:
        "Montana, also played as Gaps, deals 48 cards — a deck without its Aces — into a grid of four rows by thirteen, leaving four gaps. You move a card into a gap only if it continues the run to the gap's left, and you win by sorting all four rows.",
    },
    detailedRules: {
      layout: [
        "Grid: 4 rows of 13 cells, each holding at most one card.",
        "Gaps: 4 empty cells, where the Aces would have fallen.",
        "Redeal: a marker beside the grid, worth two uses per game, or three in Addiction. Its pips count them: filled for each redeal left, hollow for each one spent.",
      ],
      cardMovement: [
        "A gap accepts the card one rank higher than the card immediately to its left, in the same suit.",
        "A gap in the leftmost column accepts any Two.",
        "A gap immediately to the right of a King accepts nothing — it is dead for the rest of the deal, and creating one is the mistake to avoid.",
        "Moving a card leaves a new gap behind it, so every move both opens and closes an opportunity.",
      ],
      sequenceBuilding: [
        "Rows: Built UP in SAME SUIT from Two to King, left to right.",
        "There are no foundations and no stacking — cards only ever move between cells.",
      ],
      specialRules: [
        "Redeals: pressing the marker gathers every card that is not yet part of its row's run from the left, shuffles them, and lays them back out after each run — leaving one fresh gap per row. Two redeals per game, or three in Addiction; once they are spent, or nothing is left to gather, the marker becomes a plain outline and pressing it does nothing.",
        "No Aces: the Aces are not in play at all, which is what creates the four gaps.",
        "Won by Arrangement: unlike every other game here, nothing is gathered onto a pile — the cards end where they started, in cells, just in the right order.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "redeals",
        choicesExplanation: [
          {
            value: 2,
            effect: "Montana as it is usually played: two redeals per game.",
          },
          {
            value: 3,
            effect:
              "Addiction: three redeals per game. The marker shows three pips, and the extra shuffle rescues many games that two would leave stuck.",
          },
        ],
      },
    ],
  },
  bluemoon: {
    title: "Blue Moon",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Gaps",
    screenshot: {
      url: "./docs/screenshots/bluemoon/overview.png",
      caption:
        "Blue Moon board showing all 52 cards in four rows of fourteen, an Ace at the head of each row, four gaps, and the redeal marker beside the grid.",
      altText: "Blue Moon solitaire board overview",
    },
    summary: {
      objective:
        "Arrange each of the four rows into a single suit running from its Ace up to King.",
      winCondition:
        "Every row reads Ace through King in one suit, with the gap parked at the end.",
      quickOverview:
        "Blue Moon is Montana played with the whole deck. The 52 cards are dealt in four rows, then each Ace is moved to the head of a row of its own, leaving a gap where it was. A gap takes the card that continues the run to its left, and each Ace decides which suit its row is built in.",
    },
    detailedRules: {
      layout: [
        "Grid: 4 rows of 14 cells, each holding at most one card.",
        "Aces: one at the start of every row, fixed there for the whole game.",
        "Gaps: 4 empty cells, where the Aces were dealt.",
        "Redeal: a marker beside the grid, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.",
      ],
      cardMovement: [
        "A gap accepts the card one rank higher than the card immediately to its left, in the same suit.",
        "A gap beside an Ace accepts that Ace's Two.",
        "A gap immediately to the right of a King accepts nothing until the King moves on.",
        "The Aces never move, and nothing can be placed in front of them.",
      ],
      sequenceBuilding: [
        "Rows: Built UP in SAME SUIT from the Ace to King, left to right.",
        "There are no foundations and no stacking — cards only ever move between cells.",
      ],
      specialRules: [
        "Redeals: pressing the marker gathers every card that is not yet part of its row's run from the Ace, shuffles them, and lays them back out after each run — leaving one fresh gap per row. Two redeals per game; once they are spent, or nothing is left to gather, the marker becomes a plain outline.",
        "Won by Arrangement: as in Montana, nothing is gathered onto a pile — the cards end in cells, just in the right order.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 1,
            effect:
              "Blue Moon: the gaps are wherever the Aces happened to be dealt, so a row may have to wait for its first gap to open.",
          },
          {
            value: 2,
            effect:
              "Red Moon: the Aces are dealt straight to the head of the rows and the gaps right beside them, so every row can start building with its Two from the first move. The easier of the two.",
          },
        ],
      },
    ],
  },
  bisley: {
    title: "Bisley",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Bisley_(card_game)",
    screenshot: {
      url: "./docs/screenshots/bisley/overview.png",
      caption:
        "Bisley board showing the four Aces at the left of the top row, four empty King foundations at its right, and thirteen face-up columns.",
      altText: "Bisley solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards onto the foundations, each suit climbing from its Ace and descending from its King until the two meet.",
      winCondition:
        "Every card is on a foundation, whichever of its suit's two piles it ended on.",
      quickOverview:
        "Bisley lays the four Aces out first and deals the rest face-up into thirteen columns. Each suit has two foundations: one building up from the Ace, and one building down from the King once a King is free. The columns build up or down in suit, one card at a time, and an emptied column stays empty.",
    },
    detailedRules: {
      layout: [
        "Ace Foundations: the four Aces, at the left of the top row, one per suit.",
        "King Foundations: 4 empty slots at the right of the top row, in the same suit order as the Aces.",
        "Tableau: 13 face-up columns — 3 cards in each of the first four, 4 cards in each of the other nine.",
        "No Stock: all 52 cards are in view from the first move.",
      ],
      cardMovement: [
        "Only the top card of a column can be moved, one card at a time.",
        "A card can go onto a column whose top card is the same suit and exactly 1 rank higher or lower.",
        "A free King can start the King foundation of its own suit.",
        "Empty columns cannot be filled — once a column is cleared it stays empty.",
      ],
      sequenceBuilding: [
        "Ace Foundations: Built UP in SAME SUIT from the Ace.",
        "King Foundations: Built DOWN in SAME SUIT from the King.",
        "Tableau: Built UP or DOWN in SAME SUIT, and a column may change direction.",
      ],
      specialRules: [
        "Meeting Foundations: a suit's two foundations may meet at any rank. Once they hold all thirteen cards between them, that suit is done.",
        "Two-Way Building: a column can climb and then fall, so the same suit can be gathered around a card from either side.",
      ],
    },
    settingsAndVariants: [],
  },
  acesup: {
    title: "Aces Up",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Aces_Up",
    screenshot: {
      url: "./docs/screenshots/acesup/overview.png",
      caption:
        "Aces Up board showing the stock at the left, four columns of one card each, and the empty discard at the right.",
      altText: "Aces Up solitaire board overview",
    },
    summary: {
      objective:
        "Discard all 48 cards that are not Aces, leaving only the four Aces on the table.",
      winCondition:
        "The stock is dealt out and nothing but Aces remains in the columns.",
      quickOverview:
        "Aces Up deals one card to each of four columns. Whenever two columns show cards of the same suit, the lower one can be discarded; Aces rank high, so they can never be. When nothing more can go, deal another card onto every column, and keep going until the stock runs out.",
    },
    detailedRules: {
      layout: [
        "Stock: 48 face-down cards at the left, dealt four at a time.",
        "Tableau: 4 columns, each dealt one face-up card to start.",
        "Discard: a single pile at the right, initially empty.",
      ],
      cardMovement: [
        "The top card of a column can be discarded while another column's top card is the same suit and higher.",
        "The top card of a column can be moved into an empty column.",
        "Pressing the stock deals one card face-up onto each column.",
        "Double-press a card to discard it, or to move it into a space when it cannot be discarded.",
      ],
      sequenceBuilding: [
        "Nothing is built: cards are only ever discarded or moved into a space.",
        "Aces rank above Kings, so an Ace can never be discarded.",
      ],
      specialRules: [
        "Buried Cards: a card dealt over another hides it until the top card is discarded or moved into a space — spaces are what dig a buried card out.",
        "The stock can be dealt at any time, but it is dealt only once.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "emptyColumns",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Any Card: the usual game — the top card of any other column can be moved into a space.",
          },
          {
            value: 1,
            effect:
              "Aces Only: a space can take only an Ace. An Ace dealt on top of a buried card can be lifted off, but no other card can, which makes the game much harder.",
          },
        ],
      },
    ],
  },
  golf: {
    title: "Golf",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Golf_(patience)",
    screenshot: {
      url: "./docs/screenshots/golf/overview.png",
      caption:
        "Golf board showing the stock and the foundation along the top, and seven face-up columns of five cards beneath.",
      altText: "Golf solitaire board overview",
    },
    summary: {
      objective:
        "Clear all seven columns by playing their cards onto the foundation, one rank up or down at a time.",
      winCondition:
        "Every column is empty. Cards left in the stock do not matter.",
      quickOverview:
        "Golf deals seven columns of five cards face-up and starts the foundation with one more. Any column's top card can be played onto the foundation if it is one rank above or below the foundation's top card, in any suit. When nothing can be played, turn the next stock card onto the foundation and carry on — but the stock goes through only once.",
    },
    detailedRules: {
      layout: [
        "Stock: 16 face-down cards at the top-left, turned one at a time.",
        "Foundation: a single pile beside the stock, started with one card from the deal.",
        "Tableau: 7 columns of 5 cards, all face-up.",
      ],
      cardMovement: [
        "Press a column's top card to play it onto the foundation, or drag it there.",
        "Press the stock to turn its top card onto the foundation, whatever its rank.",
        "Nothing is ever placed on a column: cards only leave them.",
      ],
      sequenceBuilding: [
        "Foundation: one rank HIGHER or LOWER than its top card, in ANY SUIT — a run can go up and down as it likes.",
        "Nothing may be played on a King, so a King ends the run until the stock is turned.",
      ],
      specialRules: [
        "One Pass: the stock is never recycled; once it is gone, the game ends when nothing more can be played.",
        "Long Runs: the trick is to plan a chain up and down through several columns before turning the next stock card.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Golf: the original — a King on the foundation blocks it until the next stock card is turned, and an Ace can only take a Two.",
          },
          {
            value: 1,
            effect:
              "Queens on Kings: a common house rule — a Queen can be played on a King, so a King no longer blocks the foundation. Kings and Aces are still not adjacent.",
          },
          {
            value: 2,
            effect:
              "Putt Putt: the ranks turn the corner, so a King takes a Queen or an Ace, and an Ace takes a Two or a King. Nothing ever blocks the foundation, which makes it the easiest of the three.",
          },
        ],
      },
    ],
  },
  calculation: {
    title: "Calculation",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Calculation_(card_game)",
    screenshot: {
      url: "./docs/screenshots/calculation/overview.png",
      caption:
        "Calculation board showing the stock and the hand at the left, the four foundations started with an Ace, a Two, a Three and a Four, and four empty waste piles beneath them.",
      altText: "Calculation solitaire board overview",
    },
    summary: {
      objective:
        "Build all four foundations up to their King, each by its own interval, regardless of suit.",
      winCondition:
        "All 52 cards are on the foundations, each ending on a King.",
      quickOverview:
        "Calculation starts four foundations with an Ace, a Two, a Three and a Four. The first counts up in ones, the second in twos, the third in threes and the fourth in fours, counting on past the King from the Ace. Turn the stock one card at a time and put each card on a foundation or park it on one of four waste piles — where it waits, buried under whatever you park on it later.",
    },
    detailedRules: {
      layout: [
        "Stock: the face-down cards at the top-left, turned one at a time.",
        "Hand: the card just turned, beside the stock, waiting to be placed.",
        "Foundations: 4 piles started with an Ace, a Two, a Three and a Four, in any suits.",
        "Waste: 4 piles beneath the foundations, initially empty.",
      ],
      cardMovement: [
        "Press the stock to turn its top card into the hand. The next card can be turned only once the hand is empty.",
        "The card in the hand must go to a foundation or onto any waste pile.",
        "Only the top card of a waste pile can move, and only to a foundation.",
        "Double-press a card in the hand or on a waste pile to send it to a foundation that takes it.",
      ],
      sequenceBuilding: [
        "Foundation 1: A 2 3 4 5 6 7 8 9 10 J Q K — up in ones.",
        "Foundation 2: 2 4 6 8 10 Q A 3 5 7 9 J K — up in twos.",
        "Foundation 3: 3 6 9 Q 2 5 8 J A 4 7 10 K — up in threes.",
        "Foundation 4: 4 8 Q 3 7 J 2 6 10 A 5 9 K — up in fours.",
        "Suits never matter, and every foundation ends on its King.",
      ],
      specialRules: [
        "One Pass: the stock is never recycled.",
        "Waste Discipline: a waste pile is a stack, not a store — plan each one to come off in the order its foundation will want, high cards underneath. Kings are usually best kept to one pile, since every foundation ends on one.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Calculation: the foundations start on an Ace, a Two, a Three and a Four, and build by ones, twos, threes and fours.",
          },
          {
            value: 1,
            effect:
              "Sir Tommy, also called Old Patience: the foundations start empty, each begun by an Ace as one turns up and built up by one to the King, regardless of suit. The waste piles work just as in Calculation.",
          },
        ],
      },
    ],
  },
  flowergarden: {
    title: "Flower Garden",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Flower_Garden_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/flowergarden/overview.png",
      caption:
        "Flower Garden board showing the sixteen-card bouquet fanned across the top left, four empty foundations at the top right, and six face-up beds of six cards beneath.",
      altText: "Flower Garden solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition: "All 52 cards are sorted into their suit foundations.",
      quickOverview:
        "Flower Garden deals thirty-six cards face-up into six beds of six, and fans the other sixteen out as the bouquet. Every card in the bouquet is free to play at any time — onto a foundation or onto a bed — while the beds build down regardless of suit, one card at a time.",
    },
    detailedRules: {
      layout: [
        "Bouquet: 16 face-up cards fanned across the top-left, every one of them available.",
        "Foundations: 4 suit piles at the top-right, initially empty.",
        "Beds: 6 columns of 6 face-up cards.",
      ],
      cardMovement: [
        "Any bouquet card can be played onto a foundation or a bed, wherever it sits in the fan.",
        "Only the top card of a bed can be moved, one card at a time.",
        "An empty bed can be filled with any card, from the bouquet or another bed.",
        "Nothing is ever put back into the bouquet.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Beds: Built DOWN by RANK in ANY SUIT.",
      ],
      specialRules: [
        "The Bouquet as a Reserve: the bouquet is like sixteen free cells that start full — the art is spending its cards to dig out the low cards buried in the beds.",
        "No Stock: every card is in view from the first move.",
      ],
    },
    settingsAndVariants: [],
  },
  bristol: {
    title: "Bristol",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Bristol_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/bristol/overview.png",
      caption:
        "Bristol board showing the stock and three reserves at the top left, four empty foundations at the top right, and eight fans of three cards beneath.",
      altText: "Bristol solitaire board overview",
    },
    summary: {
      objective:
        "Build all 52 cards onto the four foundations, each from an Ace up to a King, regardless of suit.",
      winCondition: "All 52 cards are on the foundations.",
      quickOverview:
        "Bristol deals eight fans of three cards face-up, with any King moved to the bottom of its fan, and three more cards to start three reserves. The stock deals three cards at a time, one onto each reserve, burying what was there. Fans build down regardless of suit and are never refilled once emptied.",
    },
    detailedRules: {
      layout: [
        "Stock: 25 face-down cards at the top-left, dealt three at a time.",
        "Reserves: 3 piles beside the stock, one card each to start; only the top card of each is free.",
        "Foundations: 4 piles at the top-right, initially empty.",
        "Tableau: 8 fans of 3 face-up cards, with Kings sunk to the bottom.",
      ],
      cardMovement: [
        "Only the top card of a fan or a reserve can be moved, one card at a time.",
        "A card can go onto a fan whose top card is exactly 1 rank higher, in any suit.",
        "Nothing can be placed on a reserve; only the stock adds to them.",
        "An empty fan can never be filled again.",
        "Pressing the stock deals one card face-up onto each reserve.",
      ],
      sequenceBuilding: [
        "Foundations: any Ace starts one, then Built UP by RANK in ANY SUIT to the King.",
        "Fans: Built DOWN by RANK in ANY SUIT.",
      ],
      specialRules: [
        "Kings Sink: a King cannot move onto a fan, so the deal puts each one at the bottom of its fan, where it buries nothing.",
        "One Pass: the stock is dealt only once, and each deal buries the reserve cards beneath it — play what you can before dealing.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "Bristol: every foundation waits for an Ace to turn up.",
          },
          {
            value: 1,
            effect:
              "Belvedere: the deal puts one Ace straight onto a foundation, leaving 24 cards in the stock.",
          },
        ],
      },
    ],
  },
  nestor: {
    title: "Nestor",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Nestor_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/nestor/overview.png",
      caption:
        "Nestor board showing the four reserve cards at the top left, the empty discard at the top right, and eight face-up columns of six cards beneath.",
      altText: "Nestor solitaire board overview",
    },
    summary: {
      objective: "Discard the whole deck in pairs of the same rank.",
      winCondition: "All 52 cards are on the discard.",
      quickOverview:
        "Nestor deals eight columns of six cards face-up, with no two cards of the same rank in any one column, and leaves the last four as a reserve. Pair the free cards — the top of each column and every reserve card — two of the same rank at a time, until the board is clear.",
    },
    detailedRules: {
      layout: [
        "Reserve: 4 face-up cards at the top-left, every one of them free.",
        "Discard: a single pile at the top-right, initially empty.",
        "Tableau: 8 columns of 6 face-up cards, no column holding two cards of a rank.",
      ],
      cardMovement: [
        "Drag a free card onto another free card of the same rank, in any suit, and both go to the discard.",
        "Double-press a free card to pair it with the first free card of its rank.",
        "Cards are never moved anywhere but onto their partner.",
      ],
      sequenceBuilding: [
        "Nothing is built: cards only leave the board, two at a time.",
        "A free card is the top card of a column, or any reserve card.",
      ],
      specialRules: [
        "The Deal: a card that would repeat a rank already in its column goes to the bottom of the deck and the next card is dealt instead, so no column starts with a pair in it. If every card left would repeat a rank, the rule gives way.",
        "Choosing Pairs: four cards of each rank make two pairs, and which two pair first can decide whether a column's buried cards ever come free.",
      ],
    },
    settingsAndVariants: [],
  },
  montecarlo: {
    title: "Monte Carlo",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Monte_Carlo_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/montecarlo/overview.png",
      caption:
        "Monte Carlo board showing the stock at the left, twenty-five face-up cards in a five-by-five grid, and the empty discard at the right.",
      altText: "Monte Carlo solitaire board overview",
    },
    summary: {
      objective: "Discard the whole deck in pairs of touching cards.",
      winCondition: "All 52 cards are on the discard.",
      quickOverview:
        "Monte Carlo deals twenty-five cards face-up into a five-by-five grid. Remove pairs of the same rank that touch — side by side, one above the other, or corner to corner. Then consolidate: the remaining cards close up towards the top left, in reading order, and the stock fills the gaps left at the end.",
    },
    detailedRules: {
      layout: [
        "Stock: 27 face-down cards at the left of the grid.",
        "Grid: 5 rows of 5 face-up cards.",
        "Discard: a single pile at the right of the grid, initially empty.",
      ],
      cardMovement: [
        "Drag a card onto a touching card of the same rank, in any suit, and both go to the discard. Diagonal neighbours count.",
        "Double-press a card to pair it with the first touching card of its rank.",
        "Press the stock to consolidate: every card left slides towards the top left in reading order, closing the gaps, and the stock deals into the cells left empty at the end.",
        "Once the stock is gone, its empty slot still consolidates the grid.",
      ],
      sequenceBuilding: [
        "Nothing is built: cards only leave the grid, two at a time.",
        "Cards keep their reading order when they slide, so a card's neighbours change with every consolidation.",
      ],
      specialRules: [
        "Lost Game: if no touching pair is left and consolidating changes nothing, the game is over.",
        "Choosing Pairs: which pairs you take decides how the grid closes up, and so which cards end up touching next.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect: "Monte Carlo: touching pairs of the same rank.",
          },
          {
            value: 1,
            effect:
              "Monte Carlo Thirteens: touching pairs that add up to thirteen — Ace and Queen, Two and Jack, Three and Ten, and so on, with the Ace counting one, the Jack eleven and the Queen twelve. A King adds up to thirteen by itself, so it goes to the discard alone: drag it there or double-press it.",
          },
        ],
      },
    ],
  },
  labellelucie: {
    title: "La Belle Lucie",
    wikipediaUrl: "https://en.wikipedia.org/wiki/La_Belle_Lucie",
    screenshot: {
      url: "./docs/screenshots/labellelucie/overview.png",
      caption:
        "La Belle Lucie board showing the redeal marker and four empty foundations along the top, and eighteen face-up fans in two rows of nine.",
      altText: "La Belle Lucie solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition: "All 52 cards are sorted into their suit foundations.",
      quickOverview:
        "La Belle Lucie deals the whole deck face-up into seventeen fans of three cards and one of a single card. Only the top card of a fan can move, onto a foundation or onto the next higher card of its suit. An emptied fan stays empty — and when you are stuck, the fans can be gathered, shuffled and dealt again in threes, twice per game.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 suit piles at the top-right, initially empty.",
        "Redeal: a marker at the top-left, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.",
        "Tableau: 17 fans of 3 face-up cards and 1 fan of a single card, in two rows.",
      ],
      cardMovement: [
        "Only the top card of a fan can be moved, one card at a time.",
        "A card can go onto a fan whose top card is the same suit and exactly 1 rank higher.",
        "An empty fan can never be filled again.",
        "Press the redeal marker to gather every card left in the fans, shuffle them, and deal them out again in threes from the first fan.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from Ace to King.",
        "Fans: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "Two Redeals: each redeal deals the cards in threes, so the fans grow fewer as the foundations fill. Once both are spent, or no card is left in the fans, the marker becomes a plain outline.",
        "Buried Kings: a King can never move except to its foundation, so one dealt above lower cards of its suit blocks them until a redeal.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "La Belle Lucie: fans build down in suit, empty fans stay empty, and the fans can be redealt twice.",
          },
          {
            value: 1,
            effect:
              "The Fan: as La Belle Lucie, but a King — and only a King — can fill an empty fan, and there is no redeal. Each emptied fan becomes a place to free a buried King.",
          },
          {
            value: 2,
            effect:
              "Shamrocks: fans build up or down by rank in any suit, but no fan may ever hold more than three cards, and there is no redeal. Empty fans stay empty.",
          },
        ],
      },
    ],
  },
  trefoil: {
    title: "Trefoil",
    wikipediaUrl: "https://en.wikipedia.org/wiki/La_Belle_Lucie",
    screenshot: {
      url: "./docs/screenshots/trefoil/overview.png",
      caption:
        "Trefoil board showing the redeal marker at the top-left, the four Aces on their foundations, and sixteen face-up fans of three in two rows of eight.",
      altText: "Trefoil solitaire board overview",
    },
    summary: {
      objective:
        "Move all 52 cards to the four foundation piles, built up by suit from Ace to King.",
      winCondition: "All 52 cards are sorted into their suit foundations.",
      quickOverview:
        "Trefoil is La Belle Lucie with the four Aces already on the foundations. The other 48 cards are dealt face-up into sixteen fans of three. Only the top card of a fan moves, an emptied fan stays empty, and the fans can be gathered and dealt again twice.",
    },
    detailedRules: {
      layout: [
        "Foundations: 4 suit piles at the top-right, each started with an Ace.",
        "Redeal: a marker at the top-left, worth two uses per game. Its pips count them: filled for each redeal left, hollow for each one spent.",
        "Tableau: 16 fans of 3 face-up cards, in two rows of eight.",
      ],
      cardMovement: [
        "Only the top card of a fan can be moved, one card at a time.",
        "A card can go onto a fan whose top card is the same suit and exactly 1 rank higher.",
        "An empty fan can never be filled again.",
        "Press the redeal marker to gather every card left in the fans, shuffle them, and deal them out again in threes from the first fan.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from the Ace to King.",
        "Fans: Built DOWN in SAME SUIT.",
      ],
      specialRules: [
        "Two Redeals: once both are spent, or no card is left in the fans, the marker becomes a plain outline.",
        "With the Aces out of the way from the start, every Two can go home as soon as it is free, which makes Trefoil easier than La Belle Lucie.",
      ],
    },
    settingsAndVariants: [],
  },
  canfield: {
    title: "Canfield",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Canfield_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/canfield/overview.png",
      caption:
        "Canfield board showing the stock and waste at the top-left, the first foundation started by the deal, the thirteen-card reserve under the stock, and four columns of one card each.",
      altText: "Canfield solitaire board overview",
    },
    summary: {
      objective:
        "Build all 52 cards onto the four foundations, each in suit from the rank the deal chose, round past the King to the Ace.",
      winCondition: "All 52 cards are on the foundations.",
      quickOverview:
        "Canfield deals thirteen cards to a reserve, turns the next card onto a foundation — its rank is where every foundation starts — and one card to each of four columns. The columns build down in alternating colours, turning the corner from Ace to King, and a space is filled from the reserve at once. The stock is drawn three at a time, as often as you like.",
    },
    detailedRules: {
      layout: [
        "Stock: the face-down cards at the top-left, drawn three at a time onto the waste beside it.",
        "Foundations: 4 piles at the top-right, the first started by the deal.",
        "Reserve: 13 cards under the stock, face-down but for the top card.",
        "Tableau: 4 columns under the foundations, one face-up card each.",
      ],
      cardMovement: [
        "The top card of the waste, the top card of the reserve and any properly built run in a column can be moved.",
        "When a column empties, the reserve's top card fills it at once. Once the reserve is gone, a space can be filled from the waste.",
        "Taking a card off the reserve turns up the one beneath it.",
        "Pressing the stock draws three cards onto the waste; pressing the empty stock turns the waste back over.",
      ],
      sequenceBuilding: [
        "Foundations: start on the rank of the card the deal turned up, then Built UP in SAME SUIT, from King round to Ace.",
        "Tableau: Built DOWN in ALTERNATING COLORS, from Ace round to King.",
      ],
      specialRules: [
        "Unlimited Redeals: the waste can be turned back over as often as you like.",
        "The Reserve Is the Game: getting through the reserve's thirteen cards is the usual path to a win, since the stock always comes round again.",
      ],
    },
    settingsAndVariants: [
      {
        optionId: "variant",
        choicesExplanation: [
          {
            value: 0,
            effect:
              "Canfield: columns build down in alternating colours, the reserve fills spaces at once, and the stock is drawn in threes with unlimited redeals.",
          },
          {
            value: 1,
            effect:
              "Storehouse: the four Twos start the foundations, columns build down in suit, and the stock is drawn one card at a time with two redeals, counted in pips on the empty stock. Easier than Canfield.",
          },
          {
            value: 2,
            effect:
              "Superior Canfield: the reserve is dealt face-up and fanned so every card in it can be read, and spaces are not filled automatically — any card or run can fill one, whenever you choose.",
          },
          {
            value: 3,
            effect:
              "Rainbow: columns build down regardless of colour, and the stock is drawn one card at a time with no redeal.",
          },
        ],
      },
    ],
  },
  penguin: {
    title: "Penguin",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Penguin_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/penguin/overview.png",
      caption:
        "Penguin board showing the seven cells of the flipper and four foundations along the top, three of them started with the beak's rank, and seven face-up columns of seven beneath.",
      altText: "Penguin solitaire board overview",
    },
    summary: {
      objective:
        "Build all 52 cards onto the four foundations, in suit from the beak's rank, round past the King to the Ace.",
      winCondition: "All 52 cards are on the foundations.",
      quickOverview:
        "Penguin deals the deck face-up into seven columns of seven. The first card dealt, at the top of the first column, is the beak: the other three cards of its rank go straight to the foundations, and every foundation builds up in suit from that rank. Columns build down in suit, turning the corner from Ace to King, and whole runs move at once. Seven cells — the flipper — hold a card each.",
    },
    detailedRules: {
      layout: [
        "Flipper: 7 single-card cells at the top-left.",
        "Foundations: 4 piles at the top-right, three of them started by the deal with the other cards of the beak's rank.",
        "Tableau: 7 columns of 7 face-up cards, the beak at the top of the first.",
      ],
      cardMovement: [
        "Any single card can go into an empty cell.",
        "A same-suit run moves as a unit, however long it is and however many cells are free.",
        "An empty column takes only a card of the rank below the beak, or a run headed by one.",
      ],
      sequenceBuilding: [
        "Foundations: start on the beak's rank, then Built UP in SAME SUIT, from King round to Ace.",
        "Tableau: Built DOWN in SAME SUIT, from Ace round to King.",
      ],
      specialRules: [
        "The Beak: the card at the top of the first column sets the rank every foundation starts on, and it is buried under six more — freeing it is often the first job.",
        "Nearly Always Winnable: David Parlett's game can be won from almost every deal with careful play.",
      ],
    },
    settingsAndVariants: [],
  },
  blackhole: {
    title: "Black Hole",
    wikipediaUrl: "https://en.wikipedia.org/wiki/Black_Hole_(solitaire)",
    screenshot: {
      url: "./docs/screenshots/blackhole/overview.png",
      caption:
        "Black Hole board showing the Ace of Spades in the hole at the middle of the top row, and seventeen face-up fans of three around it.",
      altText: "Black Hole solitaire board overview",
    },
    summary: {
      objective:
        "Play every card into the black hole, one rank up or down at a time.",
      winCondition: "All 52 cards are in the hole.",
      quickOverview:
        "Black Hole starts the hole with the Ace of Spades and deals the other 51 cards face-up into seventeen fans of three. The top card of any fan can go into the hole if it is one rank above or below the hole's top card, in any suit — and Ace and King count as neighbours. There is no stock: every card is in view from the start.",
    },
    detailedRules: {
      layout: [
        "Hole: a single foundation in the middle of the top row, started with the Ace of Spades.",
        "Tableau: 17 fans of 3 face-up cards.",
      ],
      cardMovement: [
        "Press a fan's top card to play it into the hole, or drag it there.",
        "Nothing is ever placed on a fan: cards only leave them.",
      ],
      sequenceBuilding: [
        "Hole: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent — a run can climb, fall and turn the corner as it likes.",
      ],
      specialRules: [
        "Plan Ahead: with every card in view and no stock to fall back on, the whole game can be worked out before the first move. David Parlett, who invented it, made it a game of foresight rather than luck; most deals can be won.",
      ],
    },
    settingsAndVariants: [],
  },
  allinarow: {
    title: "All in a Row",
    screenshot: {
      url: "./docs/screenshots/allinarow/overview.png",
      caption:
        "All in a Row board showing the empty foundation in the middle of the top row and thirteen face-up columns of four beneath.",
      altText: "All in a Row solitaire board overview",
    },
    summary: {
      objective:
        "Play every card onto the single foundation, one rank up or down at a time.",
      winCondition: "All 52 cards are on the foundation.",
      quickOverview:
        "All in a Row deals the whole deck face-up into thirteen columns of four. Any column's top card can start the foundation; after that, a top card can go onto it if it is one rank above or below the foundation's top card, in any suit, with Ace and King counting as neighbours.",
    },
    detailedRules: {
      layout: [
        "Foundation: a single pile in the middle of the top row, initially empty.",
        "Tableau: 13 columns of 4 face-up cards.",
      ],
      cardMovement: [
        "Press a column's top card to play it onto the foundation, or drag it there.",
        "Any top card can start the foundation.",
        "Nothing is ever placed on a column, and an emptied column stays empty.",
      ],
      sequenceBuilding: [
        "Foundation: one rank HIGHER or LOWER than its top card, in ANY SUIT, with King and Ace adjacent.",
      ],
      specialRules: [
        "The First Card: choosing which card starts the foundation is the most important decision of the game.",
      ],
    },
    settingsAndVariants: [],
  },
  grandfathersclock: {
    title: "Grandfather's Clock",
    screenshot: {
      url: "./docs/screenshots/grandfathersclock/overview.png",
      caption:
        "Grandfather's Clock board showing twelve foundations laid round a dial at the left, from the Nine of Diamonds at twelve o'clock round to the Eight of Clubs at eleven, and eight face-up columns of five beside it.",
      altText: "Grandfather's Clock solitaire board overview",
    },
    summary: {
      objective:
        "Build each of the twelve foundations round the dial up in suit until its top card shows the hour it stands at.",
      winCondition:
        "All 52 cards are on the dial, every foundation ending on its hour — Jack at eleven, Queen at twelve.",
      quickOverview:
        "Grandfather's Clock lays twelve cards round a dial, the Two of Spades at five o'clock and each hour clockwise one rank higher, to the King of Diamonds at four. Each builds up in suit, turning the corner from King to Ace, until it reaches its hour. The other forty cards are dealt face-up into eight columns of five, which build down regardless of suit.",
    },
    detailedRules: {
      layout: [
        "Dial: 12 foundations in a circle at the left, started with the Two of Spades at five o'clock through to the King of Diamonds at four o'clock, the suits taken in turn: spades, hearts, clubs, diamonds.",
        "Tableau: 8 columns of 5 face-up cards beside the dial.",
      ],
      cardMovement: [
        "Only the top card of a column can be moved, one card at a time.",
        "A card can go onto a column whose top card is exactly 1 rank higher, in any suit.",
        "Any card can fill an empty column.",
        "Double-press a card to send it to the foundation that takes it; each card fits only one.",
      ],
      sequenceBuilding: [
        "Foundations: Built UP in SAME SUIT from their starting card, from King round to Ace, until the top card's rank is the hour — so those from five to twelve o'clock take three more cards, and those from one to four o'clock take four.",
        "Tableau: Built DOWN by RANK in ANY SUIT.",
      ],
      specialRules: [
        "Telling the Time: Ace counts one, Jack eleven and Queen twelve; once a foundation shows its hour it is complete and takes nothing more.",
        "One of the more forgiving patiences: with spaces open to any card, most deals come out.",
      ],
    },
    settingsAndVariants: [],
  },
};
