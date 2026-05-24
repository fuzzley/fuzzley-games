import { Point } from "../common/point";

export class Visual<T> {
  private _position: Point = { x: 0, y: 0 };

  constructor(readonly value: T) {}

  get position(): Point {
    return this._position;
  }

  set position(value: Point) {
    this._position = value;
  }
}
