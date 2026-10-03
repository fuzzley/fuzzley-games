import type {
  GameDocumentation,
  GameOptionDoc,
} from "@/ui/app/model/game_documentation.model";
import type { GameDocumentationRegistry } from "@/ui/app/provider/game_documentation_data";

/**
 * Documentation for the two games the mock catalog offers, in place of the real
 * prose so no spec breaks when a rules page is reworded.
 *
 * Klondike documents an option so the variants tab has something to show;
 * FreeCell documents none, so the tab hides.
 */
const KLONDIKE_DRAW_COUNT_DOC: GameOptionDoc = {
  optionId: "drawCount",
  choicesExplanation: [
    { value: 1, effect: "Turns one card at a time." },
    { value: 3, effect: "Turns three cards at a time." },
  ],
};

const KLONDIKE_DOC: GameDocumentation = {
  title: "Test Klondike",
  wikipediaUrl: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
  screenshot: {
    url: "./test/klondike.png",
    caption: "A test board.",
    altText: "A test board.",
  },
  summary: {
    objective: "Move every card to the foundations.",
    winCondition: "All four foundations are complete.",
    quickOverview: "A test overview.",
  },
  detailedRules: {
    layout: ["Seven tableau columns."],
    cardMovement: ["Drag a card to move it."],
    sequenceBuilding: ["Build down in alternating colours."],
    specialRules: ["The stock recycles."],
  },
  settingsAndVariants: [KLONDIKE_DRAW_COUNT_DOC],
};

const FREECELL_DOC: GameDocumentation = {
  title: "Test FreeCell",
  screenshot: {
    url: "./test/freecell.png",
    caption: "Another test board.",
    altText: "Another test board.",
  },
  summary: {
    objective: "Move every card to the foundations.",
    winCondition: "All four foundations are complete.",
    quickOverview: "A test overview.",
  },
  detailedRules: {
    layout: ["Eight tableau columns."],
    cardMovement: ["Drag a card to move it."],
    sequenceBuilding: ["Build down in alternating colours."],
  },
  settingsAndVariants: [],
};

/** A registry covering the games the mock catalog offers. */
export const TEST_DOCUMENTATION: GameDocumentationRegistry = {
  klondike: KLONDIKE_DOC,
  freecell: FREECELL_DOC,
};
