import { randomSeed } from "./random";

/** Describes what a new run is told apart by and played from. */
export interface RunNumber {
  /** The run's own number, past every run's before it. */
  readonly id: number;
  /** The seed everything random in the run is drawn from. */
  readonly seed: number;
}

/**
 * Numbers a game's new runs, each past every run before it, those taken up
 * among them, and draws each a seed of its own.
 */
export class RunNumbers {
  /** The id the last run took, which the next one follows. */
  private lastId = 0;

  /** Starts before the first run, drawing each new run's seed from a source. */
  constructor(private readonly random: () => number) {}

  /** Returns a new run's id, one past the last, and its seed, the source's next draw. */
  next(): RunNumber {
    return { id: ++this.lastId, seed: randomSeed(this.random) };
  }

  /** Notes the id of a run taken up, so that every new run's id passes it. */
  takeUp(id: number): void {
    this.lastId = Math.max(this.lastId, id);
  }
}
