import { Injectable, computed, signal } from "@angular/core";
import { TUNED, type Tuning, isRetuned } from "../../view/debug_tuning";

/**
 * Holds the numbers that set the feel as the debug menu tunes them, which
 * the field in play and every one after take: `tuning.ts`'s until it tunes
 * them, and kept nowhere, as they tune the player's own game only.
 */
@Injectable({ providedIn: "root" })
export class TuningService {
  private readonly tuningState = signal(TUNED);
  /** What hears each tuning as soon as it is made. */
  private readonly listeners = new Set<() => void>();

  /** The numbers that set the feel: `tuning.ts`'s until the debug menu tunes them. */
  readonly tuning = this.tuningState.asReadonly();

  /**
   * Whether the numbers are off `tuning.ts`'s, so a run whose field is
   * stepped with them keeps no records.
   */
  readonly retuned = computed(() => isRetuned(this.tuning()));

  /** Tunes some of the numbers, as the debug menu does, and tells each listener at once. */
  tune(change: Partial<Tuning>): void {
    this.tuningState.update((tuning) => ({ ...tuning, ...change }));
    for (const listener of this.listeners) listener();
  }

  /** Puts the numbers back to `tuning.ts`'s. */
  reset(): void {
    this.tune(TUNED);
  }

  /**
   * Has a function hear each tuning as soon as it is made, before the
   * numbers are read again, and returns a function that stops it.
   */
  onTune(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
