// The line of shots a wall game's debug menu plays, held shot by shot till
// it is done or its run, level or depth moves on. An entry of its own, as
// the game's service, in the main chunk, holds one, where the certificates
// load with the menu.

import type { Run } from "../rules/run";

/**
 * Holds a line of shots, each a `C`, as a debug menu plays it, a certificate's or
 * another the game keeps: its shots still to fly, in order, for the run and
 * the level it began, on the field's depth it was found on.
 */
export class CertificateLine<C> {
  private shots: readonly C[] = [];
  private depth = 0;
  private runId = 0;
  private level = 0;

  /** Starts a line: its shots to fly in a run's level, on the field's depth the line was found on. */
  start(
    shots: readonly C[],
    depth: number,
    { id, level }: Pick<Run<unknown>, "id" | "level">,
  ): void {
    this.shots = shots;
    this.depth = depth;
    this.runId = id;
    this.level = level;
  }

  /**
   * Returns the line's next shot, if any, the line dropped once another run
   * or level is in play, or the field takes a depth it wasn't found on, as
   * its shots would miss there.
   */
  next(
    run: Pick<Run<unknown>, "id" | "level">,
    start: { readonly depth: number },
  ): C | undefined {
    if (
      run.id !== this.runId ||
      run.level !== this.level ||
      start.depth !== this.depth
    ) {
      this.shots = [];
    }
    return this.shots[0];
  }

  /**
   * Returns whether the line has a shot still to fly, as {@link next} last
   * left it: so the shot released next, or just released, is the line's.
   */
  playing(): boolean {
    return this.shots.length > 0;
  }

  /** Takes the shot {@link next} gave off the line, as it flew. */
  flew(): void {
    this.shots = this.shots.slice(1);
  }
}
