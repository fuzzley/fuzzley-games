import { Point } from "@/engine/core/common/point";
import {
  DragInteraction,
  FlightInteraction,
  TableInteractionState,
} from "../view/table_view_state";
import { IntentHandler } from "./table_intents";

/** Maximum milliseconds between two presses for them to count as a double. */
const DOUBLE_PRESS_MS = 350;

/** How the controller learns which cards travel with the one being dragged. */
export type StackFromCard = (cardId: string) => readonly string[];

/**
 * The pointer-driven half of playing a card game: what is hovered, what is in
 * hand, what is still crossing the board, and whether two presses were a double.
 *
 * Framework-free and game-free. A backend feeds it pointer events, a game
 * handles the intents it reports, and the view builder reads the interaction
 * state it exposes. None of that changes between Klondike and FreeCell.
 */
export class DragController {
  /** The id of the currently hovered card, or null when none is. */
  public hoveredCardId: string | null = null;

  /** The pile whose background slot is hovered, or null. */
  public hoveredBackgroundPileId: string | null = null;

  /** The active drag, or null when nothing is in hand. */
  public drag: DragInteraction | null = null;

  /** Whether every card should snap to its place this frame instead of easing. */
  public snapAll = true;

  private readonly flightState: FlightInteraction[] = [];
  private lastPressTimeMs = 0;
  private lastPressedCardId: string | null = null;

  /**
   * @param handle Carries out the intents the controller reports.
   * @param stackFromCard The cards that travel with a given card, so a drag
   *   picks up everything resting on what was grabbed.
   * @param now Reads the clock, for the double-press window. Injectable so a
   *   test can control it.
   */
  constructor(
    private readonly handle: IntentHandler,
    private readonly stackFromCard: StackFromCard,
    private readonly now: () => number = Date.now,
  ) {}

  // --- Hover ---

  /** The pointer moved onto a card. */
  public cardOver(cardId: string): void {
    this.hoveredCardId = cardId;
  }

  /** The pointer left a card, which un-hovers it only if it was the hovered one. */
  public cardOut(cardId: string): void {
    if (this.hoveredCardId === cardId) {
      this.hoveredCardId = null;
    }
  }

  /** The pointer moved onto a pile's background slot. */
  public backgroundOver(pileId: string): void {
    this.hoveredBackgroundPileId = pileId;
  }

  /** The pointer left a pile's background slot. */
  public backgroundOut(pileId: string): void {
    if (this.hoveredBackgroundPileId === pileId) {
      this.hoveredBackgroundPileId = null;
    }
  }

  // --- Presses ---

  /**
   * A card was pressed.
   *
   * Always reports an `activate`. When it completes a double press on the same
   * card it reports an `activate-secondary` as well, and cancels any drag the
   * press began: a double press is a click gesture, not a drag, and letting the
   * trailing release run the drop resolver would move the card a second time.
   */
  public cardPressed(cardId: string): void {
    this.handle({ kind: "activate", cardId });

    if (!this.isDoublePress(cardId)) {
      return;
    }

    this.drag = null;
    this.beginFlight(this.handle({ kind: "activate-secondary", cardId }));
  }

  /** A pile's empty slot was pressed. */
  public backgroundPressed(pileId: string): void {
    this.beginFlight(this.handle({ kind: "activate-pile", pileId }));
  }

  /**
   * Records this press and reports whether it completes a double press on the
   * same card within {@link DOUBLE_PRESS_MS}.
   */
  private isDoublePress(cardId: string): boolean {
    const currentTimeMs = this.now();
    const isDouble =
      this.lastPressedCardId === cardId &&
      currentTimeMs - this.lastPressTimeMs < DOUBLE_PRESS_MS;

    this.lastPressTimeMs = currentTimeMs;
    this.lastPressedCardId = cardId;

    return isDouble;
  }

  /**
   * Forgets the press history, so the next press cannot complete a double.
   *
   * A backend calls this after a press it has already acted on, which is how a
   * repeated press on the same card stays a series of single presses.
   */
  public resetPressTracking(): void {
    this.lastPressTimeMs = 0;
    this.lastPressedCardId = null;
  }

  // --- Dragging ---

  /** A drag began on a card, at the given position. */
  public dragStarted(cardId: string, at: Point): void {
    const cardIds = this.stackFromCard(cardId);
    if (cardIds.length === 0) return;

    this.drag = { cardIds: [...cardIds], primary: { x: at.x, y: at.y } };
  }

  /** The stack in hand followed the pointer. */
  public dragMoved(to: Point): void {
    if (this.drag) {
      this.drag.primary = { x: to.x, y: to.y };
    }
  }

  /**
   * The stack in hand was released over the given pile, or over nothing.
   *
   * Clears the drag before reporting it, so the frame that renders the drop
   * already knows nothing is in hand.
   */
  public dragEnded(targetPileId: string | null): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;

    // Released wherever the pointer left it, so a stack that was accepted still
    // has the board to cross to reach the pile that took it.
    this.beginFlight(
      this.handle({
        kind: "drop",
        cardIds: drag.cardIds,
        targetPileId,
      }),
    );
  }

  // --- Flight ---

  /** The stacks still crossing the board, oldest first. */
  public get flights(): readonly FlightInteraction[] {
    return this.flightState;
  }

  /**
   * Lifts a stack clear of the board while it crosses it.
   *
   * A card already in the air is taken out of its old flight first, so a card
   * moved again mid-flight belongs to the newer one alone and cannot be retired
   * by whichever of the two lands first. A flight left with nothing in it goes
   * with it.
   *
   * @param cardIds The cards to lift, bottom card of the stack first.
   */
  public beginFlight(cardIds: readonly string[]): void {
    if (cardIds.length === 0) return;

    const lifted = new Set(cardIds);
    for (let index = this.flightState.length - 1; index >= 0; index--) {
      const remaining = this.flightState[index].cardIds.filter(
        (cardId) => !lifted.has(cardId),
      );
      if (remaining.length === 0) {
        this.flightState.splice(index, 1);
      } else {
        this.flightState[index].cardIds = remaining;
      }
    }

    this.flightState.push({ cardIds: [...cardIds] });
  }

  /**
   * Lets one flying stack settle back onto the board. Called once its sprites
   * have reached the pile they were moved to.
   *
   * @param flight The flight to retire, as handed out by {@link flights}.
   */
  public endFlight(flight: FlightInteraction): void {
    const index = this.flightState.indexOf(flight);
    if (index !== -1) {
      this.flightState.splice(index, 1);
    }
  }

  // --- State ---

  /** Snapshot of the interaction state the view builder reads each frame. */
  public get interaction(): TableInteractionState {
    return {
      hoveredCardId: this.hoveredCardId,
      hoveredBackgroundPileId: this.hoveredBackgroundPileId,
      drag: this.drag,
      flights: this.flightState,
      snapAll: this.snapAll,
    };
  }

  /**
   * Clears all interaction state and requests a one-frame snap. Called on a new
   * deal so no stale hover, drag or flight survives into it.
   */
  public reset(): void {
    this.hoveredCardId = null;
    this.hoveredBackgroundPileId = null;
    this.drag = null;
    this.flightState.length = 0;
    this.snapAll = true;
    this.resetPressTracking();
  }
}
