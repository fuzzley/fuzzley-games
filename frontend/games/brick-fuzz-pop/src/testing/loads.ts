import type { Type } from "@angular/core";
import type { ComponentLoad } from "../app/tokens";

/** A load of a component that a spec holds, as a slow connection holds a chunk. */
export interface HeldLoad {
  /** Starts a load, which waits until the spec lets it arrive or fail. */
  readonly load: ComponentLoad;
  /** Hands the component over to the earliest load still waiting. */
  readonly arrive: () => void;
  /** Fails the earliest load still waiting, as a chunk that can't be fetched does. */
  readonly fail: () => void;
}

/** The error a held load fails with. */
export const OFFLINE = new Error("Offline");

/**
 * Returns a load of `component` that waits, each time it is started, until
 * the spec lets it arrive or fail, so a spec sees what shows while a chunk
 * is on its way, and what follows when it can't be fetched.
 */
export function heldLoad(component: Type<unknown>): HeldLoad {
  const waiting: {
    readonly resolve: (component: Type<unknown>) => void;
    readonly reject: (error: unknown) => void;
  }[] = [];
  return {
    load: () =>
      new Promise((resolve, reject) => {
        waiting.push({ resolve, reject });
      }),
    arrive: () => {
      waiting.shift()?.resolve(component);
    },
    fail: () => {
      waiting.shift()?.reject(OFFLINE);
    },
  };
}
