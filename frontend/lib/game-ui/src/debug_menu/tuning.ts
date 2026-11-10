import { type Signal, computed, signal } from "@angular/core";
import { keysOf } from "@fz/core/records";

/** Describes the numbers a game's debug menu tunes, by name: each a number, or a switch. */
export type TunedValues<T> = { readonly [K in keyof T]: number | boolean };

/**
 * Holds a game's tuned numbers as its debug menu sets them, says whether
 * they are off the game's own, and tells whoever listens of each change.
 */
export interface Tuning<T extends TunedValues<T>> {
  /** The numbers in use: the game's own until the debug menu tunes them. */
  readonly tuning: Signal<T>;
  /** Whether any number is off the game's own. */
  readonly retuned: Signal<boolean>;
  /** Tunes one number, and tells each listener at once. */
  tune<K extends keyof T>(id: K, value: T[K]): void;
  /** Puts every number back to the game's own, and tells each listener at once. */
  reset(): void;
  /**
   * Has a function hear each change as soon as it is made, before the
   * numbers are read again, and returns a function that stops it.
   */
  onTune(listener: () => void): () => void;
}

/**
 * Returns what holds a game's tuned numbers, starting at its own, `tuned`,
 * and kept nowhere, as they tune the player's own game only.
 *
 * A game that steps its field with them hears each change through
 * `onTune()` rather than an effect, which runs later, so no frame is
 * stepped on the old numbers.
 */
export function createTuning<T extends TunedValues<T>>(tuned: T): Tuning<T> {
  const state = signal(tuned);
  const listeners = new Set<() => void>();
  const tell = (): void => {
    for (const listener of listeners) listener();
  };
  return {
    tuning: state.asReadonly(),
    retuned: computed(() => {
      const now = state();
      return keysOf<keyof T & string>(tuned).some(
        (id) => now[id] !== tuned[id],
      );
    }),
    tune(id, value) {
      state.update((now) => ({ ...now, [id]: value }));
      tell();
    },
    reset() {
      state.set(tuned);
      tell();
    },
    onTune(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
