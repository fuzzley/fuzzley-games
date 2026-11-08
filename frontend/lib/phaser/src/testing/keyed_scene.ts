import { onTestFinished } from "vitest";
import type { HostedScene, SceneSurroundings } from "../host";
import { type SceneRun, type SceneRunOptions, runScene } from "./run_scene";

/** A scene run whose keyboard listens on an element of its own, as a board's does. */
export interface KeyedSceneRun<S extends HostedScene> {
  readonly run: SceneRun<S>;
  /** The element Phaser's keyboard listens on, which takes the focus. */
  readonly keys: HTMLElement;
}

/**
 * Runs a scene as a board shows one, Phaser's keyboard listening on an
 * element of the page that takes the focus, and destroys the run and removes
 * the element once the test that ran it finishes.
 */
export async function runKeyedScene<S extends HostedScene>(
  make: (surroundings: SceneSurroundings) => S,
  options: Omit<SceneRunOptions, "config"> = {},
): Promise<KeyedSceneRun<S>> {
  const keys = document.createElement("div");
  keys.tabIndex = 0;
  document.body.append(keys);
  onTestFinished(() => {
    keys.remove();
  });
  const run = await runScene(make, {
    ...options,
    config: { input: { keyboard: { target: keys } } },
  });
  onTestFinished(() => {
    run.destroy();
  });
  return { run, keys };
}
