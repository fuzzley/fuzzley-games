import {
  type EnvironmentProviders,
  Injectable,
  inject,
  makeEnvironmentProviders,
} from "@angular/core";
import {
  type CanvasHost,
  PHASER_CANVAS_HOST,
  type SceneSource,
} from "../canvas";
import type { HostOptions } from "../host";

/** Says how {@link provideFakePhaserCanvas} answers a canvas. */
export interface FakeCanvasOptions {
  /**
   * Whether a scene is ready as soon as it is shown, once the `show()` that
   * asked has returned, as a real host is never ready inside it; true when
   * not given. Otherwise it waits for its {@link FakeShownScene.ready}.
   */
  readonly readyAtOnce?: boolean;
}

/** Describes a scene a fake host was shown, and lets a spec settle it. */
export interface FakeShownScene {
  /** The source the scene came from, which the fake never calls. */
  readonly source: SceneSource;
  /** Says the scene has drawn its first frame. */
  ready(): void;
  /** Fails the scene, as a source that can't be loaded does. */
  fail(): void;
}

/**
 * Stands in for the host of a `<fz-phaser-canvas>`, recording what it is
 * asked, and loading no Phaser.
 */
export class FakeCanvasHost implements CanvasHost {
  /** The scenes it has been shown, oldest first. */
  readonly shown: FakeShownScene[] = [];
  /** How many times it has been asked to read the insets again. */
  insetsRefreshed = 0;
  /** Whether it has been destroyed. */
  destroyed = false;

  constructor(
    /** The element the canvas gave it to draw in. */
    readonly parent: HTMLElement,
    /** How the canvas asked for its game to be set up. */
    readonly options: HostOptions,
    private readonly readyAtOnce: boolean,
  ) {}

  /** Returns the latest scene it was shown, failing if there is none. */
  get latest(): FakeShownScene {
    const latest = this.shown.at(-1);
    if (!latest) throw new Error("The canvas has shown no scene");
    return latest;
  }

  show(source: SceneSource, onReady: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const scene: FakeShownScene = {
        source,
        ready: () => {
          onReady();
          resolve();
        },
        fail: () => {
          reject(new Error("The scene couldn't be loaded"));
        },
      };
      this.shown.push(scene);
      if (this.readyAtOnce) {
        queueMicrotask(() => {
          scene.ready();
        });
      }
    });
  }

  refreshInsets(): void {
    this.insetsRefreshed++;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

/** Keeps every host the fake canvases in a spec have made. */
@Injectable()
export class FakePhaserCanvas {
  /** Every host made, oldest first; a canvas makes one for its whole life. */
  readonly hosts: FakeCanvasHost[] = [];

  /** Returns the latest host made, failing if there is none. */
  get host(): FakeCanvasHost {
    const host = this.hosts.at(-1);
    if (!host) throw new Error("No canvas has made a host");
    return host;
  }
}

/**
 * Gives every `<fz-phaser-canvas>` a {@link FakeCanvasHost}, so an app's shell
 * is specced without Phaser; a spec reads them from {@link FakePhaserCanvas}.
 */
export function provideFakePhaserCanvas({
  readyAtOnce = true,
}: FakeCanvasOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    FakePhaserCanvas,
    {
      provide: PHASER_CANVAS_HOST,
      useFactory: () => {
        const fake = inject(FakePhaserCanvas);
        return (parent: HTMLElement, options: HostOptions) => {
          const host = new FakeCanvasHost(parent, options, readyAtOnce);
          fake.hosts.push(host);
          return host;
        };
      },
    },
  ]);
}
