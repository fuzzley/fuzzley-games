// What a wall game's browser keeps of it, each under the game's own key
// and version: its records, how far the player has come, and the run under
// way. Renaming a key loses every player's; what is stored under each, and
// how it is read back, is the game's own, in the rules and readers it
// hands in.

import { type Signal, type WritableSignal, computed } from "@angular/core";
import {
  type IdentifiedLevel,
  clearedOf,
  isOpen as isLevelOpen,
} from "@fz/core/levels";
import type { RunStage } from "@fz/core/run";
import {
  type StoredFields,
  type Unversioned,
  keepSaved,
  storedSignal,
} from "@fz/ui/storage";
import type { Run } from "../rules/run";
import type { RunKeeping, TakenUp } from "../rules/saved_wall";
import {
  type EndedRun,
  type Stats,
  type StatsRules,
  isNewBest,
  statsOf,
  withLevelCleared,
  withRunEnded,
  withRunStarted,
} from "../rules/stats";

/** Says where a wall game keeps an entry: its key, which renaming loses every player's, and the shape it is kept in, a reader dropping any other. */
export interface StoredAt {
  readonly key: string;
  readonly version: number;
}

/**
 * Keeps a wall game's records: its runs, the best run's score, the
 * furthest level reached, and each level's record, as the game keeps a
 * level's, `L`, from what a level cleared brings it, `R`.
 *
 * A game's service extends it, handing it where they are kept, its levels
 * and how a level's record is read and beaten, as it is made in an
 * injection context. Hand it only runs played on the record.
 */
export abstract class StoredStats<L, R extends L> {
  private readonly state: WritableSignal<Stats<L>>;

  /** The records so far. */
  readonly stats: Signal<Stats<L>>;

  protected constructor(
    at: StoredAt,
    levels: readonly IdentifiedLevel[],
    private readonly rules: Pick<
      StatsRules<unknown, L, R>,
      "readLevel" | "merge"
    >,
  ) {
    this.state = storedSignal({
      ...at,
      read: (saved) => statsOf(saved, levels, rules),
    });
    this.stats = this.state.asReadonly();
  }

  /** Counts a run started, as it plays its first round. */
  recordStart(): void {
    this.state.set(withRunStarted(this.state()));
  }

  /**
   * Keeps an ended run's score and the level it reached, and returns whether
   * the score is a new best: more points than any run before, asked before
   * the score is kept.
   */
  recordEnd(run: EndedRun): boolean {
    const newBest = isNewBest(this.state(), run);
    this.state.set(withRunEnded(this.state(), run));
    return newBest;
  }

  /** Keeps what a level cleared brings its record, by the level's id, where it beats any of it. */
  recordLevel(id: string, result: R): void {
    this.state.set(withLevelCleared(this.state(), id, result, this.rules));
  }
}

/**
 * Keeps the levels a wall game's player has cleared, which open the levels
 * after them.
 *
 * A game's service extends it, handing it where they are kept and its
 * levels, as it is made in an injection context. Hand it only levels
 * cleared on the record.
 */
export abstract class StoredProgress {
  private readonly state: WritableSignal<ReadonlySet<string>>;

  /** The ids of the levels cleared. */
  readonly cleared: Signal<ReadonlySet<string>>;

  protected constructor(
    at: StoredAt,
    private readonly levels: readonly IdentifiedLevel[],
  ) {
    this.state = storedSignal({
      ...at,
      read: (saved) => clearedOf(saved?.["cleared"], levels),
      write: (cleared) => ({ cleared: [...cleared] }),
    });
    this.cleared = this.state.asReadonly();
  }

  /** Returns whether a run may start at a level, by its number. */
  isOpen(level: number): boolean {
    return isLevelOpen(this.levels, this.state(), level);
  }

  /** Keeps a level cleared, by its id, which opens the next. */
  recordCleared(id: string): void {
    if (this.state().has(id)) return;
    this.state.update((cleared) => new Set([...cleared, id]));
  }
}

/**
 * Describes what of a wall game its saved game reads, over what it tallies
 * of a level, `T`, and where a round starts, `N`, and how it hands a run
 * kept back: the game's service's.
 */
export interface KeptRun<T, N> {
  /** The run in play. */
  readonly run: Signal<Run<T>>;
  /**
   * Where the level's next round starts: the round in flight's while one
   * flies, so a round is kept as it is released, else the start waiting to
   * be aimed from.
   *
   * The saved game is written again as it changes, as it does when a drop
   * flies the round again, which leaves the run's rounds and stage as they
   * were, or the field takes another depth. Set it in the same turn as
   * `run`, as the round is released or dropped, or the round is kept with
   * the start before it, which storage can't trust, and the run is lost.
   */
  readonly nextStart: Signal<N>;
  /** Whether the run was played off the record, as a debug menu says, so it keeps no records. */
  readonly tuned: Signal<boolean>;
  /** The run's stage, which changes as it pauses, goes on, clears a level or ends. */
  readonly outcome: Signal<RunStage>;
  /** How many runs the game has begun, which changes as a new one starts. */
  readonly runs: Signal<number>;
  /** Takes up a run storage kept, paused, with where its next round starts. */
  takeUp(takenUp: TakenUp<T, N>): void;
}

/** Holds how a wall game's saved game writes a run and reads it back: the game's own readers, over its levels and rules. */
export interface RunReaders<T, N> {
  /**
   * Returns what is kept of a run and where its level's next round starts,
   * or null for a run with nothing to keep, as `saveRun()` says.
   */
  readonly save: (
    run: Run<T>,
    next: N,
    keeping: RunKeeping,
  ) => Unversioned | null;
  /**
   * Returns the run kept, paused, under the id handed, with where its next
   * round starts, or null where it can't be trusted, as `restoreRun()`
   * says.
   */
  readonly restore: (saved: StoredFields, id: number) => TakenUp<T, N> | null;
}

/**
 * Keeps a wall game's run under way, and takes it up again, paused, under
 * the id after the game's own, as it is called, so a reload, even
 * mid-flight, or a phone dropping the tab loses little.
 *
 * It must be called in an injection context, as the app starts, for the
 * run to be taken up. It writes as a round is released or dropped, as the
 * field takes another depth, as the run changes course and as a new one
 * begins, and as the page is hidden or goes away, never frame by frame.
 */
export function keepRun<T, N>(
  at: StoredAt,
  game: KeptRun<T, N>,
  readers: RunReaders<T, N>,
): void {
  const rounds = computed(() => game.run().rounds);
  keepSaved({
    ...at,
    save: () =>
      readers.save(game.run(), game.nextStart(), { tuned: game.tuned() }),
    restore: (saved) => {
      const takenUp = readers.restore(saved, game.run().id + 1);
      if (takenUp) game.takeUp(takenUp);
    },
    track: () => {
      rounds();
      game.outcome();
      game.runs();
      game.nextStart();
    },
  });
}
