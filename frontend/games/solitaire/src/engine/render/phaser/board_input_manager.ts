import * as Phaser from "phaser";
import type { BoardScene } from "./board_scene";
import { DragController } from "../input/drag_controller";
import {
  DragInteraction,
  FlightInteraction,
  TableInteractionState,
} from "../view/table_view_state";

/** Returns the id of the card a sprite draws, or null if it is not a card. */
function cardIdOf(gameObject: Phaser.GameObjects.Sprite): string | null {
  const cardId: unknown = gameObject.getData("cardId");
  return typeof cardId === "string" ? cardId : null;
}

/** Binds Phaser's pointer and drag events to a {@link DragController}. */
export class BoardInputManager {
  private readonly controller: DragController;

  /** Creates the input manager for a board scene. */
  constructor(private readonly boardScene: BoardScene) {
    this.controller = new DragController(
      boardScene.handleIntent,
      boardScene.stackFromCard,
    );
  }

  /** Binds the global drag and drop event listeners to Phaser's input system. */
  public registerDragListeners(): void {
    // An empty `currentlyOver` means the press landed on bare table rather
    // than on a sprite.
    this.boardScene.input.on(
      "pointerdown",
      (
        _pointer: Phaser.Input.Pointer,
        currentlyOver: readonly Phaser.GameObjects.GameObject[],
      ) => {
        if (currentlyOver.length === 0) {
          this.controller.pressedBareTable();
        }
      },
    );

    // Positions come from dragX and dragY, which are already in game space,
    // rather than from the pointer.
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

  /** Registers pointer listeners on a card's sprite. */
  public registerCardListeners(
    sprite: Phaser.GameObjects.Sprite,
    cardId: string,
  ): void {
    sprite.on("pointerover", () => this.controller.cardOver(cardId));
    // A finger leaves as soon as a tap ends, so the card it touched stays open.
    sprite.on("pointerout", (pointer: Phaser.Input.Pointer) =>
      this.controller.cardOut(cardId, pointer.wasTouch),
    );
    sprite.on("pointerdown", () => this.controller.cardPressed(cardId));
  }

  /** Registers pointer listeners on a pile's placeholder sprite. */
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
      this.controller.dragEnded(null);
      return;
    }

    // The same resolver the view builder previews with, so the card lands on
    // the pile the border promised it would.
    const target = this.boardScene.resolveDropTarget(
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

  /** The active drag, or null when nothing is in hand. */
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

  /** The stacks still crossing the board, oldest first. */
  public get flights(): readonly FlightInteraction[] {
    return this.controller.flights;
  }

  /** Lifts a stack clear of the board while it crosses it. */
  public beginFlight(cardIds: readonly string[]): void {
    this.controller.beginFlight(cardIds);
  }

  /** Lets one flying stack settle back onto the board. */
  public endFlight(flight: FlightInteraction): void {
    this.controller.endFlight(flight);
  }

  /** The interaction state the view builder reads each frame. */
  public get interaction(): TableInteractionState {
    return this.controller.interaction;
  }

  /** Clears all interaction state and requests a one-frame snap. */
  public resetInteraction(): void {
    this.controller.reset();
  }
}
