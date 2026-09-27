import { describe, it, expect } from "vitest";
import {
  GameBrowserItem,
  browserItems,
} from "@/ui/app/model/game_browser_item";
import {
  GameFilters,
  NO_FILTERS,
  hasFilters,
  searchGames,
} from "@/ui/app/model/game_search";
import { Difficulty } from "@/ui/app/model/game_profile.model";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";
import { GAME_PROFILE_REGISTRY } from "@/ui/app/provider/game_profile_data";

const FAMILY = { id: "test", name: "Test family", description: "Tests." };

/** Returns a browser item with the given name, and plain defaults elsewhere. */
function item(
  name: string,
  overrides: Partial<GameBrowserItem> = {},
): GameBrowserItem {
  return {
    key: name,
    gameId: name,
    name,
    family: FAMILY,
    tagline: "A game.",
    difficulty: Difficulty.MEDIUM,
    decks: 1,
    allCardsVisible: false,
    aliases: [],
    pinned: {},
    ...overrides,
  };
}

/** Returns the names of the games a search finds, in order. */
function namesFound(
  items: readonly GameBrowserItem[],
  query: string,
  filters: GameFilters = NO_FILTERS,
): string[] {
  return searchGames(items, query, filters).map((result) => result.item.name);
}

/** Returns a name's segments as text, with matches in square brackets. */
function marked(
  items: readonly GameBrowserItem[],
  query: string,
): string | undefined {
  return searchGames(items, query, NO_FILTERS)[0]
    ?.nameSegments.map((s) => (s.match ? `[${s.text}]` : s.text))
    .join("");
}

describe("searchGames", () => {
  it("returns every game in the order given for a blank query", () => {
    const items = [item("Spider"), item("Klondike")];

    expect(namesFound(items, "  ")).toEqual(["Spider", "Klondike"]);
  });

  it("leaves a name unmarked for a blank query", () => {
    expect(marked([item("Spider")], "")).toBe("Spider");
  });

  it("ranks an exact name above a name it starts", () => {
    const items = [item("Spiderette"), item("Spider")];

    expect(namesFound(items, "spider")).toEqual(["Spider", "Spiderette"]);
  });

  it("ranks a name above a game only related to it", () => {
    const items = [item("Alaska", { parentName: "Yukon" }), item("Yukon")];

    expect(namesFound(items, "yukon")).toEqual(["Yukon", "Alaska"]);
  });

  it("requires every word of the query to match", () => {
    const items = [item("Russian Solitaire"), item("Russian Roulette")];

    expect(namesFound(items, "russian sol")).toEqual(["Russian Solitaire"]);
  });

  it("ignores case and apostrophes", () => {
    expect(namesFound([item("Baker's Game")], "BAKERS")).toEqual([
      "Baker's Game",
    ]);
  });

  it("ignores accents", () => {
    expect(namesFound([item("Pâtience")], "patience")).toEqual(["Pâtience"]);
  });

  it("finds a game by another name it goes by", () => {
    const items = [item("Montana", { aliases: ["Gaps"] }), item("Spider")];

    expect(namesFound(items, "gaps")).toEqual(["Montana"]);
  });

  it("finds a word inside a name", () => {
    expect(namesFound([item("FreeCell")], "cell")).toEqual(["FreeCell"]);
  });

  it("forgives one wrong letter in a word of four or more", () => {
    expect(namesFound([item("FreeCell")], "frecell")).toEqual(["FreeCell"]);
  });

  it("forgives two letters swapped", () => {
    expect(namesFound([item("Russian")], "russain")).toEqual(["Russian"]);
  });

  it("does not forgive a wrong letter in a short word", () => {
    expect(namesFound([item("Gap")], "gop")).toEqual([]);
  });

  it("finds a game by its difficulty", () => {
    const items = [
      item("Easy One", { difficulty: Difficulty.EASY }),
      item("Hard One", { difficulty: Difficulty.HARD }),
    ];

    expect(namesFound(items, "hard")).toEqual(["Hard One"]);
  });

  it("finds a game by its deck count", () => {
    const items = [item("Single"), item("Double", { decks: 2 })];

    expect(namesFound(items, "two decks")).toEqual(["Double"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(namesFound([item("Spider")], "xyzzy")).toEqual([]);
  });

  it("marks where each word of the query starts a word of the name", () => {
    expect(marked([item("Russian Solitaire")], "sol rus")).toBe(
      "[Rus]sian [Sol]itaire",
    );
  });

  it("marks an apostrophe inside a matched word", () => {
    expect(marked([item("Baker's Game")], "bakers")).toBe("[Baker's] Game");
  });

  it("marks a match inside a word", () => {
    expect(marked([item("FreeCell")], "cell")).toBe("Free[Cell]");
  });

  it("marks nothing for a match by another name", () => {
    expect(marked([item("Montana", { aliases: ["Gaps"] })], "gaps")).toBe(
      "Montana",
    );
  });
});

describe("searchGames' filters", () => {
  it("keeps a game any chosen difficulty falls within", () => {
    const items = [
      item("Spider", {
        difficulty: {
          optionId: "suitCount",
          byChoice: { 1: Difficulty.EASY, 4: Difficulty.HARD },
        },
      }),
      item("FreeCell", { difficulty: Difficulty.MEDIUM }),
      item("Russian", { difficulty: Difficulty.HARD }),
    ];

    const found = namesFound(items, "", {
      ...NO_FILTERS,
      difficulties: [Difficulty.EASY, Difficulty.MEDIUM],
    });

    expect(found).toEqual(["Spider", "FreeCell"]);
  });

  it("keeps the games dealt from a chosen number of decks", () => {
    const items = [item("Klondike"), item("Spider", { decks: 2 })];

    const found = namesFound(items, "", { ...NO_FILTERS, decks: [2] });

    expect(found).toEqual(["Spider"]);
  });

  it("keeps only the games with every card in view", () => {
    const items = [
      item("Klondike"),
      item("FreeCell", { allCardsVisible: true }),
    ];

    const found = namesFound(items, "", {
      ...NO_FILTERS,
      allCardsVisible: true,
    });

    expect(found).toEqual(["FreeCell"]);
  });

  it("applies every facet at once", () => {
    const items = [
      item("Open Double", { decks: 2, allCardsVisible: true }),
      item("Open Single", { allCardsVisible: true }),
      item("Closed Double", { decks: 2 }),
    ];

    const found = namesFound(items, "", {
      ...NO_FILTERS,
      decks: [2],
      allCardsVisible: true,
    });

    expect(found).toEqual(["Open Double"]);
  });

  it("applies the filters to a search", () => {
    const items = [item("Spider", { decks: 2 }), item("Spiderette")];

    const found = namesFound(items, "spider", { ...NO_FILTERS, decks: [1] });

    expect(found).toEqual(["Spiderette"]);
  });
});

describe("hasFilters", () => {
  it("is false for no filters", () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
  });

  it("is true once any facet narrows", () => {
    expect(hasFilters({ ...NO_FILTERS, allCardsVisible: true })).toBe(true);
  });
});

describe("searching the real catalog", () => {
  const items = browserItems(GAME_CATALOG, GAME_PROFILE_REGISTRY);

  it.each([
    ["russian", "Russian Solitaire"],
    ["gaps", "Montana"],
    ["streets", "Josephine"],
    ["frecell", "FreeCell"],
    ["seahven", "Seahaven Towers"],
    ["will o the wisp", "Will o' the Wisp"],
  ])("finds %s first as %s", (query, name) => {
    expect(namesFound(items, query)[0]).toBe(name);
  });

  it("finds both of the Baker's games", () => {
    expect(namesFound(items, "bakers")).toEqual([
      "Baker's Game",
      "Baker's Dozen",
    ]);
  });

  it("lists a game's variants after the game itself", () => {
    expect(namesFound(items, "yukon")).toEqual([
      "Yukon",
      "Alaska",
      "Russian Solitaire",
    ]);
  });
});
