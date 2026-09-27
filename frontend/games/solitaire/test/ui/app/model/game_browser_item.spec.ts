import { describe, it, expect } from "vitest";
import { browserItems, isPlayedBy } from "@/ui/app/model/game_browser_item";
import { Difficulty } from "@/ui/app/model/game_profile.model";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";
import { GAME_PROFILE_REGISTRY } from "@/ui/app/provider/game_profile_data";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";

/** Every game the browser lists from the real catalog. */
const ITEMS = browserItems(GAME_CATALOG, GAME_PROFILE_REGISTRY);

/** Returns the listed item with the given name. */
function named(name: string) {
  const found = ITEMS.find((item) => item.name === name);
  if (!found) throw new Error(`No item is named ${name}.`);
  return found;
}

describe("browserItems", () => {
  it("lists every game and every named variant", () => {
    const variants = Object.values(GAME_PROFILE_REGISTRY.games).flatMap(
      (profile) => profile.variants ?? [],
    );

    expect(ITEMS).toHaveLength(GAME_CATALOG.length + variants.length);
  });

  it("lists the games family by family, in the registry's order", () => {
    const families = [...new Set(ITEMS.map((item) => item.family.id))];

    expect(families).toEqual(
      GAME_PROFILE_REGISTRY.families.map((family) => family.id),
    );
  });

  it("lists a game's named variants straight after it", () => {
    const names = ITEMS.map((item) => item.name);

    const yukon = names.indexOf("Yukon");

    expect(names.slice(yukon, yukon + 3)).toEqual([
      "Yukon",
      "Alaska",
      "Russian Solitaire",
    ]);
  });

  it("keys every item distinctly", () => {
    const keys = ITEMS.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keys every item with characters safe in an element id", () => {
    const unsafe = ITEMS.filter((item) => !/^[a-z0-9-]+$/.test(item.key));

    expect(unsafe).toEqual([]);
  });

  it("keys a game by its id", () => {
    expect(named("Klondike").key).toBe("klondike");
  });

  it("keys a named variant by its game and its name", () => {
    expect(named("Will o' the Wisp").key).toBe("spiderette-will-o-the-wisp");
  });

  it("names the game a variant belongs to", () => {
    expect(named("Russian Solitaire").parentName).toBe("Yukon");
  });

  it("gives a variant its game's decks", () => {
    expect(named("Josephine").decks).toBe(2);
  });

  it("pins the rules a variant fixes", () => {
    expect(named("Whitehead").pinned).toEqual({
      variant: KlondikeVariant.WHITEHEAD,
    });
  });

  it("pins a game with variants to its default rule", () => {
    expect(named("Klondike").pinned).toEqual({
      variant: KlondikeVariant.KLONDIKE,
    });
  });

  it("pins nothing for a game without variants", () => {
    expect(named("FreeCell").pinned).toEqual({});
  });

  it("leaves out a game with no profile", () => {
    const registry = {
      families: GAME_PROFILE_REGISTRY.families,
      games: { freecell: GAME_PROFILE_REGISTRY.games.freecell },
    };

    const names = browserItems(GAME_CATALOG, registry).map((i) => i.name);

    expect(names).toEqual(["FreeCell"]);
  });

  it("leaves out a game naming an undeclared family", () => {
    const registry = {
      families: GAME_PROFILE_REGISTRY.families,
      games: {
        freecell: {
          ...GAME_PROFILE_REGISTRY.games.freecell,
          family: "missing",
          difficulty: Difficulty.EASY,
        },
      },
    };

    expect(browserItems(GAME_CATALOG, registry)).toEqual([]);
  });
});

describe("isPlayedBy", () => {
  it("is true for a variant played by its rules", () => {
    const whitehead = named("Whitehead");

    const played = isPlayedBy(whitehead, "klondike", {
      variant: KlondikeVariant.WHITEHEAD,
      drawCount: 1,
    });

    expect(played).toBe(true);
  });

  it("is false for the game when one of its variants is on the table", () => {
    const played = isPlayedBy(named("Klondike"), "klondike", {
      variant: KlondikeVariant.WHITEHEAD,
    });

    expect(played).toBe(false);
  });

  it("is false for another game", () => {
    expect(isPlayedBy(named("FreeCell"), "klondike", {})).toBe(false);
  });
});
