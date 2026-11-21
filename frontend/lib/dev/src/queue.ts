// A queue kept in a folder, which the runs of a command wait in so that one
// runs at a time, whichever process starts each: `yarn verify:changed`'s,
// through `./verify.ts`.

import { randomUUID } from "node:crypto";
import {
  closeSync,
  futimesSync,
  mkdirSync,
  openSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, join } from "node:path";
import { setTimeout as sleepFor } from "node:timers/promises";

/**
 * Says how `waitInQueue()` reads the time, waits and keeps marking its
 * place, and what hears it wait, each its own unless a spec hands it
 * another.
 */
export interface QueueIo {
  /** Reads the time, in milliseconds since 1970. */
  readonly now?: () => number;
  /** Resolves once so many milliseconds have passed. */
  readonly sleep?: (ms: number) => Promise<unknown>;
  /** Calls a function every so many milliseconds, and returns what stops it. */
  readonly every?: (ms: number, run: () => void) => () => void;
  /** Hears how many runs joined before it and haven't left, as it starts to wait and each time that changes. */
  readonly onWait?: (ahead: number) => void;
}

/** How often a run marks its place, in milliseconds. */
export const MARK_MS = 5_000;

/** How long a place may go unmarked before the runs behind it pass it over, in milliseconds. */
export const STALE_MS = 60_000;

/** How often a waiting run looks at the places ahead of it, in milliseconds. */
const LOOK_MS = 1_000;

/** How many digits a place's name gives the time it joined, so names sort by it. */
const TIME_DIGITS = 15;

/**
 * Joins a folder's queue, resolves once every run that joined before it has
 * left, and returns the function that leaves it.
 *
 * A run marks its place every few seconds until it leaves, and a place that
 * goes a minute unmarked is passed over and removed, as a run killed where
 * it stood leaves one, but on a look that finds the clock has jumped, as a
 * machine's does when it wakes, until the runs ahead have marked theirs
 * again. Two runs that join within a few milliseconds of each other can each
 * find itself first, and go together.
 */
export async function waitInQueue(
  folder: string,
  { now = Date.now, sleep = sleepFor, every = regularly, onWait }: QueueIo = {},
): Promise<() => void> {
  const joined = String(now()).padStart(TIME_DIGITS, "0");
  const place = join(folder, `${joined}-${randomUUID()}`);
  const mark = (): void => {
    mkdirSync(folder, { recursive: true });
    const file = openSync(place, "a");
    try {
      const seconds = now() / 1000;
      futimesSync(file, seconds, seconds);
    } finally {
      closeSync(file);
    }
  };
  mark();
  const stopMarking = every(MARK_MS, () => {
    try {
      mark();
    } catch {
      // The next mark is seconds away, and a place lasts a minute unmarked.
    }
  });
  const leave = (): void => {
    stopMarking();
    rmSync(place, { force: true });
  };
  try {
    let heard = 0;
    let looked = now();
    for (;;) {
      const at = now();
      const jumped = at - looked > MARK_MS;
      looked = at;
      const ahead = placesAhead(
        folder,
        basename(place),
        jumped ? undefined : at,
      );
      if (ahead === 0) return leave;
      if (ahead !== heard) onWait?.(ahead);
      heard = ahead;
      await sleep(LOOK_MS);
    }
  } catch (error) {
    leave();
    throw error;
  }
}

/**
 * Returns how many places in a folder's queue are ahead of one, by their
 * names, removing those that have gone stale by a time, where given one.
 */
function placesAhead(
  folder: string,
  name: string,
  at: number | undefined,
): number {
  let ahead = 0;
  for (const other of readdirSync(folder)) {
    if (other >= name) continue;
    if (at === undefined) {
      ahead += 1;
      continue;
    }
    const file = join(folder, other);
    // A place removed since the listing reads as stale.
    const marked =
      statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? -Infinity;
    if (at - marked > STALE_MS) rmSync(file, { force: true });
    else ahead += 1;
  }
  return ahead;
}

/** Calls a function every so many milliseconds, without keeping the process alive for it, and returns what stops it. */
function regularly(ms: number, run: () => void): () => void {
  const timer = setInterval(run, ms);
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
