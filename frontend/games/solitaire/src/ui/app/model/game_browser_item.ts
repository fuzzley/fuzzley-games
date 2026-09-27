import { CatalogEntry, GameOptionValues } from "../provider/game_catalog";
import {
  DifficultyRating,
  GameFamilyProfile,
  GameProfileRegistry,
} from "./game_profile.model";

/**
 * Describes one game the browser lists: a catalog entry, played with some of
 * its rules fixed when it is a named variant.
 */
export interface GameBrowserItem {
  /** Stable id, safe to use in an element id. */
  readonly key: string;
  /** The catalog entry that plays it. */
  readonly gameId: string;
  readonly name: string;
  /** The name of the game this is a variant of, if it is one. */
  readonly parentName?: string;
  readonly family: GameFamilyProfile;
  readonly tagline: string;
  readonly difficulty: DifficultyRating;
  readonly decks: 1 | 2;
  readonly allCardsVisible: boolean;
  /** Other names it is known by. */
  readonly aliases: readonly string[];
  /**
   * The rules this item fixes, which the player cannot change from the
   * browser; every other rule keeps the player's choice.
   */
  readonly pinned: GameOptionValues;
}

/**
 * Returns the games the browser lists, family by family in the registry's
 * order, each family's games in catalog order with a game's named variants
 * straight after it.
 *
 * A game with no profile, or one naming an undeclared family, is left out.
 */
export function browserItems(
  catalog: readonly CatalogEntry[],
  profiles: GameProfileRegistry,
): GameBrowserItem[] {
  return profiles.families.flatMap((family) =>
    catalog.flatMap((entry) => {
      const profile = profiles.games[entry.id];
      if (profile?.family !== family.id) return [];

      const variants = profile.variants ?? [];
      const shared = {
        gameId: entry.id,
        family,
        decks: profile.decks,
        allCardsVisible: profile.allCardsVisible,
      };
      const parent: GameBrowserItem = {
        ...shared,
        key: entry.id,
        name: entry.name,
        tagline: profile.tagline,
        difficulty: profile.difficulty,
        aliases: profile.aliases ?? [],
        pinned: parentPins(entry, variants),
      };
      return [
        parent,
        ...variants.map((variant): GameBrowserItem => ({
          ...shared,
          key: `${entry.id}-${slug(variant.name)}`,
          name: variant.name,
          parentName: entry.name,
          tagline: variant.tagline,
          difficulty: variant.difficulty,
          aliases: variant.aliases ?? [],
          pinned: variant.values,
        })),
      ];
    }),
  );
}

/** Returns whether an item is the game being played by the given rules. */
export function isPlayedBy(
  item: GameBrowserItem,
  gameId: string,
  values: GameOptionValues,
): boolean {
  return (
    item.gameId === gameId &&
    Object.entries(item.pinned).every(
      ([optionId, value]) => values[optionId] === value,
    )
  );
}

/**
 * Pins, for a game with named variants, each rule a variant fixes to its
 * default, so that choosing the game itself never deals one of its variants.
 */
function parentPins(
  entry: CatalogEntry,
  variants: readonly { readonly values: GameOptionValues }[],
): GameOptionValues {
  const pinnedIds = new Set(
    variants.flatMap((variant) => Object.keys(variant.values)),
  );
  return Object.fromEntries(
    entry.options
      .filter((option) => pinnedIds.has(option.id))
      .map((option) => [option.id, option.defaultValue]),
  );
}

/** Returns a name as lowercase words joined by hyphens. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
