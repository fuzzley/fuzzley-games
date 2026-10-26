import { DOCUMENT } from "@angular/common";
import { DestroyRef, Injectable, inject, signal } from "@angular/core";

/**
 * Times a game in whole seconds, counting only while the page is in view.
 *
 * It counts from the clock's timestamps rather than from ticks, so a pause
 * keeps the part of a second under way, and a busy page that delays a tick
 * loses no time.
 */
@Injectable({ providedIn: "root" })
export class StopwatchService {
  private readonly document = inject(DOCUMENT);

  private readonly secondsState = signal(0);
  private readonly runningState = signal(false);

  /** The time counted before the stretch now under way, in milliseconds. */
  private banked = 0;
  /** When the stretch now under way began, or null while none is. */
  private since: number | null = null;
  private tick: ReturnType<typeof setTimeout> | null = null;

  /** The whole seconds counted. */
  readonly seconds = this.secondsState.asReadonly();

  /**
   * Whether it has been started and not stopped, though it counts only while
   * the page is in view.
   */
  readonly running = this.runningState.asReadonly();

  constructor() {
    const onVisibility = (): void => {
      this.sync();
    };
    this.document.addEventListener("visibilitychange", onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener("visibilitychange", onVisibility);
      this.pause();
    });
  }

  /** Counts on from the time it holds. */
  start(): void {
    this.runningState.set(true);
    this.sync();
  }

  /** Stops counting, and keeps the time counted. */
  stop(): void {
    this.runningState.set(false);
    this.sync();
  }

  /** Stops counting and holds a time, such as a saved game's, or none. */
  reset(seconds = 0): void {
    this.stop();
    this.banked = seconds * 1000;
    this.secondsState.set(seconds);
  }

  /** Counts while it is running and the page is in view, and not otherwise. */
  private sync(): void {
    const counting =
      this.runningState() && this.document.visibilityState !== "hidden";
    if (counting && this.since === null) {
      const since = Date.now();
      this.since = since;
      this.update(since);
    } else if (!counting) {
      this.pause();
    }
  }

  /** Banks the stretch under way, if there is one, and stops the tick. */
  private pause(): void {
    if (this.since !== null) {
      this.banked += Date.now() - this.since;
      this.since = null;
    }
    if (this.tick !== null) clearTimeout(this.tick);
    this.tick = null;
    this.secondsState.set(Math.floor(this.banked / 1000));
  }

  /**
   * Sets the seconds counted in a stretch begun at `since`, and a tick for
   * the next whole one.
   */
  private update(since: number): void {
    const elapsed = this.banked + Date.now() - since;
    this.secondsState.set(Math.floor(elapsed / 1000));
    this.tick = setTimeout(
      () => {
        this.update(since);
      },
      1000 - (elapsed % 1000),
    );
  }
}
