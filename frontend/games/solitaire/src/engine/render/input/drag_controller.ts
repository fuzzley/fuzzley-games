import { Point } from "../layout/geometry";
import {
  DragInteraction,
  FlightInteraction,
  TableInteractionState,
} from "./interaction_state";
import { IntentHandler } from "./table_intents";
import { itemAt } from "@/engine/core/common/item_at";

/** Maximum milliseconds between two presses for them to count as a double. */
const DOUBLE_PRESS_MS = 350;

/** Returns the cards that travel with the one being dragged. */
export type StackFromCard = (cardId: string) => readonly string[];

/**
 * Tracks what the pointer is doing to the table: what is hovered, what is in
 * hand, what is still crossing the board, and whether two presses were a double.
 */
export class DragController {
  /** The id of the currently hovered card, or null when none is. */
  public hoveredCardId: string | null = null;

  /** The pile whose background slot is hovered, or null. */
  public hoveredBackgroundPileId: string | null = null;

  /** The active drag, or null when nothing is in hand. */
  public drag: DragInteraction | null = null;

  /** Whether every card snaps to its place this frame instead of easing. */
  public snapAll = true;

  private readonly flightState: FlightInteraction[] = [];
  private lastPressTimeMs = 0;
  private lastPressedCardId: string | null = null;

  /**
   * Creates a controller that reports intents to `handle`.
   *
   * @param now Reads the clock in milliseconds, for timing double presses.
   */
  constructor(
    private readonly handle: IntentHandler,
    private readonly stackFromCard: StackFromCard,
    private readonly now: () => number = Date.now,
  ) {}

  // --- Hover ---

  /** Notes that the pointer moved onto a card. */
  public cardOver(cardId: string): void {
    this.hoveredCardId = cardId;
  }

  /**
   * Un-hovers a card the pointer left, if it was the hovered one.
   *
   * @param lingers Whether the card stays hovered anyway, as it does for a
   *   finger: a finger covered the corner the fan uncovered, so the card stays
   *   open until the player touches something else.
   */
  public cardOut(cardId: string, lingers = false): void {
    if (lingers) return;
    if (this.hoveredCardId === cardId) {
      this.hoveredCardId = null;
    }
  }

  /**
   * Clears the hover after a press on bare table, which is how a finger closes
   * a card it tapped open.
   */
  public pressedBareTable(): void {
    this.hoveredCardId = null;
    this.hoveredBackgroundPileId = null;
  }

  /** Notes that the pointer moved onto a pile's background slot. */
  public backgroundOver(pileId: string): void {
    this.hoveredBackgroundPileId = pileId;
  }

  /** Notes that the pointer left a pile's background slot. */
  public backgroundOut(pileId: string): void {
    if (this.hoveredBackgroundPileId === pileId) {
      this.hoveredBackgroundPileId = null;
    }
  }

  // --- Presses ---

  /**
   * Reports a press on a card, and an `activate-secondary` too if it completes
   * a double press.
   *
   * A double press cancels any drag the press began, so its release does not
   * move the card a second time.
   */
  public cardPressed(cardId: string): void {
    this.handle({ kind: "activate", cardId });

    if (!this.isDoublePress(cardId)) {
      return;
    }

    this.drag = null;
    this.handle({ kind: "activate-secondary", cardId });
  }

  /** Reports a press on a pile's empty slot. */
  public backgroundPressed(pileId: string): void {
    this.handle({ kind: "activate-pile", pileId });
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

  /** Forgets the press history, so the next press cannot complete a double. */
  public resetPressTracking(): void {
    this.lastPressTimeMs = 0;
    this.lastPressedCardId = null;
  }

  // --- Dragging ---

  /** Picks up a card, and every card resting on it, at a point. */
  public dragStarted(cardId: string, at: Point): void {
    const cardIds = this.stackFromCard(cardId);
    if (cardIds.length === 0) return;

    this.drag = { cardIds: [...cardIds], primary: { x: at.x, y: at.y } };
  }

  /** Moves the stack in hand to follow the pointer. */
  public dragMoved(to: Point): void {
    if (this.drag) {
      this.drag.primary = { x: to.x, y: to.y };
    }
  }

  /**
   * Reports the stack in hand released over a pile, or over nothing.
   *
   * Clears the drag first, so the frame that renders the drop already knows
   * nothing is in hand.
   */
  public dragEnded(targetPileId: string | null): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;

    this.handle({
      kind: "drop",
      cardIds: drag.cardIds,
      targetPileId,
    });

    // Fly either way: to the pile that took the stack, or back where it came
    // from. Only an accepted drop is announced by the model, whose newer
    // flight then supersedes this one.
    this.beginFlight(drag.cardIds);
  }

  // --- Flight ---

  /** The stacks still crossing the board, oldest first. */
  public get flights(): readonly FlightInteraction[] {
    return this.flightState;
  }

  /**
   * Lifts a stack clear of the board while it crosses it.
   *
   * A card already in the air moves from its old flight to this one, so only
   * the newer flight's landing can retire it.
   *
   * @param cardIds The cards to lift, bottom card of the stack first.
   */
  public beginFlight(cardIds: readonly string[]): void {
    if (cardIds.length === 0) return;

    const lifted = new Set(cardIds);
    for (let index = this.flightState.length - 1; index >= 0; index--) {
      const flight = itemAt(this.flightState, index);
      const remaining = flight.cardIds.filter((cardId) => !lifted.has(cardId));
      if (remaining.length === 0) {
        this.flightState.splice(index, 1);
      } else {
        flight.cardIds = remaining;
      }
    }

    this.flightState.push({ cardIds: [...cardIds] });
  }

  /**
   * Settles a flying stack back onto the board once its sprites have landed.
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

  /** The interaction state the view builder reads each frame. */
  public get interaction(): TableInteractionState {
    return {
      hoveredCardId: this.hoveredCardId,
      hoveredBackgroundPileId: this.hoveredBackgroundPileId,
      drag: this.drag,
      flights: this.flightState,
      snapAll: this.snapAll,
    };
  }

  /** Clears all interaction state for a new deal and snaps every card. */
  public reset(): void {
    this.hoveredCardId = null;
    this.hoveredBackgroundPileId = null;
    this.drag = null;
    this.flightState.length = 0;
    this.snapAll = true;
    this.resetPressTracking();
  }
}
