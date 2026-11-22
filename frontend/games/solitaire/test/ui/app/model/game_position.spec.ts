import { describe, it, expect } from "vitest";
import { packState, unpackState } from "@fz/game-ui/bug_report";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import {
  POSITION_TAG,
  readGamePosition,
  type GamePosition,
} from "@/ui/app/model/game_position";

/** Returns the position of a Klondike game dealt and drawn from once. */
function position(): GamePosition {
  const game = new KlondikeGame();
  game.startNewGame();
  game.drawCardsFromStock();
  return {
    gameId: "klondike",
    options: { drawCount: 3 },
    snapshot: game.snapshot(),
  };
}

/** A Klondike game by Draw 1, the ace of hearts drawn from the stock. */
const DRAWN: GamePosition = {
  gameId: "klondike",
  options: { drawCount: 1 },
  snapshot: {
    piles: [
      { id: "stock", cards: [{ id: "spades-king", faceUp: false }] },
      { id: "waste", cards: [{ id: "hearts-ace", faceUp: true }] },
    ],
    score: 5,
    history: [
      {
        kind: "draw",
        transfers: [
          {
            cardIds: ["hearts-ace"],
            fromPileId: "stock",
            toPileId: "waste",
            faceUpBefore: false,
          },
        ],
        scoreDelta: 5,
        flippedCardIds: ["hearts-ace"],
      },
    ],
    deal: ["spades-king", "hearts-ace"],
  },
};

/**
 * {@link DRAWN} as the Solitaire Collection packed it before every game's
 * reports were shared, with its own codec.
 */
const FILED =
  "fs1.H4sIAAAAAAAAA22QsW7DMAxE_-VmZcjQRWOTJVuXToUHwqJiwYokiAyCwvC_F7KdwkG7HvnujpxwpRtfHCzGmJMLI8MgFw05CewEV-lxyveksMfZQBIVGbK2UQmRBfZrQmi8aO5HGPRU3V4u5FgOY0hXGHjq-bPAeorCczebbetBovwXHpiqyoF63rFa7w3tDKTPlWHfDIYgmuv3Qo4hNbY1h4FWSuK5rq7N_7Ik7L07A1_z7SPE9RXPUzT_Ss-Ca4l39kvydsbW5MxRaanjYyiF3en_tAY4ptj01_e8bM0_5pBSFp0BAAA";

describe("a reported game's position", () => {
  it("reads back as it was packed", async () => {
    const original = position();

    const read = readGamePosition(
      await unpackState(POSITION_TAG, await packState(POSITION_TAG, original)),
    );

    expect(read).toEqual(original);
  });

  it("reads back from a report filed before the reports were shared", async () => {
    const read = readGamePosition(await unpackState(POSITION_TAG, FILED));

    expect(read).toEqual(DRAWN);
  });

  it("refuses a position that names no game", () => {
    expect(() => readGamePosition({})).toThrow(/position\.gameId is not text/);
  });

  it("refuses a position whose snapshot is malformed", () => {
    const malformed = { ...position(), snapshot: { score: "high" } };

    expect(() => readGamePosition(malformed)).toThrow(
      /position\.snapshot\.piles is not a list/,
    );
  });
});
