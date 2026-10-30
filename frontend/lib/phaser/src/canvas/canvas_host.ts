import { DOCUMENT, InjectionToken, inject } from "@angular/core";
import type { HostOptions, MakeScene, PhaserHost } from "../host";

/**
 * Gives a canvas the scene to show: a {@link MakeScene}, or a promise of one,
 * so an app that loads its scene with `import()` keeps it, and Phaser, out of
 * its first download.
 */
export type SceneSource = () => MakeScene | Promise<MakeScene>;

/** Runs the scenes a canvas shows, in one game for the canvas's whole life. */
export interface CanvasHost {
  /**
   * Shows the scene a source makes in place of the one shown, calling
   * `onReady` once it has drawn its first frame, unless another has been
   * shown since; rejects if the source does, or the scene it makes can't be
   * built or mounted.
   */
  show(source: SceneSource, onReady: () => void): Promise<void>;
  /** Reads the insets again, for chrome that moved without the canvas changing size. */
  refreshInsets(): void;
  /** Destroys the game, which frees its WebGL context. */
  destroy(): void;
}

/** Makes the host a canvas runs its scenes in, in the element given. */
export type CreateCanvasHost = (
  parent: HTMLElement,
  options: HostOptions,
) => CanvasHost;

/**
 * Makes a canvas's host. The default loads Phaser only when the canvas first
 * shows a scene; `provideFakePhaserCanvas()`, from `@fz/phaser/testing`,
 * stands in for it in an app's specs.
 */
export const PHASER_CANVAS_HOST = new InjectionToken<CreateCanvasHost>(
  "PHASER_CANVAS_HOST",
  {
    providedIn: "root",
    factory: () => {
      const view = inject(DOCUMENT).defaultView;
      if (!view) throw new Error("A Phaser canvas needs a window");
      return (parent, options) => new LazyPhaserHost(view, parent, options);
    },
  },
);

/** Runs a canvas's scenes in a `PhaserHost`, which it loads, with Phaser, when first asked to show one. */
class LazyPhaserHost implements CanvasHost {
  private host?: PhaserHost;
  /** How many scenes have been asked for, so a slow source can't overtake a later one. */
  private asked = 0;
  private destroyed = false;

  constructor(
    private readonly view: Window,
    private readonly parent: HTMLElement,
    private readonly options: HostOptions,
  ) {}

  async show(source: SceneSource, onReady: () => void): Promise<void> {
    const asked = ++this.asked;
    const [{ PhaserHost }, make] = await Promise.all([
      import("../host"),
      source(),
    ]);
    if (this.destroyed || asked !== this.asked) return;
    this.host ??= new PhaserHost(this.view, this.parent, this.options);
    await this.host.show(make, onReady);
  }

  refreshInsets(): void {
    this.host?.refreshInsets();
  }

  destroy(): void {
    this.destroyed = true;
    this.host?.destroy();
  }
}
