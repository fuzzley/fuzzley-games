import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IntentHandler,
  TableIntent,
} from "@/engine/render/input/table_intents";
import { GameSnapshot } from "@/engine/tableau/game_snapshot";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { TableGame } from "@/engine/tableau/table_game";
import { gesturesFor } from "@/ui/app/provider/board_catalog";
import { GameId } from "@/ui/app/provider/game_catalog";
import { seededRandom } from "@/engine/core/random/seeded_random";
import { CATALOG_DEALS } from "@test/support/ui/catalog_deals";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/*
 * The rules every game in the catalog keeps, whatever it is: each card is on
 * the board exactly once, every change is exactly one step that undo takes
 * back to the snapshot before it, a snapshot restores to the same game, and a
 * restart replays the deal.
 *
 * Each game is played through its own gesture map, so a draw, a deal, a
 * redeal or a recycle is checked the same way as a move. The checks run after
 * every action rather than at the end, which is why they sit inside loops.
 */

/** How many actions a game plays at random. */
const RANDOM_STEPS = 30;

/**
 * The most times one pile is pressed in a row: enough to draw a two-deck stock
 * all the way through and recycle it more than once.
 */
const MAX_PRESSES = 120;

/** The seed every game is shuffled and played with. */
const SEED = 20261003;

/** A game the contract can both play on the table and snapshot. */
type ContractGame = TableGame & PlayableGame;

/** Returns a dealt game as the table game every catalog entry deals. */
function asContractGame(game: PlayableGame): ContractGame {
  if (!(game instanceof TableGame)) {
    throw new Error("Every game in the catalog is a table game.");
  }
  return game;
}

/** Returns a copy of `items` in a random order. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Returns the press a player would make on a pile: its top card, or its slot. */
function pressOn(game: ContractGame, pileId: string): TableIntent {
  const top = game.getPileById(pileId)?.topCard;
  return top
    ? { kind: "activate", cardId: top.id }
    : { kind: "activate-pile", pileId };
}

/** Lists every intent a player could send now, one list per kind of intent. */
function candidateIntents(game: ContractGame): TableIntent[][] {
  const presses = game.piles.map((pile) => pressOn(game, pile.id));
  const autoMoves: TableIntent[] = [];
  const drops: TableIntent[] = [];
  for (const pile of game.piles) {
    for (const card of pile.getCards()) {
      if (!game.isCardInteractableInPile(card, pile)) continue;
      autoMoves.push({ kind: "activate-secondary", cardId: card.id });
      for (const target of game.dropTargetPiles) {
        if (game.canMoveCardToPile(card.id, target.id)) {
          drops.push({
            kind: "drop",
            cardIds: [card.id],
            targetPileId: target.id,
          });
        }
      }
    }
  }
  return [presses, autoMoves, drops];
}

/** Plays a game through its gesture map, checking the contract at each step. */
class ContractPlayer {
  constructor(
    readonly game: ContractGame,
    private readonly handle: IntentHandler,
    private readonly random: () => number,
  ) {}

  /**
   * Sends an intent and returns whether it changed the game, after checking
   * that a change was one undoable step that undo and restore both reproduce.
   */
  send(intent: TableIntent): boolean {
    const before = this.game.snapshot();
    this.handle(intent);
    const after = this.game.snapshot();
    if (JSON.stringify(after) === JSON.stringify(before)) return false;

    const action = JSON.stringify(intent);
    expect(after.history.length, `${action} adds one step`).toBe(
      before.history.length + 1,
    );
    expect(this.cardsOnBoard(), `${action} keeps every card once`).toEqual(
      this.cardsInPlay(),
    );
    expect(this.game.state.moves, `${action} counts one move per step`).toBe(
      after.history.length,
    );

    this.game.undo();
    expect(this.game.snapshot(), `${action} undoes exactly`).toEqual(before);

    this.game.restore(after);
    expect(this.game.snapshot(), `${action} restores exactly`).toEqual(after);
    return true;
  }

  /** Makes up to `steps` actions, each picked at random from those that act. */
  playAtRandom(steps: number): void {
    for (let step = 0; step < steps; step++) {
      const groups = shuffled(candidateIntents(this.game), this.random);
      const acted = groups.some((group) =>
        shuffled(group, this.random).some((intent) => this.send(intent)),
      );
      if (!acted) return;
    }
  }

  /** Presses each pile in turn until a press does nothing. */
  pressEveryPileThrough(): void {
    for (const pile of this.game.piles) {
      for (let press = 0; press < MAX_PRESSES; press++) {
        if (!this.send(pressOn(this.game, pile.id))) break;
      }
    }
  }

  /** The id of every card on the board, sorted. */
  private cardsOnBoard(): string[] {
    return this.game.piles
      .flatMap((pile) => pile.getCards().map((card) => card.id))
      .sort();
  }

  /** The id of every card the game deals, sorted. */
  private cardsInPlay(): string[] {
    return [...this.game.cardIds].sort();
  }
}

describe.each(CATALOG_DEALS)("%s", (_name, entry, values) => {
  let player: ContractPlayer;
  let dealt: GameSnapshot;

  beforeEach(() => {
    const random = seededRandom(SEED);
    vi.spyOn(Math, "random").mockImplementation(random);
    const game = asContractGame(entry.create(values).game);
    player = new ContractPlayer(
      game,
      gesturesFor(entry.id as GameId, game),
      random,
    );
    dealt = game.snapshot();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps each card on the board once in the deal", () => {
    const onBoard = player.game.piles.flatMap((pile) =>
      pile.getCards().map((card) => card.id),
    );

    expect(onBoard.sort()).toEqual([...player.game.cardIds].sort());
  });

  it("keeps the contract through random play", () => {
    player.playAtRandom(RANDOM_STEPS);

    expect(player.game.snapshot().history.length).toBeGreaterThan(0);
  });

  it("keeps the contract while every pile is pressed through", () => {
    player.pressEveryPileThrough();

    expect(player.game.state.moves).toBe(player.game.snapshot().history.length);
  });

  it("unwinds to the deal by undoing every step", () => {
    player.playAtRandom(RANDOM_STEPS);
    player.pressEveryPileThrough();

    while (player.game.undo());

    expect(player.game.snapshot()).toEqual(dealt);
  });

  it("replays the deal on a restart", () => {
    player.playAtRandom(RANDOM_STEPS);

    player.game.restartGame();

    expect(player.game.snapshot()).toEqual(dealt);
  });
});
