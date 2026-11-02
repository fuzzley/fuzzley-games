import type { Steer } from "../rules/ship";
import type { Place } from "../rules/torus";
import { type HeldKey, heldKeyOf } from "./controls";
import { type Deck, type DeckButton, buttonAt } from "./deck";
import {
  type BoardSetting,
  type FieldMetrics,
  type PixelRect,
  toField,
} from "./field_metrics";
import { STICK_RADIUS_CSS_PX, Stick, type StickView } from "./stick";

/** The mouse's main button, which fires while it is held. */
const MAIN_BUTTON = 0;

/** The mouse's second button, which thrusts while it is held. */
const SECOND_BUTTON = 2;

/**
 * How many fingers the scene follows at once, as it adds pointers for: a
 * thumb on the stick, and two on the buttons, so one can hold Fire as
 * another dashes. The steering keeps a record for each, as all of them may
 * be off the stick.
 */
export const MOST_FINGERS = 3;

/** How many keys are held for each thing a key flies the ship by: none. */
const NO_KEYS: Readonly<Record<HeldKey, number>> = {
  left: 0,
  right: 0,
  thrust: 0,
  fire: 0,
  dash: 0,
};

/** Describes a pointer as the steering reads it, as Phaser's pointer has it. */
export interface PointerView {
  /** Tells pointers apart: each finger has its own. */
  readonly id: number;
  /** Where it is across the canvas, in device pixels. */
  readonly x: number;
  /** Where it is down the canvas, in device pixels. */
  readonly y: number;
  /** Whether it is a finger, rather than a mouse. */
  readonly wasTouch: boolean;
  /** The mouse button last pressed or let go: 0 is the main one, 2 the second. */
  readonly button: number;
}

/** Describes a finger off the stick, which presses whichever button it is on. */
interface Finger {
  /** Its pointer's id, or null for a record no finger holds. */
  id: number | null;
  /** Whether its place is on the canvas as it is, as it has moved since the canvas last changed under it. */
  placed: boolean;
  /** The button it pressed as the canvas last changed under it, which it presses until it moves. */
  latched: DeckButton | null;
  x: number;
  y: number;
}

/**
 * Turns the player's keys, mouse and fingers into the ship's steering for
 * each frame: the keys as a turn and a push; the mouse as a place to aim
 * at, its main button fire and its second a push; the deck's stick as a
 * heading and a push, and its buttons by which finger is where; and fire
 * held every frame where it is by itself.
 *
 * The mouse aims only once it moves over the field, and stops as a turn key
 * is pressed or a finger takes the stick; its place is kept in field units
 * from its last move, so a still pointer aims at the same place through a
 * resize. A stick's heading turns the ship before the mouse's aim, and the
 * mouse's before the keys'.
 */
export class Steering {
  /** How many keys are held for each thing a key flies the ship by. */
  private keys: Record<HeldKey, number> = { ...NO_KEYS };
  /** The keys held, by `event.code`, so a key held repeats nothing and two held for one thing each count. */
  private readonly codes = new Set<string>();
  /** The way of the turn key held last, which wins while both are held. */
  private lastTurn: -1 | 1 = 1;
  private mouseFire = false;
  private mouseThrust = false;
  private aiming = false;
  /** Where the mouse last moved, in field units, while it aims. */
  private readonly aimAt = { x: 0, y: 0 };
  /** Where the mouse last moved on the canvas, so a move that goes nowhere takes nothing. */
  private readonly mouseAt = { x: Number.NaN, y: Number.NaN };
  private readonly stick: Stick;
  /** A record for each finger off the stick that can be held at once. */
  private readonly fingers: Finger[] = Array.from(
    { length: MOST_FINGERS },
    () => ({ id: null, placed: false, latched: null, x: 0, y: 0 }),
  );
  // Written again each frame, so steering makes nothing.
  private readonly steer: Steer = {
    turn: 0,
    heading: null,
    aim: null,
    thrust: 0,
    fire: false,
    dash: false,
  };

  constructor(
    private metrics: FieldMetrics,
    private deck: Deck | null,
    private board: BoardSetting,
  ) {
    this.stick = new Stick(STICK_RADIUS_CSS_PX * metrics.pixelRatio);
  }

  /** Describes the deck's stick, for its painter. */
  get stickView(): StickView {
    return this.stick;
  }

  /**
   * Takes where the field and the deck now lie on the canvas, as the
   * board's setting says, whose "Fire by itself" holds fire every frame.
   * Every finger goes on asking what it did until it moves, as where it lies
   * on the new canvas is unknown till then.
   */
  measure(metrics: FieldMetrics, deck: Deck | null, board: BoardSetting): void {
    for (const finger of this.fingers) {
      if (finger.placed) finger.latched = this.buttonOf(finger);
      finger.placed = false;
    }
    this.metrics = metrics;
    this.deck = deck;
    this.board = board;
    this.stick.measure(STICK_RADIUS_CSS_PX * metrics.pixelRatio);
  }

  /**
   * Takes a key pressed, by `event.code`, that flies the ship, but not one
   * held already, as a key held repeats; a turn key takes the heading back
   * from the mouse.
   */
  press(code: string): void {
    const key = heldKeyOf(code);
    if (!key || this.codes.has(code)) return;
    this.codes.add(code);
    this.keys[key] += 1;
    if (key === "left" || key === "right") {
      this.lastTurn = key === "left" ? -1 : 1;
      this.aiming = false;
    }
  }

  /** Takes a key let go, by `event.code`, that flew the ship. */
  release(code: string): void {
    const key = heldKeyOf(code);
    if (!key || !this.codes.delete(code)) return;
    this.keys[key] -= 1;
  }

  /**
   * Takes a pointer pressed: the mouse's buttons, held; a finger in the
   * stick's zone, which takes the stick unless another holds it; or any
   * other finger, which presses the button it is on. Returns whether a
   * finger took the stick or pressed a button, which goes on with a paused
   * game, as a flight key does.
   */
  pointerDown(pointer: PointerView): boolean {
    if (!pointer.wasTouch) {
      this.holdButton(pointer.button, true);
      return false;
    }
    // A finger pressed under the id of one whose lift was lost is a new one.
    this.forget(pointer.id);
    const { deck } = this;
    if (!deck) return false;
    if (
      within(deck.stickZone, pointer) &&
      this.stick.press(pointer.id, pointer)
    ) {
      this.aiming = false;
      return true;
    }
    const finger = this.fingerOf(null);
    if (!finger) return false;
    finger.id = pointer.id;
    finger.placed = true;
    finger.x = pointer.x;
    finger.y = pointer.y;
    return this.buttonOf(finger) !== null;
  }

  /**
   * Takes a pointer moved: the mouse, which aims at its place once it is
   * over the field, if it moved at all; the stick's finger, which moves its
   * knob; or another finger, which presses whichever button it is now on.
   */
  pointerMove(pointer: PointerView): void {
    if (!pointer.wasTouch) {
      this.moveMouse(pointer);
      return;
    }
    if (this.stick.move(pointer.id, pointer)) return;
    const finger = this.fingerOf(pointer.id);
    if (!finger) return;
    finger.placed = true;
    finger.x = pointer.x;
    finger.y = pointer.y;
  }

  /** Takes a pointer let go, or a finger the browser took away. */
  pointerUp(pointer: PointerView): void {
    if (!pointer.wasTouch) {
      this.holdButton(pointer.button, false);
      return;
    }
    this.forget(pointer.id);
  }

  /**
   * Forgets every key, button and finger held, as the game pauses, so none
   * sticks; the mouse's place is kept, as a still pointer still aims there.
   */
  letGo(): void {
    this.keys = { ...NO_KEYS };
    this.codes.clear();
    this.mouseFire = false;
    this.mouseThrust = false;
    this.stick.letGo();
    for (const finger of this.fingers) finger.id = null;
  }

  /** Returns whether a finger is on a button of the deck, for its painter. */
  isPressed(button: DeckButton): boolean {
    // A finger latched on Fire presses nothing where the deck has no Fire.
    if (button === "fire" && !this.deck?.fire) return false;
    for (const finger of this.fingers) {
      const on = finger.placed ? this.buttonOf(finger) : finger.latched;
      if (finger.id !== null && on === button) return true;
    }
    return false;
  }

  /** Returns the steering for a frame; the object returned is the same each frame. */
  read(): Readonly<Steer> {
    const { steer } = this;
    steer.heading = this.stick.heading();
    steer.aim = steer.heading === null && this.aiming ? this.aimAt : null;
    steer.turn = steer.heading === null && !steer.aim ? this.turn() : 0;
    steer.thrust =
      this.keys.thrust > 0 || this.mouseThrust ? 1 : this.stick.thrust();
    steer.fire =
      this.board.fireByItself ||
      this.keys.fire > 0 ||
      this.mouseFire ||
      this.isPressed("fire");
    steer.dash = this.keys.dash > 0 || this.isPressed("dash");
    return steer;
  }

  /** Returns the way the turn keys held turn the ship. */
  private turn(): -1 | 0 | 1 {
    const left = this.keys.left > 0;
    const right = this.keys.right > 0;
    if (left && right) return this.lastTurn;
    if (left) return -1;
    return right ? 1 : 0;
  }

  /** Aims at the mouse's place on the field, once it moves over it, if it moved at all. */
  private moveMouse(pointer: PointerView): void {
    if (pointer.x === this.mouseAt.x && pointer.y === this.mouseAt.y) return;
    this.mouseAt.x = pointer.x;
    this.mouseAt.y = pointer.y;
    if (!this.aiming && !within(this.metrics, pointer)) return;
    this.aiming = true;
    toField(this.metrics, pointer, this.aimAt);
  }

  /** Returns the button of the deck a finger off the stick is on, or null. */
  private buttonOf(finger: Finger): DeckButton | null {
    return this.deck ? buttonAt(this.deck, finger) : null;
  }

  /** Lets go of a finger, on the stick or off it. */
  private forget(id: number): void {
    this.stick.lift(id);
    const finger = this.fingerOf(id);
    if (finger) finger.id = null;
  }

  /** Notes a mouse button held or let go. */
  private holdButton(button: number, held: boolean): void {
    if (button === MAIN_BUTTON) this.mouseFire = held;
    else if (button === SECOND_BUTTON) this.mouseThrust = held;
  }

  /** Returns the record of the finger off the stick with a pointer's id, or a free one for null, or null where there is none. */
  private fingerOf(id: number | null): Finger | null {
    for (const finger of this.fingers) {
      if (finger.id === id) return finger;
    }
    return null;
  }
}

/** Returns whether a place on the canvas lies within a rectangle. */
function within(rect: PixelRect, place: Place): boolean {
  return (
    place.x >= rect.x &&
    place.x < rect.x + rect.width &&
    place.y >= rect.y &&
    place.y < rect.y + rect.height
  );
}
