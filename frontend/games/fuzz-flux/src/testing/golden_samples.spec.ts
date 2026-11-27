import { isOneOf, itemAt } from "@fz/core/records";
import type { Board, Game } from "../rules/board/board";
import { BRICK_LAYERS } from "../rules/catalog/elements";
import { KIND_IDS } from "../rules/catalog/kinds";
import type { Piece } from "../rules/catalog/pieces";
import { SPECIAL_IDS } from "../rules/catalog/specials";
import {
  digestOf,
  type GoldenGame,
  type GoldenSample,
  goldenSet,
  writtenOut,
} from "./golden";
import { GOLDEN_SAMPLES } from "./golden_samples";

/** Each golden set a sample was played in, by its id, its file read once. */
const GOLDEN_SETS = new Map(
  GOLDEN_SAMPLES.map(
    ({ playedIn: { set } }): [string, readonly GoldenGame[]] => [
      set,
      goldenSet(set),
    ],
  ),
);

/** What a fuzzball may wear beyond its kind, in a square's words. */
const WEARING = ["caged", "burred", ...SPECIAL_IDS] as const;

/**
 * Returns a sample's game, its board read from the game's words, its pieces
 * numbered from 1 in the order read, throwing for rows of unlike widths or
 * dust not a layer a square.
 */
function gameOf({ game, board, dust, beds }: GoldenSample): Game {
  const rows = board.map((row) => row.split(" "));
  const squares = rows.flat();
  const width = rows[0]?.length ?? 0;
  if (
    rows.some((row) => row.length !== width) ||
    dust.length !== squares.length
  ) {
    throw new Error("A sample's board is a square a word, a row a string.");
  }
  const read: Board = {
    width,
    height: rows.length,
    open: squares.map((words) => words !== "gap"),
    pieces: squares.map((words, square) =>
      words === "gap" ? null : pieceOf(words, square + 1),
    ),
    dust,
    beds: squares.map((_, square) => beds.includes(square)),
  };
  return { ...game, board: read };
}

/** Returns the piece a square's words name, numbered as given, or null for an empty square, throwing for words that name none. */
function pieceOf(words: string, id: number): Piece | null {
  const [what = "", ...wearing] = words.split("+");
  const layers = Number(wearing.join("+"));
  if (what === "empty" && wearing.length === 0) {
    return null;
  }
  if ((what === "frizzball" || what === "sleepyhead") && wearing.length === 0) {
    return { what, id };
  }
  if (what === "brick" && isOneOf(layers, BRICK_LAYERS)) {
    return { what, id, layers };
  }
  const specials = SPECIAL_IDS.filter((special) => wearing.includes(special));
  if (
    !isOneOf(what, KIND_IDS) ||
    !wearing.every((word) => isOneOf(word, WEARING)) ||
    new Set(wearing).size !== wearing.length ||
    specials.length > 1
  ) {
    throw new Error(`No piece is "${words}".`);
  }
  return {
    what: "fuzzball",
    id,
    kind: what,
    special: specials[0] ?? null,
    caged: wearing.includes("caged"),
    burred: wearing.includes("burred"),
  };
}

/** Returns the digest a sample's golden game holds for it, as its set's file has it. */
function goldenDigestOf({ playedIn }: GoldenSample): string {
  const games = GOLDEN_SETS.get(playedIn.set);
  if (games === undefined) {
    throw new Error(`No golden set is "${playedIn.set}".`);
  }
  return itemAt(itemAt(games, playedIn.game).digests, playedIn.move);
}

/** Each sample, by where it was played. */
const SAMPLES = GOLDEN_SAMPLES.map(
  (sample) =>
    [
      `${sample.playedIn.set}'s game ${String(sample.playedIn.game)}, move ${String(sample.playedIn.move)}`,
      sample,
    ] as const,
);

describe("the golden games' samples", () => {
  it.each(SAMPLES)("%s is written out as the sketch writes it", (_, sample) => {
    const text = writtenOut(gameOf(sample), sample.record);

    expect(text).toBe(sample.writtenOut.join("\n"));
  });

  it.each(SAMPLES)(
    "%s's text is the digest its golden game holds",
    (_, sample) => {
      const digest = digestOf(sample.writtenOut.join("\n"));

      expect(digest).toBe(goldenDigestOf(sample));
    },
  );
});
