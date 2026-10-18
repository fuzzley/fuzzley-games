/** What a category's games are played on: a card table's felt, or a board. */
export type Surface = "felt" | "plain";

/** The groups the site sorts its games into, in the order it shows them. */
export const CATEGORIES = [
  {
    id: "solitaire",
    name: "Solitaire",
    description: "Patience games for one player.",
    surface: "felt",
  },
  {
    id: "classics",
    name: "Classics",
    description: "Puzzles and board games beyond cards.",
    surface: "plain",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  surface: Surface;
}[];

/** A category's id, such as "solitaire". */
export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** Describes a group of games the site shows together. */
export interface Category {
  readonly id: CategoryId;
  readonly name: string;
  readonly description: string;
  readonly surface: Surface;
}
