import { SLOW_MS, SLOW_PACE } from "./timing";

/**
 * Keeps the flourishes' time, which is the page's but for a moment slowed,
 * as a wave's last rock goes, after which it runs on behind it: each frame
 * it is handed the page's time and returns the flourishes', which never
 * runs back.
 */
export class FlourishClock {
  /** The page's time at the last frame, or −Infinity before the first. */
  private last = -Infinity;
  /** The flourishes' time at the last frame. */
  private paced = 0;
  /** The page's time the slow ends at, or −Infinity with none. */
  private slowUntil = -Infinity;

  /** Returns the flourishes' time at a frame, from the page's time then: the page's own at the first. */
  at(time: number): number {
    const last = Number.isFinite(this.last) ? this.last : time;
    const slowed = Math.max(0, Math.min(time, this.slowUntil) - last);
    this.paced = Number.isFinite(this.last)
      ? this.paced + time - last - slowed * (1 - SLOW_PACE)
      : time;
    this.last = time;
    return this.paced;
  }

  /** Slows the flourishes from the last frame, for `SLOW_MS` of the page's time; before the first frame, not at all. */
  slow(): void {
    this.slowUntil = this.last + SLOW_MS;
  }

  /** Ends a slow at once, as a new field starts. */
  start(): void {
    this.slowUntil = -Infinity;
  }
}
