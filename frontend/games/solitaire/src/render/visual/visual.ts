import { GameObjects } from "phaser";
import { Point } from "../../common/point";

/**
 * Generic base class representing a visual wrapper.
 * 
 * Binds a logical model state to a Phaser Sprite and tracks its rendering coordinates.
 *
 * @template T The type of the logical model item wrapped by this visual.
 */
export class Visual<T = unknown> {
  private _position: Point = { x: 0, y: 0 };
  private _sprite: GameObjects.Sprite;

  /**
   * Constructs a visual wrapper for a logical model.
   *
   * @param value The underlying logical model instance.
   */
  constructor(public readonly value: T = undefined as unknown as T) { }

  /**
   * Gets the relative screen position coordinates.
   *
   * @returns The current coordinates of this visual wrapper.
   */
  get position(): Point {
    return this._position;
  }

  /**
   * Sets the relative screen position coordinates.
   *
   * @param value The new coordinates of this visual wrapper.
   */
  set position(value: Point) {
    this._position = value;
  }

  /**
   * Gets the associated Phaser Sprite game object.
   *
   * @returns The Phaser Sprite instance.
   */
  get sprite(): GameObjects.Sprite {
    return this._sprite;
  }

  /**
   * Sets the associated Phaser Sprite game object.
   *
   * @param value The new Phaser Sprite instance.
   */
  set sprite(value: GameObjects.Sprite) {
    this._sprite = value;
  }
}
