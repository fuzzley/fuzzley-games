// @vitest-environment jsdom
import type { SceneRun } from "@fz/phaser/testing";
import { DEFAULT_DESKTOP_CARD_DECK } from "@/engine/render/deck/card_deck";
import { cardAtlasTextureKey } from "@/engine/render/phaser/deck/card_deck_atlas";
import type { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { TestPresentation } from "../presentation";
import { FakeTableGame } from "./game";
import { runFakeTableBoard } from "./scene";

/** Runs the board of a freshly dealt fake game. */
async function runDealtBoard(): Promise<SceneRun<BoardScene>> {
  const game = new FakeTableGame();
  game.startNewGame();
  return runFakeTableBoard(game, new TestPresentation());
}

describe("runFakeTableBoard", () => {
  let run: SceneRun<BoardScene> | undefined;

  afterEach(() => {
    run?.destroy();
    run = undefined;
  });

  it("loads the chosen deck's atlas from the workspace", async () => {
    run = await runDealtBoard();

    const texture = run.scene.textures.get(run.scene.cardTextureKey);

    expect([run.scene.cardTextureKey, texture.frameTotal > 52]).toEqual([
      cardAtlasTextureKey({ deckId: DEFAULT_DESKTOP_CARD_DECK, artScale: 1 }),
      true,
    ]);
  });

  it("makes a sprite for every card, on a frame of the atlas", async () => {
    run = await runDealtBoard();
    const { scene } = run;

    const frames = [...scene.cardIds].map(
      (cardId) => scene.cardSprite(cardId)?.frame.name,
    );

    expect(frames.every((frame) => frame && frame !== "__BASE")).toBe(true);
  });

  it("says the board is ready once it has drawn its first frame", async () => {
    run = await runDealtBoard();
    const before = run.ready;

    run.advance(16);

    expect([before, run.ready]).toEqual([false, true]);
  });
});
