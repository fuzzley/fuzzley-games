import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/moves/move";
import { PileMarker } from "@/engine/tableau/zones/pile_marker";
import { TableGame } from "@/engine/tableau/table_game";
import { anyCard, never } from "@/engine/tableau/rules/placement";
import { ZoneSpec } from "@/engine/tableau/zones/zone";

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
 * Plays the smallest game the runtime can run: two piles that accept anything,
 * and a third that accepts nothing and gives nothing up.
 */
class TestGame extends TableGame {
  /** Effects the next move should report, for the scoring and flip paths. */
  public nextEffects: MoveEffects | null = null;
  public movesSeen: ResolvedMove[] = [];

  private readonly cards: CardRegistry;

  constructor(zones: readonly ZoneSpec[] = defaultZones) {
    const registry = new CardRegistry();
    super({ zones: zones, registry, autoMoveRoles: [RIGHT, LEFT] });
    this.cards = registry;
  }

  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    this.movesSeen.push(move);
    return this.nextEffects ?? super.applyMoveEffects(move);
  }

  /** Puts a freshly made card into a pile, for building an exact position. */
  public place(pileId: string, rank: Rank, faceUp = true): PlayingCard {
    const card = this.cards.getOrCreate({ suit: Suit.SPADE, rank });
    this.tabletop.place(card, this.requirePile(pileId), faceUp);
    return card;
  }

  /**
   * Moves a whole pile onto another from the top down, the way a stock draw
   * does, so the run arrives turned over.
   *
   * Its action is named nothing a game uses, since which way round a run lands
   * must not be read off the name.
   */
  public turnOver(fromPileId: string, toPileId: string): void {
    const from = this.requirePile(fromPileId);
    const to = this.requirePile(toPileId);
    this.commitAction("turn-over", [
      this.tabletop.relocate([...from.getCards()].reverse(), to),
    ]);
  }

  /** Marks a pile's slot, exposing `markPile`. */
  public mark(pileId: string, marker: () => PileMarker): void {
    this.markPile(this.requirePile(pileId), marker);
  }

  /** How many turn-overs the history holds, exposing `timesApplied`. */
  public get turnOvers(): number {
    return this.timesApplied("turn-over");
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

    it("applies the score change the game reports", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.nextEffects = { scoreDelta: 10, flippedCardIds: [] };

      game.moveCardToPile(card.id, RIGHT);

      expect(game.state.score).toBe(10);
    });

    it("announces the metrics once per move, all of them in step", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.nextEffects = { scoreDelta: 10, flippedCardIds: [] };
      const published: unknown[] = [];
      game.state.onChange((metrics) => published.push(metrics));

      game.moveCardToPile(card.id, RIGHT);

      expect(published).toEqual([
        { score: 0, moves: 0, undoDepth: 0 },
        { score: 10, moves: 1, undoDepth: 1 },
      ]);
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

    it("counts each action of a kind it holds", () => {
      game.place(LEFT, Rank.FIVE);
      game.turnOver(LEFT, RIGHT);
      game.turnOver(RIGHT, LEFT);

      expect(game.turnOvers).toBe(2);
    });

    it("stops counting an action once undo takes it back", () => {
      game.place(LEFT, Rank.FIVE);
      game.turnOver(LEFT, RIGHT);
      game.turnOver(RIGHT, LEFT);

      game.undo();

      expect(game.turnOvers).toBe(1);
    });
  });

  describe("cards-relocated", () => {
    /**
     * Starts following the cards each action relocates, returning the list the
     * announcements are appended to.
     */
    function announcements(): readonly string[][] {
      const announced: string[][] = [];
      game.onCardsRelocated((cardIds) => announced.push([...cardIds]));
      return announced;
    }

    it("announces the card a move relocated", () => {
      const card = game.place(LEFT, Rank.FIVE);
      const announced = announcements();

      game.moveCardToPile(card.id, RIGHT);

      expect(announced).toEqual([[card.id]]);
    });

    it("announces the whole stack the move took with it", () => {
      const lower = game.place(LEFT, Rank.FIVE);
      const upper = game.place(LEFT, Rank.FOUR);
      const announced = announcements();

      game.moveCardToPile(lower.id, RIGHT);

      expect(announced).toEqual([[lower.id, upper.id]]);
    });

    it("announces the same cards when the move is taken back", () => {
      const card = game.place(LEFT, Rank.FIVE);
      game.moveCardToPile(card.id, RIGHT);
      const announced = announcements();

      game.undo();

      // Undo relocates the same cards the other way, and they have the same
      // board to cross getting home as they had going.
      expect(announced).toEqual([[card.id]]);
    });

    it("announces nothing when the rules refuse the move", () => {
      const card = game.place(LEFT, Rank.FIVE);
      const announced = announcements();

      game.moveCardToPile(card.id, LOCKED);

      expect(announced).toEqual([]);
    });

    it("announces nothing when there is no move to take back", () => {
      const announced = announcements();

      game.undo();

      expect(announced).toEqual([]);
    });

    it("announces nothing for cards dealt straight onto the board", () => {
      const announced = announcements();

      game.place(LEFT, Rank.FIVE);

      // A deal puts every card where it belongs at once; nothing has a board to
      // cross, and a flight per dealt card would be nonsense.
      expect(announced).toEqual([]);
    });

    it("stops announcing to a listener that has let go", () => {
      const card = game.place(LEFT, Rank.FIVE);
      const announced: string[][] = [];
      const stop = game.onCardsRelocated((ids) => announced.push([...ids]));

      stop();
      game.moveCardToPile(card.id, RIGHT);

      expect(announced).toEqual([]);
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

  describe("placeholders", () => {
    const PRESSABLE = "pressable";
    const PRESSABLE_ARTWORK = "card-placeholder-full-border-reset";

    /** Returns a game with one slot that is pressable while empty. */
    function gameWithPressableSlot(): TestGame {
      return new TestGame([
        ...defaultZones,
        zone(PRESSABLE, {
          backgroundKey: PRESSABLE_ARTWORK,
          emptyIsActionable: true,
        }),
      ]);
    }

    it("shows the artwork the zone declares", () => {
      const pressable = gameWithPressableSlot();

      const artwork = pressable.pileBackgroundKey(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(artwork).toBe(PRESSABLE_ARTWORK);
    });

    it("shows no artwork for a pile over bare table", () => {
      const artwork = game.pileBackgroundKey(game.getPileById(LEFT)!);

      expect(artwork).toBeUndefined();
    });

    it("treats an empty slot its zone marks actionable as pressable", () => {
      const pressable = gameWithPressableSlot();

      const actionable = pressable.isEmptySlotActionable(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(actionable).toBe(true);
    });

    it("does not treat that slot as pressable while it holds cards", () => {
      const pressable = gameWithPressableSlot();
      pressable.place(PRESSABLE, Rank.FIVE);

      const actionable = pressable.isEmptySlotActionable(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(actionable).toBe(false);
    });

    it("does not treat an empty slot as pressable unless its zone says so", () => {
      const actionable = game.isEmptySlotActionable(game.getPileById(LEFT)!);

      expect(actionable).toBe(false);
    });

    it("shows a marked pile's artwork in place of its zone's", () => {
      const pressable = gameWithPressableSlot();
      pressable.mark(PRESSABLE, () => ({
        artwork: "marked",
        actionable: true,
      }));

      const artwork = pressable.pileBackgroundKey(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(artwork).toBe("marked");
    });

    it("lets a marker say an empty slot does nothing, whatever its zone says", () => {
      const pressable = gameWithPressableSlot();
      pressable.mark(PRESSABLE, () => ({
        artwork: "spent",
        actionable: false,
      }));

      const actionable = pressable.isEmptySlotActionable(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(actionable).toBe(false);
    });

    it("asks a marker afresh each time, so the slot follows the game", () => {
      const pressable = gameWithPressableSlot();
      let spent = false;
      pressable.mark(PRESSABLE, () => ({
        artwork: spent ? "spent" : "fresh",
        actionable: !spent,
      }));

      spent = true;

      expect(
        pressable.pileBackgroundKey(pressable.getPileById(PRESSABLE)!),
      ).toBe("spent");
    });

    it("never treats a marked slot as pressable while it holds cards", () => {
      const pressable = gameWithPressableSlot();
      pressable.mark(PRESSABLE, () => ({
        artwork: "marked",
        actionable: true,
      }));
      pressable.place(PRESSABLE, Rank.FIVE);

      const actionable = pressable.isEmptySlotActionable(
        pressable.getPileById(PRESSABLE)!,
      );

      expect(actionable).toBe(false);
    });
  });

  describe("actions outside the move path", () => {
    it("counts one as a move", () => {
      game.place(LEFT, Rank.TWO);

      game.turnOver(LEFT, RIGHT);

      expect(game.state.moves).toBe(1);
    });

    it("makes one available to undo", () => {
      game.place(LEFT, Rank.TWO);

      game.turnOver(LEFT, RIGHT);

      expect(game.state.undoDepth).toBe(1);
    });

    it("takes one back as a single move", () => {
      game.place(LEFT, Rank.TWO);
      game.turnOver(LEFT, RIGHT);

      game.undo();

      expect(game.state.moves).toBe(0);
    });
  });

  describe("announcing what moved", () => {
    /** Returns every announcement made from here on, in the order made. */
    function recordAnnouncements(): string[][] {
      const announced: string[][] = [];
      game.onCardsRelocated((cardIds) => announced.push([...cardIds]));
      return announced;
    }

    it("names a run that arrived turned over in the order it landed", () => {
      const bottom = game.place(LEFT, Rank.TWO);
      const middle = game.place(LEFT, Rank.THREE);
      const top = game.place(LEFT, Rank.FOUR);
      const announced = recordAnnouncements();

      game.turnOver(LEFT, RIGHT);

      // Named as the run now lies, not as the transfer records it for undo.
      expect(announced).toEqual([[top.id, middle.id, bottom.id]]);
    });

    it("names a run that kept its order the way it already was", () => {
      const lower = game.place(LEFT, Rank.TWO);
      const upper = game.place(LEFT, Rank.THREE);
      const announced = recordAnnouncements();

      game.moveCardToPile(lower.id, RIGHT);

      expect(announced).toEqual([[lower.id, upper.id]]);
    });

    it("names a turned-over run the way undo leaves it", () => {
      const bottom = game.place(LEFT, Rank.TWO);
      const top = game.place(LEFT, Rank.THREE);
      game.turnOver(LEFT, RIGHT);
      const announced = recordAnnouncements();

      game.undo();

      // Undo re-appends in the order the cards came from, so they are back the
      // way they started and the announcement says so.
      expect(announced).toEqual([[bottom.id, top.id]]);
    });
  });
});
