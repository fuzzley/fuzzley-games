import {
  CatalogEntry,
  GAME_CATALOG,
  GameOptionSpec,
  GameOptionValues,
} from "@/ui/app/provider/game_catalog";

/**
 * Returns every combination of the rules a game offers.
 *
 * A sweep, since a game is wired up twice, to be dealt and to be drawn, and a
 * rule can reach one and be forgotten in the other.
 */
export function ruleCombinations(
  options: readonly GameOptionSpec[],
): GameOptionValues[] {
  return options.reduce<GameOptionValues[]>(
    (combinations, option) =>
      combinations.flatMap((values) =>
        option.choices.map((choice) => ({
          ...values,
          [option.id]: choice.value,
        })),
      ),
    [{}],
  );
}

/** Pairs a game with one setting of its rules, named for failure messages. */
export type CatalogDeal = [
  name: string,
  entry: CatalogEntry,
  values: GameOptionValues,
];

/** Every game paired with every setting of the rules it offers. */
export const CATALOG_DEALS: readonly CatalogDeal[] = GAME_CATALOG.flatMap(
  (entry) =>
    ruleCombinations(entry.options).map((values): CatalogDeal => [
      `${entry.name} ${JSON.stringify(values)}`,
      entry,
      values,
    ]),
);
