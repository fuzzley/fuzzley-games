// The scene's part, played for the shell's specs: the board's frames on the
// scene's own clock, each taking what the shell hands the board and handing
// the shell the clock, as the scene does, with nothing drawn.

import type { Square } from "../rules/board/cells";
import { type BoardPlay, PlayClock } from "../scene/play_clock";
import type { BoardCommand } from "../view/input/commands";
import type { Ring } from "../view/input/keys";
import type { Picking } from "../view/input/picking";

/** How long a frame takes, in milliseconds, as a screen at 60 a second draws them. */
const FRAME_MS = 16;

/** The most frames a spec plays before it gives up on a play reaching its moment. */
const MOST_FRAMES = 10_000;

/** Says what of the shell the board's frames play: what it hands the board, and what it takes from it. */
export interface BoardShell {
  play(): BoardPlay;
  tick(nowMs: number, playedMs: number): void;
  picking(): Picking;
  ring(): Ring;
  boardCommand(command: BoardCommand): void;
}

/** Plays the board's frames for a shell, and its presses and keys, as the scene would. */
export class BoardFrames {
  private readonly clock = new PlayClock();

  constructor(private readonly shell: BoardShell) {}

  /** The scene's clock, as the last frame handed it to the shell. */
  get nowMs(): number {
    return this.clock.nowMs;
  }

  /** Plays one frame. */
  frame(): void {
    this.clock.advance(this.shell.play(), FRAME_MS);
    this.shell.tick(this.clock.nowMs, this.clock.playedMs);
  }

  /** Plays frames for a while, a frame at the least. */
  playFor(ms: number): void {
    const until = this.clock.nowMs + ms;
    do {
      this.frame();
    } while (this.clock.nowMs < until);
  }

  /**
   * Plays frames until the play the board shows as they start has played
   * past a moment of its timeline, or has been put away for another.
   *
   * @throws {Error} where it hasn't after a great many frames.
   */
  playPast(atMs: number): void {
    const play = this.shell.play();
    for (let frames = 0; frames < MOST_FRAMES; frames++) {
      this.frame();
      if (this.shell.play() !== play || this.clock.playedMs > atMs) return;
    }
    throw new Error(`The board never played past ${String(atMs)} ms.`);
  }

  /** Plays frames until the play the board shows comes to rest. */
  playToRest(): void {
    this.playPast(this.shell.play().timeline.restMs);
  }

  /**
   * Plays frames until the play the board shows has played out: past its
   * rest, each goal's count, and the level's end it comes to, its card and
   * each star lit on it.
   */
  playOut(): void {
    const { timeline } = this.shell.play();
    const counts = timeline.counts.map(({ atMs }) => atMs);
    const { cardMs = 0, starsMs = [] } = timeline.end ?? {};
    this.playPast(Math.max(timeline.restMs, cardMs, ...starsMs, ...counts));
  }

  /** Presses squares in turn, as taps on the board do, handing the shell each command. */
  tap(...squares: readonly Square[]): void {
    for (const square of squares) {
      const picking = this.shell.picking();
      for (const command of [...picking.press(square), ...picking.tap()]) {
        this.shell.boardCommand(command);
      }
    }
  }

  /** Presses keys in turn on the board, by their places on the keyboard, handing the shell each command. */
  pressKeys(...codes: readonly string[]): void {
    for (const code of codes) {
      const press = {
        code,
        key: code,
        repeat: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      };
      for (const command of this.shell.ring().press(press) ?? []) {
        this.shell.boardCommand(command);
      }
    }
  }
}
