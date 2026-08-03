import {
  CardLocations,
  CardPile,
  PileRole,
} from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { EventEmitter } from "@/engine/core/common/event_emitter";
import { PlayingCard } from "@/engine/core/card/playing_card";
import {
  AppliedMove,
  AppliedMoveKind,
  CardTransfer,
  relocatedCardIds,
} from "./move";
import { GameState } from "./game_state";
import { BoardQuery } from "./rules";
import { ZoneSpec, canGrab, hasRoomFor } from "./zone";

/** A move that has passed the rules: the cards to move and where they go. */
export interface ResolvedMove {
  /** The card being moved plus everything stacked on it, bottom-first. */
  readonly movingStack: readonly PlayingCard[];
  /** The pile the stack is leaving. */
  readonly sourcePile: CardPile<PlayingCard>;
  /** The pile the stack is joining. */
  readonly targetPile: CardPile<PlayingCard>;
}

/**
 * What a move did beyond relocating its cards.
 *
 * Returned by {@link TableGame.applyMoveEffects} so undo can put all of it
 * back together. Both fields are inert by default, which is what makes a game
 * that neither scores nor flips — FreeCell — as expressible as one that does.
 */
export interface MoveEffects {
  /** The score change the move actually applied. */
  readonly scoreDelta: number;
  /** Cards the move turned face up by exposing them. */
  readonly flippedCardIds: readonly string[];
  /**
   * Further runs of cards the move relocated, in the order it relocated them.
   *
   * For a consequence of the move rather than the move itself: Spider sends a
   * completed King-to-Ace run off to a foundation as soon as the move that
   * finished it lands. Recording it here rather than as a separate action is
   * what makes one undo take the whole thing back.
   */
  readonly followUpTransfers?: readonly CardTransfer[];
}

/** A move that changed nothing but the position of its cards. */
export const NO_MOVE_EFFECTS: MoveEffects = {
  scoreDelta: 0,
  flippedCardIds: [],
};

/**
 * Told which cards an action just moved from one pile to another, bottom-first
 * within each run it moved.
 *
 * The model relocates a card the instant the action is taken, while its sprite
 * is still back at the pile it left. A view listens so it can lift those cards
 * clear of the board until they have caught up.
 */
export type RelocationListener = (cardIds: readonly string[]) => void;

/**
 * The lifecycle events every table game publishes.
 *
 * One declaration rather than six identical ones. Every game announces exactly
 * these two and nothing else, which is what lets {@link TableGame} emit them
 * itself: a win is decided by counting cards, and a subclass that had to
 * redeclare the event in order to be told about it would be paying for the
 * privilege of receiving something the engine already knows.
 */
export type TableGameEvents = {
  /** Emitted when every card in play has reached the winning role. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/** How to build a table game's board. */
export interface TableGameOptions {
  /** The zones to create piles for, and the rules each pile plays by. */
  readonly zones: () => readonly ZoneSpec[];
  /** Supplies the persistent card instances the game deals. */
  readonly registry: CardRegistry;
  /**
   * The roles {@link TableGame.autoMoveCard} tries, best first. Klondike
   * prefers a foundation over a column; FreeCell tries a foundation, then a
   * free cell, then a column.
   */
  readonly autoMoveRoles: readonly PileRole[];
  /**
   * The role that holds every card once the game is won, or undefined for a
   * game that is never won by gathering cards.
   *
   * Every solitaire here ends the same way — every card in play sitting in
   * piles of one role — and each of them used to count that for itself, in
   * three different spellings. Naming the role instead lets the engine check
   * it after every action, which is also the only way a game whose *last* move
   * is a follow-up rather than a player's move gets noticed at all.
   */
  readonly winsWhenAllCardsIn?: PileRole;
}

/**
 * The board and the move machinery shared by the solitaire family.
 *
 * Owns the piles, where every card is, whether a move is legal, and the
 * history that undo unwinds — everything that is the same whether the game is
 * Klondike, FreeCell or Spider. What differs is declared rather than coded: the
 * zones say what the piles are and what they accept, and a subclass supplies
 * whatever a move does beyond moving cards.
 *
 * Deliberately knows nothing about stocks, foundations or draws. A game that
 * has them adds them; FreeCell, which has no stock at all, simply does not.
 */
export abstract class TableGame<
  EventMap extends Record<string, unknown> & TableGameEvents = TableGameEvents,
> extends EventEmitter<EventMap> {
  /** Observable live game metrics (score, moves, undo depth). */
  public readonly state = new GameState();

  /** Where each card currently is, kept up to date by the piles themselves. */
  private readonly locations = new CardLocations<PlayingCard>();

  private readonly pilesMap = new Map<string, CardPile<PlayingCard>>();
  private readonly pilesByRoleMap = new Map<
    PileRole,
    CardPile<PlayingCard>[]
  >();

  /** The applied actions, oldest first, that {@link undo} unwinds. */
  private readonly history: AppliedMove[] = [];

  /** Followers of the cards each action relocates. */
  private readonly relocationListeners = new Set<RelocationListener>();

  private readonly zones: () => readonly ZoneSpec[];
  private readonly registry: CardRegistry;
  private readonly autoMoveRoles: readonly PileRole[];
  private readonly winningRole?: PileRole;

  constructor(options: TableGameOptions) {
    super();
    this.zones = options.zones;
    this.registry = options.registry;
    this.autoMoveRoles = options.autoMoveRoles;
    this.winningRole = options.winsWhenAllCardsIn;

    for (const zone of this.zones()) {
      const pile = new CardPile<PlayingCard>(
        zone.id,
        zone.role,
        this.locations,
      );
      this.pilesMap.set(pile.id, pile);
      const byRole = this.pilesByRoleMap.get(zone.role) ?? [];
      byRole.push(pile);
      this.pilesByRoleMap.set(zone.role, byRole);
    }
  }

  // --- The board ---

  /** Every pile a dragged stack may be dropped onto, in declaration order. */
  public get dropTargetPiles(): readonly CardPile<PlayingCard>[] {
    return this.zones()
      .filter((zone) => zone.accept !== null)
      .map((zone) => this.requirePile(zone.id));
  }

  /** Every pile on the board, in the order the zones declared them. */
  public get piles(): readonly CardPile<PlayingCard>[] {
    return [...this.pilesMap.values()];
  }

  /** Every pile playing the given part, in declaration order. */
  public pilesOfRole(role: PileRole): readonly CardPile<PlayingCard>[] {
    return this.pilesByRoleMap.get(role) ?? [];
  }

  /** The pile with the given id, or undefined. */
  public getPileById(pileId: string): CardPile<PlayingCard> | undefined {
    return this.pilesMap.get(pileId);
  }

  /** The pile with the given id, which the zones guarantee exists. */
  protected requirePile(pileId: string): CardPile<PlayingCard> {
    const pile = this.pilesMap.get(pileId);
    if (!pile) {
      throw new Error(`No zone declares a pile with id: ${pileId}`);
    }
    return pile;
  }

  /** The card with the given id, or undefined if it was never registered. */
  public getCardById(cardId: string): PlayingCard | undefined {
    return this.registry.get(cardId);
  }

  /**
   * The id of every card in play.
   *
   * What a renderer needs to know which sprites to make. Read from the game
   * rather than recomputed from a deck specification, because the two can
   * disagree: a Spider board asked for two decks of four suits while the game
   * was dealing eight copies of one, and every card the board then looked for
   * by name was a card the game did not have.
   */
  public get cardIds(): readonly string[] {
    return this.registry.ids();
  }

  /**
   * How many distinct cards the game has dealt with so far.
   *
   * Every card in play is registered, so this is what a win condition should
   * count against rather than a hardcoded 52 — which keeps a short injected
   * deck consistent.
   */
  public get cardsInPlay(): number {
    return this.registry.size;
  }

  /**
   * Finds which pile contains a given card.
   *
   * A lookup, not a scan: this runs several times a frame from the view builder
   * and up to once per candidate pile inside {@link autoMoveCard}, and the
   * piles keep {@link CardLocations} current as cards move between them.
   */
  public getPileContainingCard(
    cardId: string,
  ): CardPile<PlayingCard> | undefined {
    return this.locations.get(cardId);
  }

  /**
   * The zone describing the given pile, or undefined for an unknown id.
   *
   * How a pile behaves is declared by its zone rather than switched on its role
   * at each point of use.
   */
  public zoneFor(pileId: string): ZoneSpec | undefined {
    // Indexed, not scanned: this runs once per card per frame from the view
    // builder. The index is rebuilt only when the zone list is a different
    // array, which it is exactly when something that shapes the zones changed.
    const zones = this.zones();
    if (this.zoneIndex?.source !== zones) {
      this.zoneIndex = {
        source: zones,
        byId: new Map(zones.map((zone) => [zone.id, zone])),
      };
    }
    return this.zoneIndex.byId.get(pileId);
  }

  private zoneIndex: {
    source: readonly ZoneSpec[];
    byId: ReadonlyMap<string, ZoneSpec>;
  } | null = null;

  /** The read-only view of the board handed to placement rules. */
  public readonly board: BoardQuery = {
    pile: (pileId) => this.getPileById(pileId),
    pilesByRole: (role) => this.pilesOfRole(role),
    emptyCount: (role) =>
      this.pilesOfRole(role).filter((pile) => pile.isEmpty).length,
  };

  /** Empties every pile, leaving the registry intact so sprites keep their cards. */
  protected resetPiles(): void {
    for (const pile of this.pilesMap.values()) {
      pile.clear();
    }
  }

  // --- Moves ---

  /**
   * Whether moving a card, along with the cards stacked on it, to the given
   * pile would be legal.
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
    const targetZone = this.zoneFor(targetPileId);

    if (
      !card ||
      !targetPile ||
      !sourcePile ||
      !targetZone?.accept ||
      sourcePile.id === targetPileId
    ) {
      return null;
    }

    // A face-down card cannot be moved, whatever its zone allows a player to
    // reach for. The Klondike stock's top card is grabbable — that is what
    // makes it clickable to draw — but it is still face down and still not
    // going anywhere.
    if (!card.faceUp) {
      return null;
    }

    const sourceZone = this.zoneFor(sourcePile.id);
    if (!sourceZone || !canGrab(sourceZone.grab, card, sourcePile)) {
      return null;
    }

    // The moving stack is this card plus everything on top of it. The index is
    // valid because getPileContainingCard only returns a pile holding the card.
    const sourceCards = sourcePile.getCards();
    const movingStack = sourceCards.slice(sourceCards.indexOf(card));

    if (!hasRoomFor(targetZone, targetPile, movingStack.length)) {
      return null;
    }

    const accepted = targetZone.accept({
      card,
      movingStack,
      sourcePile,
      targetPile,
      board: this.board,
    });
    return accepted ? { movingStack, sourcePile, targetPile } : null;
  }

  /**
   * Attempts to move a card and its stacked cards to a destination pile.
   *
   * @returns True if the move was valid and executed; false otherwise.
   */
  public moveCardToPile(cardId: string, targetPileId: string): boolean {
    const move = this.resolveMove(cardId, targetPileId);
    if (!move) {
      return false;
    }

    this.state.moves++;
    for (const movingCard of move.movingStack) {
      move.sourcePile.removeCard(movingCard);
      move.targetPile.addCard(movingCard);
    }

    const effects = this.applyMoveEffects(move);
    this.record({
      kind: "move",
      transfers: [
        {
          cardIds: move.movingStack.map((card) => card.id),
          fromPileId: move.sourcePile.id,
          toPileId: move.targetPile.id,
          faceUpBefore: true,
        },
        ...(effects.followUpTransfers ?? []),
      ],
      scoreDelta: effects.scoreDelta,
      flippedCardIds: effects.flippedCardIds,
    });

    this.afterMove(move);
    this.checkWinCondition();
    return true;
  }

  /**
   * Emits `game-won` if every card in play now sits in the winning role.
   *
   * Called after every move. A game that moves cards by some other route — a
   * Spider row that completes the last run as it lands — calls it once that
   * action is recorded.
   *
   * Counted against {@link cardsInPlay} rather than a hardcoded 52, so a short
   * injected deck still reaches a coherent end, and guarded against an empty
   * board so a game that has dealt nothing has not thereby won.
   */
  protected checkWinCondition(): void {
    if (this.winningRole === undefined) {
      return;
    }

    let collected = 0;
    for (const pile of this.pilesOfRole(this.winningRole)) {
      collected += pile.size;
    }

    if (this.cardsInPlay > 0 && collected === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }

  /**
   * Applies whatever a move does beyond relocating its cards, and reports it so
   * undo can put it back.
   *
   * The template method every solitaire fills differently: Klondike scores the
   * move and turns over the card it exposed, FreeCell does neither. Doing
   * nothing is the default, so a game only overrides this if it has something
   * to say.
   *
   * @param move The move, already applied to the piles.
   */
  protected applyMoveEffects(move: ResolvedMove): MoveEffects {
    void move;
    return NO_MOVE_EFFECTS;
  }

  /**
   * Called once a move and its effects are recorded, for whatever the game
   * wants to check afterwards — most obviously whether it has been won.
   */
  protected afterMove(move: ResolvedMove): void {
    void move;
  }

  /**
   * Automatically moves a card to its best available destination, trying the
   * roles the game named in order.
   *
   * Each candidate is delegated to {@link moveCardToPile}, so all validation,
   * scoring and effects still apply and no rules are duplicated here.
   *
   * @returns True if the card found a home.
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
   * Takes back the most recent action, restoring the piles, the face-up states,
   * the score and the move count to what they were before it.
   *
   * @returns True if an action was taken back; false when there is no history.
   */
  public undo(): boolean {
    const last = this.history.pop();
    this.state.undoDepth = this.history.length;
    if (!last) {
      return false;
    }

    // Turn exposed cards back down first: they are still in the piles the cards
    // are about to be put back on top of.
    for (const flippedId of last.flippedCardIds) {
      const flipped = this.getCardById(flippedId);
      if (flipped) {
        flipped.faceUp = false;
      }
    }

    // Reverse order, so a consequence is undone before its cause: a run that
    // left for a foundation comes back before the move that completed it.
    for (const transfer of [...last.transfers].reverse()) {
      this.reverseTransfer(transfer);
    }

    this.state.score = Math.max(0, this.state.score - last.scoreDelta);
    this.state.moves--;
    this.afterUndo(last);
    // The same cards, going the other way, and with the same board to cross.
    this.announceRelocation(last);

    return true;
  }

  /** Puts one transfer's cards back where they came from. */
  private reverseTransfer(transfer: CardTransfer): void {
    const fromPile = this.getPileById(transfer.fromPileId);
    const toPile = this.getPileById(transfer.toPileId);
    if (!fromPile || !toPile) return;

    // cardIds are in source order, so re-appending in that order restores the
    // pile exactly, whichever way the action itself moved them.
    for (const cardId of transfer.cardIds) {
      const card = this.getCardById(cardId);
      if (!card) continue;
      toPile.removeCard(card);
      card.faceUp = transfer.faceUpBefore;
      fromPile.addCard(card);
    }
  }

  /**
   * Called once an action has been taken back, for side effects the game keeps
   * outside the history — Klondike's recycle count, for one.
   */
  protected afterUndo(move: AppliedMove): void {
    void move;
  }

  /** Whether there is an action {@link undo} can take back. */
  public get canUndo(): boolean {
    return this.history.length > 0;
  }

  /**
   * Appends an applied action to the history, publishes the new depth, and
   * announces the cards it relocated.
   *
   * Every action that moves cards between piles passes through here, which is
   * what makes it the one place the view has to listen to.
   */
  protected record(move: AppliedMove): void {
    this.history.push(move);
    this.state.undoDepth = this.history.length;
    this.announceRelocation(move);
  }

  /**
   * Follows the cards each action relocates, including the ones undo puts back.
   *
   * A plain callback rather than an entry in the game's event map: the payload
   * is the same for every game, and a subclass should not have to redeclare it
   * to get the behaviour. Returns a function that stops following, so a caller
   * that outlives nothing in particular still has a way to let go.
   *
   * @param listener Told which cards moved, bottom-first within each run as
   *   they now lie.
   * @returns Unsubscribes the listener.
   */
  public onCardsRelocated(listener: RelocationListener): () => void {
    this.relocationListeners.add(listener);
    return () => this.relocationListeners.delete(listener);
  }

  /**
   * Where every card in play now lies, as a rank that orders the whole board.
   *
   * Counted across the piles rather than within each one, so two cards in
   * different piles never share a rank — the same ordering the view builder
   * gives resting cards, so the two agree by construction. Built fresh per
   * announcement because that is the only thing it is for: an action has just
   * moved the cards it is about to describe.
   */
  private boardOrder(): Map<string, number> {
    const order = new Map<string, number>();
    for (const pile of this.piles) {
      for (const card of pile.getCards()) {
        order.set(card.id, order.size);
      }
    }
    return order;
  }

  /** Tells the listeners which cards an action relocated, if it relocated any. */
  private announceRelocation(move: AppliedMove): void {
    const order = this.boardOrder();
    const cardIds = relocatedCardIds(move, (cardId) => order.get(cardId) ?? -1);
    if (cardIds.length === 0) return;

    // A snapshot, so a listener that unsubscribes during dispatch does not
    // change who is notified for this action.
    for (const listener of [...this.relocationListeners]) {
      listener(cardIds);
    }
  }

  /**
   * Records cards moving between piles outside the normal move path — a draw, a
   * recycle, a dealt row — so undo can take it back like any other action.
   *
   * @param kind What the player did.
   * @param transfers The runs relocated, in the order they were relocated.
   * @param options The score it applied and any cards it turned face up.
   */
  protected recordTransfers(
    kind: AppliedMoveKind,
    transfers: readonly CardTransfer[],
    options: {
      scoreDelta?: number;
      flippedCardIds?: readonly string[];
    } = {},
  ): void {
    this.record({
      kind,
      transfers,
      scoreDelta: options.scoreDelta ?? 0,
      flippedCardIds: options.flippedCardIds ?? [],
    });
  }

  /** Drops the whole history, for a new deal that nothing before it precedes. */
  protected clearHistory(): void {
    this.history.length = 0;
    this.state.undoDepth = 0;
  }

  // --- Interaction ---

  /** Whether the card can currently be picked up at all. */
  public isCardInteractable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardInteractableInPile(card, pile) : false;
  }

  /**
   * The pile-aware form of {@link isCardInteractable}, for callers that already
   * know which pile holds the card (e.g. the per-frame view builder).
   */
  public isCardInteractableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean {
    const zone = this.zoneFor(pile.id);
    return zone ? canGrab(zone.grab, card, pile) : false;
  }

  /** Whether the card can currently be dragged. */
  public isCardDraggable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardDraggableInPile(card, pile) : false;
  }

  /** The pile-aware form of {@link isCardDraggable}. */
  public isCardDraggableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean {
    const zone = this.zoneFor(pile.id);
    return zone?.draggable ? canGrab(zone.grab, card, pile) : false;
  }
}
