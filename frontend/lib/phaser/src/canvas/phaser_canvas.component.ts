import {
  Component,
  DestroyRef,
  type ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
  viewChild,
} from "@angular/core";
import type { HostOptions } from "../host";
import {
  type CanvasHost,
  PHASER_CANVAS_HOST,
  type SceneSource,
} from "./canvas_host";

/**
 * Says where a canvas's scene is: still loading, ready once it has drawn its
 * first frame, or failed, when its source rejected or it was given up on.
 */
export type CanvasState = "loading" | "ready" | "failed";

/** How long a scene may load before the canvas says it is slow. */
const SLOW_AFTER_MS = 8_000;

/**
 * How long a scene may load before the canvas gives up on it, for a download
 * that hangs; a slow connection can take well over the slow mark.
 */
const GIVE_UP_AFTER_MS = 60_000;

/**
 * Shows a Phaser scene, and each one it is given after it in the same game,
 * with what the app projects as `[fzCanvasPlaceholder]` laid over it until
 * the scene is ready.
 *
 * The canvas is hidden from assistive technology unless `label` names it, as
 * an image; a game played from the keyboard puts its own focusable element
 * around it. Its state is on the element as `data-state` too, and whether it
 * is slow as `data-slow`, for a stylesheet or a check in a browser.
 */
@Component({
  selector: "fz-phaser-canvas",
  host: {
    "[attr.data-state]": "state()",
    "[attr.data-slow]": "slow() || null",
  },
  templateUrl: "./phaser_canvas.component.html",
  styleUrl: "./phaser_canvas.component.scss",
  // Its stylesheet lays out what the app projects, which an emulated one
  // can't reach; every selector in it starts at the element.
  encapsulation: ViewEncapsulation.None,
})
export class PhaserCanvasComponent {
  /** The scene to show; each new one swaps into the same game. */
  readonly scene = input.required<SceneSource>();

  /** How the game is set up, read once, when the canvas first shows a scene. */
  readonly options = input.required<HostOptions>();

  /** What the canvas is called to assistive technology, if anything. */
  readonly label = input<string>();

  /** Where the scene is, starting again at `loading` with each new one. */
  readonly state = linkedSignal<SceneSource, CanvasState>({
    source: this.scene,
    computation: () => "loading",
  });

  /**
   * Whether the scene is taking long enough to load for the app to say so,
   * as it may on a slow connection; it is still loading, not failed.
   */
  readonly slow = linkedSignal<SceneSource, boolean>({
    source: this.scene,
    computation: () => false,
  });

  private readonly createHost = inject(PHASER_CANVAS_HOST);
  private readonly surface =
    viewChild.required<ElementRef<HTMLElement>>("surface");
  private host?: CanvasHost;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.host?.destroy();
    });

    effect((onCleanup) => {
      const source = this.scene();
      let current = true;
      const settle = (state: CanvasState): void => {
        if (!current) return;
        stopTimers();
        this.slow.set(false);
        this.state.set(state);
      };
      const slowTimer = setTimeout(() => {
        if (current) this.slow.set(true);
      }, SLOW_AFTER_MS);
      const giveUpTimer = setTimeout(() => {
        settle("failed");
      }, GIVE_UP_AFTER_MS);
      function stopTimers(): void {
        clearTimeout(slowTimer);
        clearTimeout(giveUpTimer);
      }
      onCleanup(() => {
        current = false;
        stopTimers();
      });

      untracked(() => {
        this.host ??= this.createHost(
          this.surface().nativeElement,
          this.options(),
        );
        this.host
          .show(source, () => {
            settle("ready");
          })
          .catch(() => {
            settle("failed");
          });
      });
    });
  }

  /** Reads the insets again, for chrome that moved without the canvas changing size. */
  refreshInsets(): void {
    this.host?.refreshInsets();
  }
}
