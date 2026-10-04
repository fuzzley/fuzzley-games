import { ReadonlyCardPile, PileRole } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { EventEmitter } from "@/engine/core/common/event_emitter";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { AppliedMove, AppliedMoveKind, CardTransfer, MOVE_KIND } from "./move";
import { MoveHistory, RelocationListener } from "./move_history";
import { GameState, ReadableGameState } from "./game_state";
import { BoardQuery } from "./rules";
import { Tabletop } from "./tabletop";
import { ZoneRules, ZoneSpec, canGrab, hasRoomFor } from "./zone";
import { TableView } from "./view/table_view";

/** Describes a move that has passed the rules: its cards and where they go. */
export interface ResolvedMove {
  /** The card being moved plus everything stacked on it, bottom-first. */
  readonly movingStack: readonly PlayingCard[];
  /** The pile the stack is leaving. */
  readonly sourcePile: ReadonlyCardPile<PlayingCard>;
  /** The pile the stack is joining. */
  readonly targetPile: ReadonlyCardPile<PlayingCard>;
}

/**
 * Records what a move did beyond relocating its cards, so undo can take that
 * back too.
 */
export interface MoveEffects {
  /** The score change the move actually applied. */
  readonly scoreDelta: number;
  /** Cards the move turned face up by exposing them. */
  readonly flippedCardIds: readonly string[];
  /**
   * Further runs the move relocated as a consequence, such as a completed
   * Spider run, so one undo takes them back with it.
   */
  readonly followUpTransfers?: readonly CardTransfer[];
}

/**
 * Describes what a marked pile's slot shows now, and whether pressing it while
 * empty does anything, such as a stock that counts its recycles.
 */
export interface PileMarker {
  /** The artwork the pile's placeholder shows. */
  readonly artwork: string;
  /** Whether pressing the empty slot does something now. */
  readonly actionable: boolean;
}

/** A move that changed nothing but the position of its cards. */
export const NO_MOVE_EFFECTS: MoveEffects = {
  scoreDelta: 0,
  flippedCardIds: [],
};

/** Re-exported for callers of {@link TableGame.onCardsRelocated}. */
export type { RelocationListener };

/** Maps the lifecycle events every table game publishes to their payloads. */
export type TableGameEvents = {
  /** Emitted when every card in play has reached the winning role. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/** Configures a table game's board. */
export interface TableGameOptions {
  /**
   * The zones to create piles for, and the rules each pile plays by, which are
   * fixed for the life of the game.
   */
  readonly zones: readonly ZoneSpec[];
  /** Supplies the persistent card instances the game deals. */
  readonly registry: CardRegistry;
  /** The roles {@link TableGame.autoMoveCard} tries, best first. */
  readonly autoMoveRoles: readonly PileRole[];
  /**
   * The role that holds every card once the game is won, or undefined for a
   * game won some other way, which overrides {@link TableGame.isWon}.
   */
  readonly winsWhenAllCardsIn?: PileRole;
}

/**
 * Holds the board and move machinery shared by the solitaire family: the piles,
 * where every card is, whether a move is legal, and the history undo unwinds.
 */
export abstract class TableGame<
  EventMap extends Record<string, unknown> & TableGameEvents = TableGameEvents,
>
  extends EventEmitter<EventMap>
  implements TableView
{
  /** The live metrics, which only {@link syncMetrics} writes. */
  private readonly metrics = new GameState();

  /** Live game metrics (score, moves, undo depth), for reading and following. */
  public readonly state: ReadableGameState = this.metrics;

  /**
   * The piles and where every card is, and the only way a game changes them:
   * through `relocate` and `rearrange` for what undo takes back, and
   * `place` for a deal.
   */
  protected readonly tabletop: Tabletop;

  /** The applied actions {@link undo} unwinds, and who is following them. */
  private readonly history: MoveHistory;

  /** What each marked pile's slot shows, by pile id. */
  private readonly markers = new Map<string, () => PileMarker>();

  private readonly autoMoveRoles: readonly PileRole[];
  private readonly winningRole?: PileRole;

  /** Every pile on the board, in the order the zones declared them. */
  public readonly piles: readonly ReadonlyCardPile<PlayingCard>[];

  /** Every pile a dragged stack may be dropped onto, in declaration order. */
  public readonly dropTargetPiles: readonly ReadonlyCardPile<PlayingCard>[];

  /** The read-only view of the board handed to placement rules. */
  public readonly board: BoardQuery;

  constructor(options: TableGameOptions) {
    super();
    this.autoMoveRoles = options.autoMoveRoles;
    this.winningRole = options.winsWhenAllCardsIn;
    this.tabletop = new Tabletop(options.zones, options.registry);
    this.history = new MoveHistory(this.tabletop);
    this.piles = this.tabletop.piles;
    this.dropTargetPiles = this.tabletop.dropTargetPiles;
    this.board = this.tabletop;
  }

  // --- The board ---

  /** Returns every pile playing the given part, in declaration order. */
  public pilesOfRole(role: PileRole): readonly ReadonlyCardPile<PlayingCard>[] {
    return this.tabletop.pilesByRole(role);
  }

  /** Returns the pile with the given id, or undefined. */
  public getPileById(
    pileId: string,
  ): ReadonlyCardPile<PlayingCard> | undefined {
    return this.tabletop.pile(pileId);
  }

  /** Returns the pile with the given id, throwing if no zone declares it. */
  protected requirePile(pileId: string): ReadonlyCardPile<PlayingCard> {
    return this.tabletop.requirePile(pileId);
  }

  /** Returns the card with the given id, or undefined if never registered. */
  public getCardById(cardId: string): PlayingCard | undefined {
    return this.tabletop.getCardById(cardId);
  }

  /** The id of every card in play, which a renderer should make sprites for. */
  public get cardIds(): readonly string[] {
    return this.tabletop.cardIds;
  }

  /**
   * How many distinct cards are in play, which a win condition should count
   * against rather than 52.
   */
  public get cardsInPlay(): number {
    return this.tabletop.cardsInPlay;
  }

  /** Finds which pile contains a given card. */
  public getPileContainingCard(
    cardId: string,
  ): ReadonlyCardPile<PlayingCard> | undefined {
    return this.tabletop.pileHolding(cardId);
  }

  /** Returns the zone describing the given pile, or undefined if unknown. */
  public zoneFor(pileId: string): ZoneSpec | undefined {
    return this.tabletop.zoneFor(pileId);
  }

  /** Returns how the given pile plays, or undefined for an unknown pile. */
  private rulesFor(pileId: string): ZoneRules | undefined {
    return this.tabletop.zoneFor(pileId);
  }

  /** Empties every pile, keeping the registry so sprites keep their cards. */
  protected resetPiles(): void {
    this.tabletop.clear();
  }

  // --- Moves ---

  /**
   * Returns whether moving a card, with the cards stacked on it, to a pile
   * would be legal.
   */
  public canMoveCardToPile(cardId: string, targetPileId: string): boolean {
    return this.resolveMove(cardId, targetPileId) !== null;
  }

  /**
   * Resolves a requested move into the stack and piles it would act on, or null
   * when the rules reject it.
   */
  public resolveMove(
    cardId: string,
    targetPileId: string,
  ): ResolvedMove | null {
    const card = this.getCardById(cardId);
    const targetPile = this.getPileById(targetPileId);
    const sourcePile = this.getPileContainingCard(cardId);
    const targetRules = this.rulesFor(targetPileId);

    if (
      !card ||
      !targetPile ||
      !sourcePile ||
      !targetRules?.accept ||
      sourcePile.id === targetPileId
    ) {
      return null;
    }

    // Checked apart from the grab rule, which lets the face-down top of the
    // Klondike stock be clicked to draw.
    if (!card.faceUp) {
      return null;
    }

    const sourceRules = this.rulesFor(sourcePile.id);
    if (
      !sourceRules ||
      !canGrab(sourceRules.grab, card, sourcePile, this.board)
    ) {
      return null;
    }

    // indexOf cannot miss: getPileContainingCard only returns a pile holding
    // the card.
    const sourceCards = sourcePile.getCards();
    const movingStack = sourceCards.slice(sourceCards.indexOf(card));

    if (!hasRoomFor(targetRules, targetPile, movingStack.length)) {
      return null;
    }

    const accepted = targetRules.accept({
      card,
      movingStack,
      sourcePile,
      targetPile,
      board: this.board,
    });
    return accepted ? { movingStack, sourcePile, targetPile } : null;
  }

  /**
   * Moves a card and the cards stacked on it to a pile, returning whether the
   * rules allowed it.
   */
  public moveCardToPile(cardId: string, targetPileId: string): boolean {
    const move = this.resolveMove(cardId, targetPileId);
    if (!move) {
      return false;
    }

    const moved = this.tabletop.relocate(move.movingStack, move.targetPile);
    const effects = this.applyMoveEffects(move);
    this.commit({
      kind: MOVE_KIND,
      transfers: [moved, ...(effects.followUpTransfers ?? [])],
      scoreDelta: effects.scoreDelta,
      flippedCardIds: effects.flippedCardIds,
    });
    return true;
  }

  /**
   * Returns whether the game is won, which by default is once every card in
   * play sits in the winning role.
   *
   * Asked after every committed action, so a game won some other way, such as
   * by the order of its cards, overrides this rather than announcing the win
   * itself.
   */
  protected isWon(): boolean {
    if (this.winningRole === undefined || this.cardsInPlay === 0) {
      return false;
    }

    let collected = 0;
    for (const pile of this.pilesOfRole(this.winningRole)) {
      collected += pile.size;
    }
    return collected === this.cardsInPlay;
  }

  /**
   * Applies whatever a move does beyond relocating its cards, and reports it so
   * undo can put it back.
   *
   * @param move The move, already applied to the piles.
   */
  protected applyMoveEffects(move: ResolvedMove): MoveEffects {
    void move;
    return NO_MOVE_EFFECTS;
  }

  /**
   * Moves a card to the first pile that takes it, trying the game's auto-move
   * roles in order, and returns whether one did.
   */
  public autoMoveCard(cardId: string): boolean {
    const sourcePile = this.getPileContainingCard(cardId);

    for (const role of this.autoMoveRoles) {
      for (const pile of this.pilesOfRole(role)) {
        if (pile.id === sourcePile?.id) {
          continue;
        }
        if (this.moveCardToPile(cardId, pile.id)) {
          return true;
        }
      }
    }

    return false;
  }

  // --- History ---

  /**
   * Takes back the most recent action, score and move count included, and
   * returns whether there was one.
   */
  public undo(): boolean {
    const last = this.history.takeBack();
    if (!last) {
      return false;
    }

    // Not clamped: the delta is what the action applied, after any floor the
    // game keeps, and some games' scores run below zero.
    this.syncMetrics(this.state.score - last.scoreDelta);
    return true;
  }

  /**
   * Returns how many actions of a kind the history holds, such as the recycles
   * a game has spent.
   *
   * Read from the history rather than counted alongside it, so undo, a restart
   * and a restore all keep it right with nothing to save or take back.
   */
  protected timesApplied(kind: AppliedMoveKind): number {
    return this.history.count(kind);
  }

  /** Whether there is an action {@link undo} can take back. */
  public get canUndo(): boolean {
    return this.history.canUndo;
  }

  /**
   * Records an applied action for undo, which also counts it as a move,
   * announces the cards it relocated, applies its score change, and announces
   * the win if it brought one about.
   */
  private commit(move: AppliedMove): void {
    this.history.record(move);
    this.syncMetrics(this.state.score + move.scoreDelta);
    if (this.isWon()) {
      this.emit("game-won", undefined);
    }
  }

  /**
   * Follows the cards each action relocates, including those undo puts back,
   * and returns a function that stops following them.
   */
  public onCardsRelocated(listener: RelocationListener): () => void {
    return this.history.onCardsRelocated(listener);
  }

  /**
   * Commits cards moving between piles outside the normal move path, such as a
   * draw, a recycle or a dealt row, as one move that undo can take back.
   *
   * Fold anything the action caused, such as a run it completed, into the same
   * call, so one undo takes the whole action back. The engine applies the
   * score change; a game reports it here rather than writing the score.
   *
   * @param transfers The runs relocated, in the order they were relocated.
   */
  protected commitAction(
    kind: AppliedMoveKind,
    transfers: readonly CardTransfer[],
    options: {
      scoreDelta?: number;
      flippedCardIds?: readonly string[];
    } = {},
  ): void {
    this.commit({
      kind,
      transfers,
      scoreDelta: options.scoreDelta ?? 0,
      flippedCardIds: options.flippedCardIds ?? [],
    });
  }

  /** The actions {@link undo} can take back, oldest first. */
  protected get appliedHistory(): readonly AppliedMove[] {
    return this.history.entries();
  }

  /**
   * Replaces the actions {@link undo} can take back, oldest first, and the
   * score they leave, as a new deal or a restore does.
   */
  protected resetHistory(moves: readonly AppliedMove[], score: number): void {
    this.history.load(moves);
    this.syncMetrics(score);
  }

  /**
   * Publishes the score, and the move count and undo depth, both of which are
   * the length of the history.
   */
  private syncMetrics(score: number): void {
    const depth = this.history.depth;
    this.metrics.update({ score, moves: depth, undoDepth: depth });
  }

  // --- Interaction ---

  /** Returns whether the card can currently be picked up at all. */
  public isCardInteractable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardInteractableInPile(card, pile) : false;
  }

  /**
   * Does what {@link isCardInteractable} does, for a caller that already knows
   * which pile holds the card.
   */
  public isCardInteractableInPile(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
  ): boolean {
    const rules = this.rulesFor(pile.id);
    return rules ? canGrab(rules.grab, card, pile, this.board) : false;
  }

  /** Returns whether the card can currently be dragged. */
  public isCardDraggable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardDraggableInPile(card, pile) : false;
  }

  /**
   * Does what {@link isCardDraggable} does, for a caller that already knows
   * which pile holds the card.
   */
  public isCardDraggableInPile(
    card: PlayingCard,
    pile: ReadonlyCardPile<PlayingCard>,
  ): boolean {
    const rules = this.rulesFor(pile.id);
    return rules?.draggable
      ? canGrab(rules.grab, card, pile, this.board)
      : false;
  }

  /**
   * Makes a pile's slot show the game's state, such as how many recycles or
   * redeals are left, and stop looking pressable once a press would do nothing.
   *
   * The view asks `marker` every frame, for both the artwork and whether the
   * empty slot is pressable. Give the pile's zone a `backgroundKey` and
   * `emptyIsActionable` for how it starts: the board makes a placeholder, and
   * a pressable one, only for the piles whose zones have them when it is built.
   */
  protected markPile(
    pile: ReadonlyCardPile<PlayingCard>,
    marker: () => PileMarker,
  ): void {
    this.markers.set(pile.id, marker);
  }

  /**
   * Returns the artwork the pile's placeholder shows now: its marker's, or
   * else the one its zone declares.
   */
  public pileBackgroundKey(
    pile: ReadonlyCardPile<PlayingCard>,
  ): string | undefined {
    return (
      this.markers.get(pile.id)?.().artwork ??
      this.zoneFor(pile.id)?.backgroundKey
    );
  }

  /**
   * Returns whether pressing the pile's empty slot does something now, as its
   * marker says, or else as its zone does.
   */
  public isEmptySlotActionable(pile: ReadonlyCardPile<PlayingCard>): boolean {
    if (!pile.isEmpty) return false;
    const marker = this.markers.get(pile.id);
    return marker
      ? marker().actionable
      : (this.zoneFor(pile.id)?.emptyIsActionable ?? false);
  }
}
