import { onKeyDown, onPlayerAway } from "@fz/phaser/scene";
import { Input, type Scene } from "phaser";
import type { BoardMetrics } from "../view/board/metrics";
import { squareAt } from "../view/board/spaces";
import type { BoardCommand } from "../view/input/commands";
import { PressReader } from "../view/input/gesture";
import type { Ring } from "../view/input/keys";
import type { Picking } from "../view/input/picking";
import type { FeelTuning } from "../view/timeline/feel";
import type { PlayClock } from "./play_clock";

/** The keys the browser would otherwise scroll the page by. */
const CAPTURED_KEYS = "UP,RIGHT,DOWN,LEFT,SPACE";

/** The mouse's main button, as `MouseEvent.button` numbers it. */
const MAIN_BUTTON = 0;

/** Says what the board's input plays on and hands its commands to, the shell's and the scene's. */
export interface InputPorts {
  /** Returns the picking the presses play on. */
  readonly picking: () => Picking;
  /** Returns the ring the keys move over the board. */
  readonly ring: () => Ring;
  /** Takes each command a press or a key gives, in turn. */
  readonly command: (command: BoardCommand) => void;
  /** Returns where the board lies on the canvas, as it was last laid out. */
  readonly metrics: () => BoardMetrics;
  /** Returns the feel of the play the board draws, by which a press swipes. */
  readonly feel: () => FeelTuning;
}

/**
 * Reads the player's presses and keys on the board into the commands the
 * picking and the ring give, and hands each to the shell: a press on a
 * square plays on the picking as it starts, and as it swipes or ends in a
 * tap; a press the browser takes away reads as nothing, as does one under
 * way as the player looks away; and a key the board answers plays on the
 * ring. A press or a key the board answers, but not a held key's repeat,
 * also hurries the clock, where a level's end lets a tap hurry it.
 */
export class BoardInput {
  /** Reads the press under way as a swipe or a tap. */
  private readonly reader = new PressReader();
  /** The pointer whose press is under way, or null between presses. */
  private pressing: number | null = null;

  /** Listens to the scene's keys and pointers until it ends. */
  constructor(
    scene: Scene,
    private readonly ports: InputPorts,
    private readonly clock: PlayClock,
  ) {
    scene.input.keyboard?.addCapture(CAPTURED_KEYS);
    onKeyDown(scene, (event) => {
      this.key(event);
    });
    scene.input.on(Input.Events.POINTER_DOWN, (pointer: Input.Pointer) => {
      this.down(pointer);
    });
    scene.input.on(Input.Events.POINTER_MOVE, (pointer: Input.Pointer) => {
      this.move(pointer);
    });
    const up = (pointer: Input.Pointer): void => {
      this.up(pointer);
    };
    scene.input.on(Input.Events.POINTER_UP, up);
    scene.input.on(Input.Events.POINTER_UP_OUTSIDE, up);
    onPlayerAway(scene, () => {
      this.letGo();
    });
  }

  /** Plays a key on the ring, where the board answers it, hurrying the clock at its first press. */
  private key(event: KeyboardEvent): void {
    const commands = this.ports.ring().press(event);
    if (commands === null) return;
    if (!event.repeat) this.clock.hurry();
    this.hand(commands);
  }

  /** Starts a press of a finger or the mouse's main button, on the square under it or off the board. */
  private down(pointer: Input.Pointer): void {
    if (!isMain(pointer)) return;
    const { ports } = this;
    const metrics = ports.metrics();
    const from = { x: pointer.x, y: pointer.y };
    this.pressing = pointer.id;
    this.clock.hurry();
    this.reader.start(from, metrics, ports.feel());
    this.hand(ports.picking().press(squareAt(metrics, from)));
  }

  /** Swaps the fuzzball held the way the press under way swipes, the first time it runs far enough. */
  private move(pointer: Input.Pointer): void {
    if (pointer.id !== this.pressing) return;
    const way = this.reader.move(pointer);
    if (way !== null) this.hand(this.ports.picking().swapHeld(way));
  }

  /** Ends the press under way, as a swipe or a tap, or as nothing where the browser took it away. */
  private up(pointer: Input.Pointer): void {
    if (pointer.id !== this.pressing || !isMain(pointer)) return;
    this.pressing = null;
    if (pointer.wasCanceled) {
      this.reader.cancel();
      return;
    }
    const read = this.reader.end(pointer);
    if (read === null) return;
    const picking = this.ports.picking();
    this.hand(read === "tap" ? picking.tap() : picking.swapHeld(read));
  }

  /** Forgets the press under way, as the player looks away; safe to repeat. */
  private letGo(): void {
    this.pressing = null;
    this.reader.cancel();
  }

  /** Hands the shell each command, in turn. */
  private hand(commands: readonly BoardCommand[]): void {
    for (const command of commands) this.ports.command(command);
  }
}

/** Returns whether a pointer is a finger or the mouse's main button. */
function isMain(pointer: Input.Pointer): boolean {
  return pointer.wasTouch || pointer.button === MAIN_BUTTON;
}
