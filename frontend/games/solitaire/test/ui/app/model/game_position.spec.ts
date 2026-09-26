import { describe, it, expect } from "vitest";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import {
  decodePosition,
  encodePosition,
  readGamePosition,
  type GamePosition,
} from "@/ui/app/model/game_position";

/** A Klondike game dealt and drawn from once. */
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

/** `not json`, gzipped and encoded as game state. */
const NOT_JSON = "fs1.H4sIAAAAAAAACsvLL1HIKs7PAwBmy4zGCAAAAA";

describe("game position encoding", () => {
  it("decodes what it encodes", async () => {
    const original = position();

    const decoded = await decodePosition(await encodePosition(original));

    expect(decoded).toEqual(original);
  });

  it("encodes to text that is safe in a URL", async () => {
    const encoded = await encodePosition(position());

    expect(encoded).toMatch(/^fs1\.[A-Za-z0-9_-]+$/);
  });

  it("finds the game state within the text around it", async () => {
    const original = position();
    const field = `Score 0\n\n\`\`\`\n${await encodePosition(original)}\n\`\`\``;

    const decoded = await decodePosition(field);

    expect(decoded).toEqual(original);
  });

  it("reads back a position written out as JSON", () => {
    const original = position();

    const read = readGamePosition(JSON.parse(JSON.stringify(original)));

    expect(read).toEqual(original);
  });

  it("rejects text with no game state in it", async () => {
    await expect(decodePosition("Score 0")).rejects.toThrow(/no game state/);
  });

  it("rejects game state that is not gzipped", async () => {
    await expect(decodePosition("fs1.AAAA")).rejects.toThrow(/corrupt/);
  });

  it("rejects game state that is not JSON", async () => {
    await expect(decodePosition(NOT_JSON)).rejects.toThrow(/corrupt/);
  });

  it("rejects game state that unpacks past the limit", async () => {
    const encoded = await encodePosition(position());

    await expect(decodePosition(encoded, 100)).rejects.toThrow(
      /over 100 bytes/,
    );
  });

  it("rejects game state that names no game", async () => {
    const encoded = await encodePosition({} as unknown as GamePosition);

    await expect(decodePosition(encoded)).rejects.toThrow(
      /position\.gameId is not text/,
    );
  });

  it("rejects game state whose snapshot is malformed", async () => {
    const malformed = { ...position(), snapshot: { score: "high" } };
    const encoded = await encodePosition(malformed as unknown as GamePosition);

    await expect(decodePosition(encoded)).rejects.toThrow(
      /position\.snapshot\.piles is not a list/,
    );
  });
});
