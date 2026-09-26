import { ZoneSpec } from "./zone";

/** Places a zone, or a row of them, on the board grid. */
export interface GridPlacement {
  /**
   * The column of the first pile, with the rest following consecutively, or a
   * function returning each pile's column.
   */
  readonly column: number | ((index: number) => number);
  /** The grid row the piles sit in. */
  readonly row: number;
}

/** Describes a row of like piles: what they are and where they sit. */
export interface ZoneRowSpec
  extends Omit<ZoneSpec, "id" | "slot">, GridPlacement {
  /** How many piles to build. */
  readonly count: number;
  /** The stable id of the pile at the given index. */
  readonly id: (index: number) => string;
}

/** Describes a single pile, placed by hand. */
export interface SingleZoneSpec
  extends Omit<ZoneSpec, "slot">, Omit<GridPlacement, "column"> {
  /** The grid column the pile sits in. */
  readonly column: number;
}

/** Builds a row of piles that differ only in their id and their column. */
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

/** Builds one pile placed by hand, such as a stock or a waste. */
export function zoneAt(spec: SingleZoneSpec): ZoneSpec {
  const { column, row, ...zone } = spec;
  return { ...zone, slot: { pileId: zone.id, column, row } };
}

/**
 * Remembers the zones built for each set of choices, so a game hands back the
 * same array every time.
 *
 * {@link TableGame.zoneFor} rebuilds its index whenever the array changes, and
 * it is asked once per card per frame.
 *
 * @param keyOf Reduces the choices to a cache key; the first argument by
 *   default.
 */
export function memoizeZones<Args extends readonly unknown[]>(
  build: (...args: Args) => readonly ZoneSpec[],
  keyOf: (...args: Args) => unknown = (...args) => args[0],
): (...args: Args) => readonly ZoneSpec[] {
  const cache = new Map<unknown, readonly ZoneSpec[]>();
  return (...args: Args) => {
    const key = keyOf(...args);
    let zones = cache.get(key);
    if (!zones) {
      zones = build(...args);
      cache.set(key, zones);
    }
    return zones;
  };
}
