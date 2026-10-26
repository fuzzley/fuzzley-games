import { type Field, minesLeft, revealedCount } from "./field";
import { count } from "./format";

/**
 * Names what a square looks like: once a game is lost, the mines it hid show,
 * and so do the flags that were wrong.
 */
export type Showing =
  "hidden" | "flagged" | "blank" | "number" | "tripped" | "mine" | "wrong-flag";

/** Returns what a square looks like. */
export function showing(field: Field, index: number): Showing {
  const square = field.squares[index];
  const mine = field.layout?.mines[index] ?? false;
  const lost = field.outcome === "lost";
  switch (square) {
    case "flagged":
      return lost && !mine ? "wrong-flag" : "flagged";
    case "tripped":
      return "tripped";
    case "revealed":
      return field.layout?.counts[index] ? "number" : "blank";
    default:
      return lost && mine ? "mine" : "hidden";
  }
}

/** Returns what a screen reader calls a square. */
export function describeSquare(field: Field, index: number): string {
  switch (showing(field, index)) {
    case "hidden":
      return "Hidden";
    case "flagged":
      return "Flagged";
    case "blank":
      return "Blank";
    case "number":
      return String(field.layout?.counts[index] ?? 0);
    case "tripped":
      return "Mine, stepped on";
    case "mine":
      return "Mine";
    case "wrong-flag":
      return "Flagged, no mine";
  }
}

/** Returns what a move did, for the screen reader to say; empty if nothing. */
export function describeMove(before: Field, after: Field): string {
  if (before === after) return "";
  if (after.outcome === "lost") return "Mine. Out of lives.";
  if (after.outcome === "won") return "Field cleared.";
  const parts: string[] = [];
  if (after.livesLeft < before.livesLeft) {
    parts.push(`Mine. ${count(after.livesLeft, "life", "lives")} left.`);
  }
  const revealed = revealedCount(after) - revealedCount(before);
  if (revealed === 1) {
    const index = after.squares.findIndex(
      (square, i) => square === "revealed" && before.squares[i] !== "revealed",
    );
    parts.push(`Revealed: ${describeSquare(after, index).toLowerCase()}.`);
  } else if (revealed > 1) {
    parts.push(`Revealed ${count(revealed, "square", "squares")}.`);
  }
  const flagsBefore = before.squares.filter((s) => s === "flagged").length;
  const flagsAfter = after.squares.filter((s) => s === "flagged").length;
  if (flagsAfter !== flagsBefore) {
    const left = count(minesLeft(after), "mine", "mines");
    parts.push(
      `${flagsAfter > flagsBefore ? "Flagged" : "Unflagged"}. ${left} left.`,
    );
  }
  return parts.join(" ");
}
