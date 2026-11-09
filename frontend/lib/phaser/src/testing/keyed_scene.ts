import { onTestFinished } from "vitest";
import type { HostedScene, SceneSurroundings } from "../host";
import type { FakePhaserCanvas } from "./fake_canvas";
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

/**
 * Runs the scene a fake canvas was last shown, as Phaser would, its keyboard
 * listening on the board's element, and destroys the run once the test that
 * ran it finishes.
 *
 * It draws no frame: the spec steps the first itself, at its game's pace.
 */
export async function runShownScene(
  fake: FakePhaserCanvas,
  board: HTMLElement,
  options: Omit<SceneRunOptions, "config"> = {},
): Promise<SceneRun<HostedScene>> {
  let run: SceneRun<HostedScene> | null = null;
  // Registered first, so a call outside a test, as from a beforeAll, throws
  // before it makes a scene.
  onTestFinished(() => {
    run?.destroy();
  });
  const make = await fake.host.latest.source();
  run = await runScene(make, {
    ...options,
    config: { input: { keyboard: { target: board } } },
  });
  return run;
}
