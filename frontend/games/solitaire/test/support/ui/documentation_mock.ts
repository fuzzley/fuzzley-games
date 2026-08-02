import type {
  GameDocumentation,
  GameOptionDoc,
} from "@/ui/app/model/game_documentation.model";
import type { GameDocumentationRegistry } from "@/ui/app/provider/game_documentation_data";

/**
 * Documentation for the two games the mock catalog offers.
 *
 * Deliberately not the real prose. A component spec that asserted against the
 * shipped rules text would fail the day someone reworded a rules page, which
 * tells nobody anything about the modal that renders it. What the modal is
 * responsible for is showing whichever documentation it is given, and that is
 * what this lets a spec check.
 *
 * Klondike here has a documented option so the variants tab has something to
 * show; FreeCell has none, which is the case the tab has to hide itself for.
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
