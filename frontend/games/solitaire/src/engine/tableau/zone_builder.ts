import { ZoneSpec } from "./zone";

/**
 * Where a zone sits on the board grid.
 *
 * Separated from the rest of a zone because it is the only part a builder has
 * to work out per pile; everything else in a row of piles is the same for all
 * of them.
 */
export interface GridPlacement {
  /**
   * The grid column, either fixed or worked out per index.
   *
   * A number is the column the first pile sits in, with the rest following
   * consecutively — which is how every row on every board here is arranged
   * except Montana's grid. A function covers the rest.
   */
  readonly column: number | ((index: number) => number);
  /** The grid row the piles sit in. */
  readonly row: number;
}

/** How to build a row of like piles: what they are, and where they sit. */
export interface ZoneRowSpec
  extends Omit<ZoneSpec, "id" | "slot">,
    GridPlacement {
  /** How many piles to build. */
  readonly count: number;
  /** The stable id of the pile at the given index. */
  readonly id: (index: number) => string;
}

/** A single pile, described the same way but placed by hand. */
export interface SingleZoneSpec
  extends Omit<ZoneSpec, "slot">,
    Omit<GridPlacement, "column"> {
  /** The grid column the pile sits in. */
  readonly column: number;
}

/**
 * Builds a row of piles that differ only in their id and their column.
 *
 * Every board here is three or four such rows — cells, foundations, columns —
 * and each was written out as its own `for` loop pushing a hand-made object
 * literal. The loops were identical across thirteen games, which meant thirteen
 * places to change if a placeholder or a grab rule ever had to change with them.
 *
 * Deriving `slot.pileId` from `id` is the other reason this exists: the two are
 * the same string, and writing them separately let them disagree with nothing
 * to catch it.
 */
export function zoneRow(spec: ZoneRowSpec): ZoneSpec[] {
  const { count, id, column, row, ...zone } = spec;
  const columnAt =
    typeof column === "function" ? column : (index: number) => column + index;

  const zones: ZoneSpec[] = [];
  for (let index = 0; index < count; index++) {
    const pileId = id(index);
    zones.push({
      ...zone,
      id: pileId,
      slot: { pileId, column: columnAt(index), row },
    });
  }
  return zones;
}

/**
 * Builds one placed pile — a stock or a waste, of which a board has at most one
 * each.
 */
export function zoneAt(spec: SingleZoneSpec): ZoneSpec {
  const { column, row, ...zone } = spec;
  return { ...zone, slot: { pileId: zone.id, column, row } };
}

/**
 * Remembers the zones built for a given set of choices.
 *
 * A board's zones follow only from its variant and its settings, so there are
 * as many possible answers as there are combinations of those — and the view
 * builder asks for them every frame. Ten games cached that in a module-level
 * const and four in a hand-rolled `Map`; this is the one spelling.
 *
 * @param build Builds the zones for one key.
 * @returns The memoized form of `build`.
 */
export function memoizeZones<K>(
  build: (key: K) => readonly ZoneSpec[],
): (key: K) => readonly ZoneSpec[] {
  const cache = new Map<K, readonly ZoneSpec[]>();
  return (key: K) => {
    let zones = cache.get(key);
    if (!zones) {
      zones = build(key);
      cache.set(key, zones);
    }
    return zones;
  };
}
