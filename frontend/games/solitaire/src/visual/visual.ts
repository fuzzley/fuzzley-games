import { GameObjects } from "phaser";
import { Point } from "../common/point";

export class Visual<T = unknown> {
  private _position: Point = { x: 0, y: 0 };
  private _sprite: GameObjects.Sprite;

  constructor(public readonly value: T = undefined as unknown as T) {}

  get position(): Point {
    return this._position;
  }

  set position(value: Point) {
    this._position = value;
  }

  get sprite(): GameObjects.Sprite {
    return this._sprite;
  }

  set sprite(value: GameObjects.Sprite) {
    this._sprite = value;
  }
}
