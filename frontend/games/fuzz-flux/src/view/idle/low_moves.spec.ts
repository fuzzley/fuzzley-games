import { FEEL } from "../timeline/feel";
import { lowMovesCue, movesLow } from "./low_moves";

/** The moves left one more than the feel's low count. */
const ABOVE = FEEL.lowMovesLeft + 1;

describe("movesLow", () => {
  it.each([
    [ABOVE, false],
    [FEEL.lowMovesLeft, true],
    [0, true],
  ])("calls %i moves left low: %s", (movesLeft, low) => {
    expect(movesLow(movesLeft, FEEL)).toBe(low);
  });
});

describe("lowMovesCue", () => {
  it("plays the low sound as the board rests after the move that spends the moves down to the feel's count", () => {
    expect(
      lowMovesCue(
        ABOVE,
        { movesLeft: FEEL.lowMovesLeft, card: null },
        900,
        FEEL,
      ),
    ).toEqual({ atMs: 900, sound: "low", cents: 0, volume: 1 });
  });

  it.each([
    ["spends the moves down to one over it", ABOVE + 1, ABOVE],
    [
      "spends one more once they are low",
      FEEL.lowMovesLeft,
      FEEL.lowMovesLeft - 1,
    ],
    ["spends none, as a swap refused", FEEL.lowMovesLeft, FEEL.lowMovesLeft],
  ])("plays nothing after a move that %s", (_, before, after) => {
    expect(
      lowMovesCue(before, { movesLeft: after, card: null }, 900, FEEL),
    ).toBeNull();
  });

  it("plays nothing after a move that clears the level with that many to spare", () => {
    expect(
      lowMovesCue(
        ABOVE,
        {
          movesLeft: FEEL.lowMovesLeft,
          card: { what: "cleared", stars: 3, spare: FEEL.lowMovesLeft },
        },
        900,
        FEEL,
      ),
    ).toBeNull();
  });
});
