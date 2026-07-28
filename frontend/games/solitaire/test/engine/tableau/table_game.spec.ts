import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { AppliedMove } from "@/engine/tableau/move";
import {
  MoveEffects,
  ResolvedMove,
  TableGame,
} from "@/engine/tableau/table_game";
import { anyCard, never } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";

/** Events a bare table game has no need of. */
type NoEvents = Record<string, never>;

const LEFT = "left";
const RIGHT = "right";
const LOCKED = "locked";

function zone(id: string, overrides: Partial<ZoneSpec> = {}): ZoneSpec {
  return {
    id,
    role: id,
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
    ...overrides,
  };
}

/**
 * The smallest game the runtime can run: two piles that accept anything, and a
 * third that accepts nothing and gives nothing up.
 *
 * Exercising the runtime through a game this plain keeps these tests about
 * moves, undo and auto-move rather than about Klondike.
 */
class TestGame extends TableGame<NoEvents> {
  /** Effects the next move should report, for the scoring and flip paths. */
  public nextEffects: MoveEffects | null = null;
  public movesSeen: ResolvedMove[] = [];
  public undosSeen: AppliedMove[] = [];

  private readonly cards: CardRegistry;

  constructor(zones: readonly ZoneSpec[] = defaultZones) {
    const registry = new CardRegistry();
    super({ zones: () => zones, registry, autoMoveRoles: [RIGHT, LEFT] });
    this.cards = registry;
  }

  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    this.movesSeen.push(move);
    return this.nextEffects ?? super.applyMoveEffects(move);
  }

  protected override afterUndo(move: AppliedMove): void {
    this.undosSeen.push(move);
  }

  /** Puts a freshly made card into a pile, for building an exact position. */
  public place(pileId: string, rank: Rank, faceUp = true): PlayingCard {
    const card = this.cards.getOrCreate({ suit: Suit.SPADE, rank });
    card.faceUp = faceUp;
    this.requirePile(pileId).addCard(card);
    return card;
  }

  /** Empties the board, exposing `resetPiles` for a test that needs it. */
  public clearAll(): void {
    this.resetPiles();
  }
}

const defaultZones: readonly ZoneSpec[] = [
  zone(LEFT),
  zone(RIGHT),
  zone(LOCKED, { accept: never, grab: { kind: "none" }, draggable: false }),
];

describe("TableGame", () => {
  let game: TestGame;

  beforeEach(() => {
    game = new TestGame();
  });

  describe("the board", () => {
    it("creates one pile per zone", () => {
      expect(game.piles.map((pile) => pile.id)).toEqual([LEFT, RIGHT, LOCKED]);
    });

    it("groups piles by role", () => {
      expect(game.pilesOfRole(LEFT).map((pile) => pile.id)).toEqual([LEFT]);
    });

    it("has no piles for a role no zone declares", () => {
      expect(game.pilesOfRole("nowhere")).toEqual([]);
    });

    it("finds which pile holds a card", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.getPileContainingCard(card.id)?.id).toBe(LEFT);
    });

    it("counts the empty piles of a role, as a supermove rule would", () => {
      game.place(LEFT, Rank.FIVE);

      expect(game.board.emptyCount(RIGHT)).toBe(1);
    });
  });

  describe("moves", () => {
    it("moves a card to a pile that accepts it", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.moveCardToPile(card.id, RIGHT)).toBe(true);
    });

    it("puts the card in the target pile", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.moveCardToPile(card.id, RIGHT);

      expect(game.getPileContainingCard(card.id)?.id).toBe(RIGHT);
    });

    it("carries the cards stacked on top along with it", () => {
      const bottom = game.place(LEFT, Rank.FIVE);
      const top = game.place(LEFT, Rank.SIX);

      game.moveCardToPile(bottom.id, RIGHT);

      expect(game.getPileContainingCard(top.id)?.id).toBe(RIGHT);
    });

    it("counts the move", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.moveCardToPile(card.id, RIGHT);

      expect(game.state.moves).toBe(1);
    });

    it("refuses a pile that accepts nothing", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.moveCardToPile(card.id, LOCKED)).toBe(false);
    });

    it("refuses to take a card from a pile that gives nothing up", () => {
      const card = game.place(LOCKED, Rank.FIVE);

      expect(game.moveCardToPile(card.id, LEFT)).toBe(false);
    });

    it("refuses a face-down card", () => {
      const card = game.place(LEFT, Rank.FIVE, false);

      expect(game.moveCardToPile(card.id, RIGHT)).toBe(false);
    });

    it("refuses a move onto the pile the card already sits in", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.moveCardToPile(card.id, LEFT)).toBe(false);
    });

    it("refuses an unknown target", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.moveCardToPile(card.id, "nowhere")).toBe(false);
    });

    it("refuses to exceed a zone's capacity", () => {
      const small = new TestGame([zone(LEFT), zone(RIGHT, { capacity: 1 })]);
      small.place(RIGHT, Rank.KING);
      const card = small.place(LEFT, Rank.FIVE);

      expect(small.moveCardToPile(card.id, RIGHT)).toBe(false);
    });

    it("refuses a stack larger than the room left in a capped zone", () => {
      const small = new TestGame([zone(LEFT), zone(RIGHT, { capacity: 1 })]);
      const bottom = small.place(LEFT, Rank.FIVE);
      small.place(LEFT, Rank.SIX);

      expect(small.moveCardToPile(bottom.id, RIGHT)).toBe(false);
    });
  });

  describe("move effects", () => {
    it("applies no score and no flip by default, as a game like FreeCell wants", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.moveCardToPile(card.id, RIGHT);

      expect(game.state.score).toBe(0);
    });

    it("hands the resolved move to the game", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.moveCardToPile(card.id, RIGHT);

      expect(game.movesSeen[0].targetPile.id).toBe(RIGHT);
    });
  });

  describe("undo", () => {
    it("reports nothing to take back on a fresh board", () => {
      expect(game.undo()).toBe(false);
    });

    it("knows when there is something to take back", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.moveCardToPile(card.id, RIGHT);

      expect(game.canUndo).toBe(true);
    });

    it("returns the card to the pile it came from", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.moveCardToPile(card.id, RIGHT);

      game.undo();

      expect(game.getPileContainingCard(card.id)?.id).toBe(LEFT);
    });

    it("restores a moved stack in its original order", () => {
      const bottom = game.place(LEFT, Rank.FIVE);
      const top = game.place(LEFT, Rank.SIX);
      game.moveCardToPile(bottom.id, RIGHT);

      game.undo();

      expect(game.getPileById(LEFT)!.getCards()).toEqual([bottom, top]);
    });

    it("takes the move back off the count", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.moveCardToPile(card.id, RIGHT);

      game.undo();

      expect(game.state.moves).toBe(0);
    });

    it("takes back the score the move applied", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.nextEffects = { scoreDelta: 10, flippedCardIds: [] };
      game.moveCardToPile(card.id, RIGHT);
      game.state.score = 10;

      game.undo();

      expect(game.state.score).toBe(0);
    });

    it("turns a card the move flipped back down", () => {
      const buried = game.place(LEFT, Rank.KING, false);
      const card = game.place(LEFT, Rank.FIVE);
      game.nextEffects = { scoreDelta: 0, flippedCardIds: [buried.id] };
      game.moveCardToPile(card.id, RIGHT);
      buried.faceUp = true;

      game.undo();

      expect(buried.faceUp).toBe(false);
    });

    it("publishes the depth so a control can be enabled", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.moveCardToPile(card.id, RIGHT);

      expect(game.state.undoDepth).toBe(1);
    });

    it("tells the game what was taken back", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.moveCardToPile(card.id, RIGHT);

      game.undo();

      expect(game.undosSeen[0].kind).toBe("move");
    });
  });

  describe("autoMoveCard", () => {
    it("tries the roles the game named, best first", () => {
      const card = game.place(LEFT, Rank.FIVE);

      game.autoMoveCard(card.id);

      expect(game.getPileContainingCard(card.id)?.id).toBe(RIGHT);
    });

    it("never moves a card onto the pile it already sits in", () => {
      const onlyLeft = new TestGame([zone(LEFT)]);
      const card = onlyLeft.place(LEFT, Rank.FIVE);

      expect(onlyLeft.autoMoveCard(card.id)).toBe(false);
    });

    it("reports failure when nothing accepts the card", () => {
      const nowhere = new TestGame([
        zone(LEFT),
        zone(RIGHT, { accept: never }),
      ]);
      const card = nowhere.place(LEFT, Rank.FIVE);

      expect(nowhere.autoMoveCard(card.id)).toBe(false);
    });
  });

  describe("interaction", () => {
    it("lets a face-up card in an open pile be picked up", () => {
      const card = game.place(LEFT, Rank.FIVE);

      expect(game.isCardInteractable(card)).toBe(true);
    });

    it("refuses a card in a pile that gives nothing up", () => {
      const card = game.place(LOCKED, Rank.FIVE);

      expect(game.isCardInteractable(card)).toBe(false);
    });

    it("refuses to drag out of a zone that forbids it", () => {
      const card = game.place(LOCKED, Rank.FIVE);

      expect(game.isCardDraggable(card)).toBe(false);
    });

    it("refuses a card that is in no pile at all", () => {
      const orphan = game.place(LEFT, Rank.FIVE);
      game.clearAll();

      expect(game.isCardInteractable(orphan)).toBe(false);
    });
  });
});
