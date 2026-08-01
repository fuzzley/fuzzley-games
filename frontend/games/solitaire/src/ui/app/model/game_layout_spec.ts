/**
 * Definition of a top-row zone group for a game's layout.
 */
export interface LayoutZoneGroup {
  readonly type: "stock" | "waste" | "freecell" | "foundation";
  readonly count: number;
}

/**
 * Skeleton layout specification for a game, used to render matching placeholder states.
 */
export interface GameLayoutSpec {
  /** Top-row zone groups (e.g. stock, waste, freecells, foundations). */
  readonly topRow: readonly LayoutZoneGroup[];
  /** Number of tableau columns. */
  readonly tableauColumns: number;
}

/**
 * Returns the layout skeleton specification for a game id.
 * Modular and reusable mapping across all Solitaire variants.
 */
export function gameLayoutSpec(gameId: string): GameLayoutSpec {
  switch (gameId) {
    case "freecell":
    case "bakers":
      return {
        topRow: [
          { type: "freecell", count: 4 },
          { type: "foundation", count: 4 },
        ],
        tableauColumns: 8,
      };
    case "spider":
      return {
        topRow: [
          { type: "stock", count: 1 },
          { type: "foundation", count: 8 },
        ],
        tableauColumns: 10,
      };
    case "yukon":
      return {
        topRow: [{ type: "foundation", count: 4 }],
        tableauColumns: 7,
      };
    case "eightoff":
      return {
        topRow: [
          { type: "freecell", count: 8 },
          { type: "foundation", count: 4 },
        ],
        tableauColumns: 8,
      };
    case "scorpion":
      return {
        topRow: [
          { type: "stock", count: 1 },
          { type: "foundation", count: 4 },
        ],
        tableauColumns: 7,
      };
    case "klondike":
    default:
      return {
        topRow: [
          { type: "stock", count: 1 },
          { type: "waste", count: 1 },
          { type: "foundation", count: 4 },
        ],
        tableauColumns: 7,
      };
  }
}
