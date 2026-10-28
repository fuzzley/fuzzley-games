// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  type SceneRun,
  type SceneRunOptions,
  runScene,
} from "@fz/phaser/testing";
import { deckCardIds } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { DEFAULT_DESKTOP_CARD_DECK } from "@/engine/render/deck/card_deck";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import { designSize } from "@/engine/render/layout/table_layout";
import { measureTable } from "@/engine/render/layout/table_metrics";
import type { BoardScene } from "@/engine/render/phaser/scene/board_scene";
import { cardAtlasTextureKey } from "@/engine/render/phaser/deck/card_deck_atlas";
import { DragController } from "@/engine/render/input/drag_controller";
import { makeTableBoardScene } from "@/engine/board/table_board_scene";
import { NO_INSETS } from "@/engine/render/layout/viewport";
import {
  type BoardLayouts,
  mirrorTable,
} from "@/engine/render/layout/board_layouts";
import {
  FAKE_TABLE_LAYOUT,
  fakeTableGestures,
} from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import { relocate } from "@test/support/game_scenarios";
import { TestPresentation } from "@test/support/presentation";
import { loadAtlases } from "@test/support/atlas_scene";
import { serveWorkspace } from "@test/support/workspace_files";
import {
  type CanvasPoint,
  anyBorderDrawn,
  cardSpriteOf,
  click,
  dragTo,
  hoverAt,
  middleOf,
  pickUp,
} from "@test/support/board_run";

/** One suit of thirteen cards: fewer than a standard deck holds. */
const ONE_SUIT = deckCardIds({
  suits: [Suit.SPADE],
  ranks: ALL_RANKS,
  copies: 1,
});

/**
 * Runs the board `makeTableBoardScene` builds over a game, with the fake
 * board's gestures and, unless given others, its grid, in real Phaser: on a
 * canvas of the grid's design size unless the options say otherwise.
 */
async function runBoard(
  game: FakeTableGame,
  presentation: TestPresentation,
  layouts: BoardLayouts = { roomy: FAKE_TABLE_LAYOUT },
  options: SceneRunOptions = {},
): Promise<SceneRun<BoardScene>> {
  return runScene(
    ({ insets, ready }) =>
      makeTableBoardScene({
        game,
        layouts,
        handleIntent: fakeTableGestures(game),
        presentation,
        onReady: ready,
        insets,
      }),
    { ...designSize(FAKE_TABLE_LAYOUT), serve: serveWorkspace, ...options },
  );
}

describe("makeTableBoardScene", () => {
  let game: FakeTableGame;
  let presentation: TestPresentation;
  let run: SceneRun<BoardScene>;

  /**
   * Runs a board over the given game, the fake board's grid and its gestures —
   * the three things a real game supplies.
   */
  async function drawBoard(gameModel: FakeTableGame): Promise<void> {
    game = gameModel;
    presentation = new TestPresentation("card-back-red");
    run = await runBoard(game, presentation);
  }

  /** Returns a dealt game over the given deck, a standard 52 by default. */
  function dealtGame(cardIds?: typeof ONE_SUIT): FakeTableGame {
    const dealt = new FakeTableGame(cardIds);
    dealt.startNewGame();
    return dealt;
  }

  /** Returns a card's sprite. */
  function cardSprite(cardId: string): ReturnType<typeof cardSpriteOf> {
    return cardSpriteOf(run.scene, cardId);
  }

  beforeEach(async () => {
    await drawBoard(dealtGame());
  });

  afterEach(() => {
    run.destroy();
    vi.restoreAllMocks();
  });

  describe("the game it draws", () => {
    it("draws a placeholder under each pile whose zone declares one", () => {
      const withPlaceholder = game.piles
        .filter((pile) => run.scene.pileBackgroundSprite(pile.id))
        .map((pile) => pile.id);

      expect(withPlaceholder).toEqual(
        game.piles
          .filter((pile) => game.zoneFor(pile.id)?.backgroundKey)
          .map((pile) => pile.id),
      );
    });

    it("makes a sprite for every card the game holds, and no others", async () => {
      run.destroy();

      await drawBoard(dealtGame(ONE_SUIT));

      // Read from the game rather than from a deck specification, so a variant
      // dealing a shorter deck does not get sprites for cards it never deals.
      expect([...run.scene.cardIds]).toEqual(
        ONE_SUIT.map((cardId) => playingCardInstanceId(cardId)),
      );
    });

    it("picks up the cards that travel with a grabbed one", () => {
      const lower = relocate(game, "card-spades-9", game.tableaus[0]);
      const upper = relocate(game, "card-hearts-8", game.tableaus[0]);
      run.advance(16);
      const grabbed = cardSprite(lower.id);

      // By its top edge, which the card fanned over it leaves showing.
      pickUp(run, grabbed, { x: middleOf(grabbed).x, y: grabbed.y + 10 });
      run.advance(16);

      const held = depthFor(RenderLayer.HELD_CARD);
      expect(
        [lower, upper].map((card) => cardSprite(card.id).depth >= held),
      ).toEqual([true, true]);
    });
  });

  describe("the grid it was given", () => {
    it("lays the board out at that grid's design size", () => {
      const built = makeTableBoardScene({
        game,
        layouts: { roomy: FAKE_TABLE_LAYOUT },
        handleIntent: fakeTableGestures(game),
        presentation,
      });

      // A board not yet in a game has no canvas to measure, so it falls back
      // to the design size of whichever layout it was built with.
      const design = designSize(FAKE_TABLE_LAYOUT);
      expect([built.viewport.width, built.viewport.height]).toEqual([
        design.width,
        design.height,
      ]);
    });

    it("lays the board out below the inset the shell reports", () => {
      const inset = makeTableBoardScene({
        game,
        layouts: { roomy: FAKE_TABLE_LAYOUT },
        handleIntent: fakeTableGestures(game),
        presentation,
        insets: () => ({ ...NO_INSETS, top: 40 }),
      });

      // The unmeasured canvas falls back to the design size plus the inset,
      // so the board below it still lays out at a scale of 1.
      expect([
        inset.viewport.insets?.top,
        inset.viewport.height,
        measureTable(FAKE_TABLE_LAYOUT, inset.viewport).scale,
      ]).toEqual([40, designSize(FAKE_TABLE_LAYOUT).height + 40, 1]);
    });

    it("lands a released stack on the pile under it on that grid", () => {
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);
      const foundation = game.foundations[0];
      const origin = measureTable(
        FAKE_TABLE_LAYOUT,
        run.scene.viewport,
      ).origins.get(foundation.id)!;
      run.advance(16);

      dragTo(run, cardSprite(ace.id), origin);

      expect(game.getPileContainingCard(ace.id)).toBe(foundation);
    });
  });

  describe("the gestures it was given", () => {
    it("carries them out", () => {
      const top = game.stock.topCard!;
      run.advance(16);

      click(run, cardSprite(top.id));

      // Pressing the top of the stock is what draws on the fake board.
      expect(game.waste.size).toBe(3);
    });
  });

  describe("the presentation it was given", () => {
    it("draws new cards on the back the player chose", () => {
      const card = game.stock.topCard!;

      expect(cardSprite(card.id).frame.name).toBe("card-back-red");
    });

    it("repaints the table when the colour setting changes", () => {
      presentation.setBackgroundColor("#123456");

      expect(run.scene.cameras.main.backgroundColor.color).toBe(0x123456);
    });

    it("says which deck it is drawing", () => {
      expect(presentation.cardDeckStatuses).toEqual([
        { kind: "drawn", deckId: DEFAULT_DESKTOP_CARD_DECK },
      ]);
    });

    it("redraws from the deck the player switches to", async () => {
      const classic = { deckId: "classic", artScale: 1 } as const;
      await loadAtlases(run.game, [classic]);

      presentation.setCardDeck("classic");

      const card = game.stock.topCard!;
      expect(cardSprite(card.id).texture.key).toBe(
        cardAtlasTextureKey(classic),
      );
    });
  });

  describe("following the game", () => {
    it("drops stale interaction state when the game deals again", () => {
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      run.advance(16);
      // Over the ace's foot, below the card it lies on, so the new deal
      // leaves bare table under the pointer.
      const bounds = cardSprite(ace.id).getBounds();
      hoverAt(run, { x: bounds.centerX, y: bounds.bottom - 10 });
      run.advance(16);

      game.startNewGame();
      run.advance(16);

      // A highlight left over from the previous deal would be drawn around
      // whichever card has landed under it.
      expect(anyBorderDrawn(run.scene)).toBe(false);
    });

    it("stops following the game once the scene shuts down", () => {
      run.game.scene.stop(run.scene.key);
      const resets = vi.spyOn(DragController.prototype, "reset");
      const flights = vi.spyOn(DragController.prototype, "beginFlight");

      game.startNewGame();
      fakeTableGestures(game)({
        kind: "activate",
        cardId: game.stock.topCard!.id,
      });

      // A new deal and a draw would each still reach the ended scene's
      // controller through a subscription it left behind.
      expect([resets.mock.calls.length, flights.mock.calls.length]).toEqual([
        0, 0,
      ]);
    });

    it("lifts the cards an action relocates over the board", () => {
      run.advance(16);
      const top = game.stock.topCard!;

      click(run, cardSprite(top.id));
      run.advance(16);

      // A draw moves cards without any gesture reporting which, so only the
      // model can say they are crossing the board.
      const drawn = game.waste.getCards().map((card) => cardSprite(card.id));
      const restingDepth = Math.max(
        ...game.tableaus.flatMap((pile) =>
          pile.getCards().map((card) => cardSprite(card.id).depth),
        ),
      );
      expect(drawn.map((sprite) => sprite.depth > restingDepth)).toEqual([
        true,
        true,
        true,
      ]);
    });
  });

  describe("readiness", () => {
    it("reports ready once the first frame has been drawn", () => {
      run.advance(16);

      expect(run.ready).toBe(true);
    });

    it("stays silent until then", () => {
      // Announcing early would let the shell reveal a canvas with nothing on
      // it yet.
      expect(run.ready).toBe(false);
    });
  });
});

describe("makeTableBoardScene on a game with arranged grids", () => {
  /**
   * The fake board with its foundations moved down a row, so a stack dropped
   * where the roomy grid puts them misses.
   */
  const PHONE_GRID = {
    ...FAKE_TABLE_LAYOUT,
    rows: 3,
    slots: FAKE_TABLE_LAYOUT.slots.map((slot) =>
      slot.pileId.startsWith("foundation") ? { ...slot, row: 2 } : slot,
    ),
  };

  /** The fake board's columns, left to right. */
  const COLUMNS = PHONE_GRID.slots
    .map((slot) => slot.pileId)
    .filter((pileId) => pileId.startsWith("tableau"));

  /** A phone held upright: its screen in CSS pixels, and its pixel ratio. */
  const PHONE = { width: 390, height: 844, pixelRatio: 3 };

  let game: FakeTableGame;
  let presentation: TestPresentation;
  let run: SceneRun<BoardScene>;

  beforeEach(async () => {
    game = new FakeTableGame();
    game.startNewGame();
    presentation = new TestPresentation();
    run = await runBoard(
      game,
      presentation,
      {
        roomy: FAKE_TABLE_LAYOUT,
        arranged: {
          roomy: { top: FAKE_TABLE_LAYOUT, bottom: FAKE_TABLE_LAYOUT },
          portrait: { top: PHONE_GRID, bottom: PHONE_GRID },
          landscape: { top: PHONE_GRID, bottom: PHONE_GRID },
          columns: COLUMNS,
          side: game.stock.id,
        },
      },
      {
        width: PHONE.width * PHONE.pixelRatio,
        height: PHONE.height * PHONE.pixelRatio,
        config: { zoom: 1 / PHONE.pixelRatio },
      },
    );
  });

  afterEach(() => {
    run.destroy();
  });

  /**
   * Drags the ace of spades from a column so its corner lies at a point, and
   * lets go.
   */
  function dropAceAt(point: CanvasPoint): ReturnType<typeof relocate> {
    const ace = relocate(game, "card-spades-ace", game.tableaus[0]);
    run.advance(16);
    dragTo(run, cardSpriteOf(run.scene, ace.id), point);
    return ace;
  }

  it("lays the board out on its phone grid on a phone", () => {
    presentation.setBoardArrangement({ piles: "auto", stockSide: "left" });
    const foundation = game.foundations[0];
    const origin = measureTable(PHONE_GRID, run.scene.viewport).origins.get(
      foundation.id,
    )!;

    const ace = dropAceAt(origin);

    expect(game.getPileContainingCard(ace.id)).toBe(foundation);
  });

  it("mirrors its phone grid to put the stock at the right", () => {
    presentation.setBoardArrangement({ piles: "auto", stockSide: "right" });
    const foundation = game.foundations[0];
    const origin = measureTable(
      mirrorTable(PHONE_GRID, COLUMNS),
      run.scene.viewport,
    ).origins.get(foundation.id)!;

    const ace = dropAceAt(origin);

    expect(game.getPileContainingCard(ace.id)).toBe(foundation);
  });
});
