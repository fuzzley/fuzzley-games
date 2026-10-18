import { describe, it, expect } from "vitest";
import {
  CatalogEntry,
  GAME_CATALOG,
  GameId,
  GameOptionValues,
} from "@/ui/app/provider/game_catalog";
import { GAME_PROFILE_REGISTRY } from "@/ui/app/provider/game_profile_data";
import { GAME_DOCUMENTATION_REGISTRY } from "@/ui/app/provider/game_documentation_data";
import type {
  DifficultyByRule,
  DifficultyRating,
  GameProfile,
} from "@/ui/app/model/game_profile.model";
import { TableGame } from "@/engine/tableau/game/table_game";

/** Returns the profile of a catalog entry. */
function profileOf(entry: CatalogEntry): GameProfile {
  return GAME_PROFILE_REGISTRY.games[entry.id as GameId];
}

/** Deals a catalog entry by its default rules, as the table game each is. */
function dealDefault(entry: CatalogEntry): TableGame {
  const { game } = entry.create({});
  if (!(game instanceof TableGame)) {
    throw new Error("Every game in the catalog is a table game.");
  }
  return game;
}

/** Every game with its profile, named for the failure message. */
const PROFILED: [name: string, entry: CatalogEntry, profile: GameProfile][] =
  GAME_CATALOG.map((entry) => [entry.name, entry, profileOf(entry)]);

/** Pairs a rule-decided difficulty with the game whose rule decides it. */
type RuleRating = [name: string, entry: CatalogEntry, rating: DifficultyByRule];

/** Returns a rating as a rule rating, or nothing if it is fixed. */
function byRule(
  name: string,
  entry: CatalogEntry,
  rating: DifficultyRating,
): RuleRating[] {
  return typeof rating === "number" ? [] : [[name, entry, rating]];
}

/** Every rule-decided difficulty, of a game or of one of its variants. */
const RULE_RATINGS: RuleRating[] = PROFILED.flatMap(
  ([name, entry, profile]) => [
    ...byRule(name, entry, profile.difficulty),
    ...(profile.variants ?? []).flatMap((variant) =>
      byRule(variant.name, entry, variant.difficulty),
    ),
  ],
);

/** Every game, rather than variant, whose difficulty a rule decides. */
const GAME_RULE_RATINGS: RuleRating[] = PROFILED.flatMap(
  ([name, entry, profile]) => byRule(name, entry, profile.difficulty),
);

/**
 * Returns the rules a game's named variants fix, which the game's own row
 * fixes to their defaults.
 */
function rulesFixedByVariants(profile: GameProfile): string[] {
  return (profile.variants ?? []).flatMap((variant) =>
    Object.keys(variant.values),
  );
}

/** Every choice but the default of a rule some named variant fixes. */
const FIXED_CHOICES = PROFILED.flatMap(([name, entry, profile]) => {
  const fixed = rulesFixedByVariants(profile);
  return entry.options
    .filter((option) => fixed.includes(option.id))
    .flatMap((option) =>
      option.choices
        .filter((choice) => choice.value !== option.defaultValue)
        .map(
          (
            choice,
          ): [
            name: string,
            choice: string,
            profile: GameProfile,
            optionId: string,
            value: number,
          ] => [name, choice.label, profile, option.id, choice.value],
        ),
    );
});

/** Every named variant, with the entry that plays it. */
const VARIANTS = PROFILED.flatMap(([, entry, profile]) =>
  (profile.variants ?? []).map(
    (
      variant,
    ): [name: string, entry: CatalogEntry, values: GameOptionValues] => [
      variant.name,
      entry,
      variant.values,
    ],
  ),
);

describe("the game profiles", () => {
  it("declare each family under a distinct id", () => {
    const ids = GAME_PROFILE_REGISTRY.families.map((family) => family.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("list a game under every family they declare", () => {
    const used = new Set(PROFILED.map(([, , profile]) => profile.family));

    const empty = GAME_PROFILE_REGISTRY.families.filter(
      (family) => !used.has(family.id),
    );

    expect(empty).toEqual([]);
  });

  it("name every game and variant distinctly", () => {
    const names = PROFILED.flatMap(([name, , profile]) => [
      name,
      ...(profile.variants ?? []).map((variant) => variant.name),
    ]);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each(PROFILED)("list %s under a declared family", (_name, _entry, p) => {
    const ids = GAME_PROFILE_REGISTRY.families.map((family) => family.id);

    expect(ids).toContain(p.family);
  });

  it.each(PROFILED)(
    "count %s's decks from the cards it deals",
    (_name, entry, profile) => {
      const game = dealDefault(entry);
      const cards = game.piles.reduce(
        (total, pile) => total + pile.getCards().length,
        0,
      );

      expect(Math.ceil(cards / 52)).toBe(profile.decks);
    },
  );

  it.each(PROFILED)(
    "say whether %s deals every card face-up",
    (_name, entry, profile) => {
      const game = dealDefault(entry);

      const allFaceUp = game.piles.every((pile) =>
        pile.getCards().every((card) => card.faceUp),
      );

      expect(allFaceUp).toBe(profile.allCardsVisible);
    },
  );

  it.each(RULE_RATINGS)(
    "rate every choice of the rule deciding %s's difficulty",
    (_name, entry, rating) => {
      const option = entry.options.find((spec) => spec.id === rating.optionId);

      const choices = option?.choices.map((choice) => String(choice.value));

      expect(Object.keys(rating.byChoice).sort()).toEqual(choices?.sort());
    },
  );

  it.each(VARIANTS)(
    "play %s by rules its game offers",
    (_name, entry, values) => {
      const offered = Object.entries(values).every(([optionId, value]) =>
        entry.options
          .find((spec) => spec.id === optionId)
          ?.choices.some((choice) => choice.value === value),
      );

      expect(offered).toBe(true);
    },
  );

  it.each(GAME_RULE_RATINGS)(
    "rate %s by a rule its row leaves the player to choose",
    (_name, entry, rating) => {
      const fixed = rulesFixedByVariants(profileOf(entry));

      expect(fixed).not.toContain(rating.optionId);
    },
  );

  it.each(FIXED_CHOICES)(
    "list %s's %s as a variant, since its row deals only the default",
    (_name, _choice, profile, optionId, value) => {
      const listed = (profile.variants ?? []).some(
        (variant) => variant.values[optionId] === value,
      );

      expect(listed).toBe(true);
    },
  );

  it.each(VARIANTS)(
    "explain %s on its game's rules page, which the browser previews it by",
    (_name, entry, values) => {
      const doc = GAME_DOCUMENTATION_REGISTRY[entry.id as GameId];

      const explained = Object.entries(values).some(([optionId, value]) =>
        doc.settingsAndVariants
          .find((option) => option.optionId === optionId)
          ?.choicesExplanation.some((choice) => choice.value === value),
      );

      expect(explained).toBe(true);
    },
  );

  it.each(VARIANTS)(
    "play %s by other than its game's default rules",
    (_name, entry, values) => {
      const differs = Object.entries(values).some(
        ([optionId, value]) =>
          entry.options.find((spec) => spec.id === optionId)?.defaultValue !==
          value,
      );

      expect(differs).toBe(true);
    },
  );
});
