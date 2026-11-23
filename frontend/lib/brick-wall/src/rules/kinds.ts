import { keysOf } from "@fz/core/records";

/**
 * Returns the ids of the kinds of brick in a wall game's catalog that a test
 * holds for, in the order the catalog writes them, such as the kinds a level
 * must have broken to be cleared.
 */
export function kindsWhere<K extends string, Kind>(
  catalog: Readonly<Record<K, Kind>>,
  holds: (kind: Kind, id: K) => boolean,
): K[] {
  return keysOf(catalog).filter((id) => holds(catalog[id], id));
}
