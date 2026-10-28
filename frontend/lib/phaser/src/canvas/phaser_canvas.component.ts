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
 * first frame, or failed, when its source rejected or it wasn't ready in
 * time.
 */
export type CanvasState = "loading" | "ready" | "failed";

/** How long a scene has to say it is ready before the canvas says it failed. */
const READY_TIMEOUT_MS = 8_000;

/**
 * Shows a Phaser scene, and each one it is given after it in the same game,
 * with what the app projects as `[fzCanvasPlaceholder]` laid over it until
 * the scene is ready.
 *
 * The canvas is hidden from assistive technology unless `label` names it, as
 * an image; a game played from the keyboard puts its own focusable element
 * around it. Its state is on the element as `data-state` too, for a
 * stylesheet or a check in a browser.
 */
@Component({
  selector: "fz-phaser-canvas",
  host: { "[attr.data-state]": "state()" },
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
      const timeout = setTimeout(() => {
        if (current) this.state.set("failed");
      }, READY_TIMEOUT_MS);
      const settle = (state: CanvasState): void => {
        if (!current) return;
        clearTimeout(timeout);
        this.state.set(state);
      };
      onCleanup(() => {
        current = false;
        clearTimeout(timeout);
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
