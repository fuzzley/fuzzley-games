import {
  type Field,
  type Outcome,
  type Square,
  layoutOf,
} from "../rules/field";

/**
 * The letters a picture of a field is drawn in, a row a string:
 *
 *     .  hidden            *  hidden mine
 *     f  flagged, no mine  F  flagged mine
 *     _  revealed blank    1 to 8  revealed number
 *     x  mine stepped on
 */
const MINES = new Set(["*", "F", "x"]);

/** Says how a picture's game stands, where the picture alone doesn't. */
export interface PictureOptions {
  readonly lives?: number;
  readonly livesLeft?: number;
  readonly outcome?: Outcome;
}

/**
 * Returns a field, its mines placed, drawn as a picture. A number drawn must
 * be the count around it, so a picture can't lie about its own field.
 *
 * Unless given, the lives are 3 less one a mine stepped on, and the game is
 * lost with none left, won with every safe square revealed, and in play
 * otherwise.
 */
export function fieldFrom(
  picture: readonly string[],
  options: PictureOptions = {},
): Field {
  const rows = picture.length;
  const cols = picture[0]?.length ?? 0;
  if (picture.some((row) => row.length !== cols)) {
    throw new Error("Every row of a picture is as long as the first.");
  }
  const letters = picture.join("").split("");
  const mines = letters.map((letter) => MINES.has(letter));
  const size = { rows, cols, mines: mines.filter(Boolean).length };
  const layout = layoutOf(size, mines);
  const squares = letters.map((letter, i): Square => {
    if (/[1-8]/.test(letter) && Number(letter) !== layout.counts[i]) {
      throw new Error(
        `The ${letter} at square ${i} has ${layout.counts[i]} mines around it.`,
      );
    }
    if (letter === "f" || letter === "F") return "flagged";
    if (letter === "x") return "tripped";
    if (letter === "_" || /[1-8]/.test(letter)) return "revealed";
    return "hidden";
  });
  const lives = options.lives ?? 3;
  const tripped = squares.filter((s) => s === "tripped").length;
  const livesLeft = options.livesLeft ?? Math.max(0, lives - tripped);
  const revealed = squares.filter((s) => s === "revealed").length;
  const outcome =
    options.outcome ??
    (livesLeft === 0
      ? "lost"
      : revealed === squares.length - size.mines
        ? "won"
        : "playing");
  return { size, seed: 0, layout, squares, lives, livesLeft, outcome };
}

/** Returns a field drawn as a picture, in `fieldFrom`'s letters. */
export function pictureOf(field: Field): string[] {
  const letters = field.squares.map((square, i) => {
    const mine = field.layout?.mines[i] ?? false;
    switch (square) {
      case "hidden":
        return mine ? "*" : ".";
      case "flagged":
        return mine ? "F" : "f";
      case "tripped":
        return "x";
      case "revealed": {
        const count = field.layout?.counts[i] ?? 0;
        return count === 0 ? "_" : String(count);
      }
    }
  });
  const rows: string[] = [];
  for (let row = 0; row < field.size.rows; row++) {
    const start = row * field.size.cols;
    rows.push(letters.slice(start, start + field.size.cols).join(""));
  }
  return rows;
}
