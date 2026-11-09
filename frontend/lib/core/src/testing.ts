/** How long a frame of a board takes, at 60 a second. */
export const FRAME_MS = 1000 / 60;

/** The most frames a spec plays for something to happen: a minute's at 60 a second. */
const PLAY_LIMIT_FRAMES = 3600;

/**
 * Describes a game a spec plays a frame at a time: it moves on by a frame's
 * time, steered as it is told.
 *
 * `tick` is a property, not a method, so the steer a game takes is checked
 * one way, as a function's parameter is, not both ways, as a method's is.
 */
interface Ticking<Steer> {
  readonly tick: (ms: number, steer: Steer) => void;
}

/**
 * Ticks a game a frame at a time, steered as a rule says, until something
 * comes to pass, failing past a minute's frames.
 *
 * What the game steers by is read from its `tick` alone, never from the rule,
 * so a rule that leaves part of it out is refused.
 */
export function playUntil<Game, Steer>(
  game: Game & Ticking<Steer>,
  steer: NoInfer<(game: Game) => Steer>,
  done: () => boolean,
  frameMs = FRAME_MS,
): void {
  for (let frame = 0; !done(); frame++) {
    if (frame > PLAY_LIMIT_FRAMES) throw new Error("It never came to pass.");
    game.tick(frameMs, steer(game));
  }
}

/**
 * Ticks a game a frame at a time for a while, steered the same way
 * throughout.
 *
 * What the game steers by is read from its `tick` alone, never from the
 * steer, so a steer that leaves part of it out is refused.
 */
export function playFor<Steer>(
  game: Ticking<Steer>,
  ms: number,
  steer: NoInfer<Steer>,
): void {
  for (let played = 0; played < ms; played += FRAME_MS) {
    game.tick(FRAME_MS, steer);
  }
}
