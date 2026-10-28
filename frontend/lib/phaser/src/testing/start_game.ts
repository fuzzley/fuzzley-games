import type { Game, Types } from "phaser";

/** Phaser's config for a game a spec starts, but for what the harness sets. */
export type SpecGameConfig = Omit<Types.Core.GameConfig, "type" | "parent">;

/**
 * Starts a WebGL game, drawing on a context that draws nothing, on a parent
 * of its own in the page, and resolves once it has booted, its loop asleep
 * for a spec to step.
 *
 * Call {@link installHeadlessPhaser} first, from the test setup.
 */
export async function startGame(config: SpecGameConfig = {}): Promise<Game> {
  // Imported here, so a test setup can import this entry before it installs
  // what Phaser needs to load in jsdom.
  const { Core, Game, WEBGL } = await import("phaser");
  const parent = document.createElement("div");
  document.body.append(parent);
  const game = new Game({
    banner: false,
    autoFocus: false,
    audio: { noAudio: true },
    ...config,
    type: WEBGL,
    parent,
  });
  await new Promise<void>((resolve) => {
    game.events.once(Core.Events.READY, () => {
      resolve();
    });
  });
  game.loop.sleep();
  return game;
}

/** Destroys a game {@link startGame} started, with its parent. */
export function stopGame(game: Game): void {
  const parent = game.canvas.parentElement;
  game.destroy(true);
  // Phaser tears a game down on its next frame, which only a step brings
  // while the loop sleeps.
  game.step(game.loop.time, 0);
  parent?.remove();
}
