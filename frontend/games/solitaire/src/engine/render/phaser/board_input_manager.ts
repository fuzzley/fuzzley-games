import * as Phaser from "phaser";
import type { BoardScene } from "./board_scene";
import { DragController } from "../input/drag_controller";
import {
  DragInteraction,
  FlightInteraction,
  TableInteractionState,
} from "../view/table_view_state";

/**
 * The id of the card a sprite draws, as stamped on it when the scene created
 * it, or null for a sprite that is not a card.
 */
function cardIdOf(gameObject: Phaser.GameObjects.Sprite): string | null {
  const cardId: unknown = gameObject.getData("cardId");
  return typeof cardId === "string" ? cardId : null;
}

/**
 * Binds Phaser's pointer and drag events to a {@link DragController}.
 *
 * Everything this does is translation. What a press means, which cards travel
 * with a dragged one, and where a drop lands are all decided elsewhere — by the
 * game's gesture map and the scene's drop resolver — so this class holds no
 * rules and no state of its own beyond the controller it drives.
 */
export class BoardInputManager {
  private readonly controller: DragController;

  /**
   * Constructs the board input manager.
   *
   * @param boardScene The parent board scene.
   */
  constructor(private readonly boardScene: BoardScene) {
    this.controller = new DragController(
      boardScene.handleIntent,
      boardScene.stackFromCard,
    );
  }

  /** Binds the global drag and drop event listeners to Phaser's input system. */
  public registerDragListeners(): void {
    // Phaser's drag events carry the pointer as their first argument, which
    // none of these handlers need: the drag position comes from the event's own
    // dragX/dragY, already converted into game space.
    this.boardScene.input.on(
      "dragstart",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragStart(gameObject),
    );
    this.boardScene.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number,
      ) => this.controller.dragMoved({ x: dragX, y: dragY }),
    );
    this.boardScene.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragEnd(gameObject),
    );
  }

  /**
   * Registers event listeners on an individual playing card sprite.
   *
   * @param sprite The card's sprite.
   * @param cardId The id of the card the sprite draws.
   */
  public registerCardListeners(
    sprite: Phaser.GameObjects.Sprite,
    cardId: string,
  ): void {
    sprite.on("pointerover", () => this.controller.cardOver(cardId));
    sprite.on("pointerout", () => this.controller.cardOut(cardId));
    sprite.on("pointerdown", () => this.controller.cardPressed(cardId));
  }

  /**
   * Registers event listeners on a pile's background placeholder sprite.
   *
   * @param sprite The placeholder sprite.
   * @param pileId The id of the pile it marks.
   */
  public registerPileBackgroundListeners(
    sprite: Phaser.GameObjects.Sprite,
    pileId: string,
  ): void {
    sprite.on("pointerdown", () => this.controller.backgroundPressed(pileId));
    sprite.on("pointerover", () => this.controller.backgroundOver(pileId));
    sprite.on("pointerout", () => this.controller.backgroundOut(pileId));
  }

  /** Picks up the card the drag started on, along with the stack above it. */
  private onDragStart(gameObject: Phaser.GameObjects.Sprite): void {
    const cardId = cardIdOf(gameObject);
    if (!cardId) return;

    this.controller.dragStarted(cardId, { x: gameObject.x, y: gameObject.y });
  }

  /** Drops the stack in hand onto whichever pile it was released over. */
  private onDragEnd(gameObject: Phaser.GameObjects.Sprite): void {
    const drag = this.controller.drag;
    if (!drag || !cardIdOf(gameObject)) {
      // Nothing in hand, or a sprite that is not a card. Either way the drag is
      // over, and the controller clears it.
      this.controller.dragEnded(null);
      return;
    }

    // The same resolver the view builder previews with, so the card lands on
    // the pile the border promised it would.
    const target = this.boardScene.resolveDropTarget(
      this.boardScene.gameModel,
      drag,
      this.boardScene.viewport,
    );
    this.controller.dragEnded(target?.pileId ?? null);
  }

  // --- The state the scene and the view builder read ---

  /** The id of the currently hovered card, or null when none is. */
  public get hoveredCardId(): string | null {
    return this.controller.hoveredCardId;
  }
  public set hoveredCardId(cardId: string | null) {
    this.controller.hoveredCardId = cardId;
  }

  /** The pile whose background slot is hovered, or null. */
  public get hoveredBackgroundPileId(): string | null {
    return this.controller.hoveredBackgroundPileId;
  }
  public set hoveredBackgroundPileId(pileId: string | null) {
    this.controller.hoveredBackgroundPileId = pileId;
  }

  /** The transient drag interaction state. */
  public get drag(): DragInteraction | null {
    return this.controller.drag;
  }
  public set drag(drag: DragInteraction | null) {
    this.controller.drag = drag;
  }

  /** Whether to snap all cards immediately rather than easing them. */
  public get snapAll(): boolean {
    return this.controller.snapAll;
  }
  public set snapAll(snap: boolean) {
    this.controller.snapAll = snap;
  }

  /** The stack still crossing the board, or null when nothing is in flight. */
  public get flight(): FlightInteraction | null {
    return this.controller.flight;
  }

  /** Lets the flying stack settle back onto the board. */
  public endFlight(): void {
    this.controller.endFlight();
  }

  /** Snapshot of the interaction state the view builder reads each frame. */
  public get interaction(): TableInteractionState {
    return this.controller.interaction;
  }

  /** Clears all interaction state and requests a one-frame snap. */
  public resetInteraction(): void {
    this.controller.reset();
  }
}
