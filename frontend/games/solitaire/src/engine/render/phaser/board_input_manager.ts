import * as Phaser from "phaser";
import { DragController } from "../input/drag_controller";
import { DragInteraction } from "../view/table_view_state";

/** Returns the id of the card a sprite draws, or null if it is not a card. */
function cardIdOf(gameObject: Phaser.GameObjects.Sprite): string | null {
  const cardId: unknown = gameObject.getData("cardId");
  return typeof cardId === "string" ? cardId : null;
}

/** Gives an input binder what it needs of the scene it listens to. */
export interface InputHost {
  /** The scene's input plugin, which raises the pointer and drag events. */
  readonly input: Phaser.Input.InputPlugin;
  /** Returns the pile a stack released now would land on, or null for none. */
  dropTargetFor(drag: DragInteraction): string | null;
}

/** Binds Phaser's pointer and drag events to a {@link DragController}. */
export class BoardInputManager {
  constructor(
    private readonly host: InputHost,
    private readonly controller: DragController,
  ) {}

  /** Binds the global drag and drop event listeners to Phaser's input system. */
  public registerDragListeners(): void {
    // An empty `currentlyOver` means the press landed on bare table rather
    // than on a sprite.
    this.host.input.on(
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
    this.host.input.on(
      "dragstart",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) =>
        this.onDragStart(gameObject),
    );
    this.host.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number,
      ) => this.controller.dragMoved({ x: dragX, y: dragY }),
    );
    this.host.input.on(
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

    this.controller.dragEnded(this.host.dropTargetFor(drag));
  }
}
