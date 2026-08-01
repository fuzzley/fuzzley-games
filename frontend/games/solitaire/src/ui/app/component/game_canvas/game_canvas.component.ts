import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Klondike } from "@/games/klondike/klondike";
import { makeBoardScene } from "../../provider/board_catalog";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";
import { boardLayoutSpec } from "../../provider/board_layout_catalog";

declare global {
  interface Window {
    /** The running game, exposed for debugging from the browser console. */
    klondike?: Klondike;
  }
}

/**
 * Hosts the Phaser game canvas and provides a modern loading placeholder overlay during initialization.
 *
 * The canvas mounts inside a dedicated child element to prevent lifecycle DOM conflicts with Angular's
 * loading placeholder overlay.
 */
@Component({
  selector: "app-game-canvas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_canvas.component.html",
  styleUrl: "./game_canvas.component.css",
})
export class GameCanvasComponent {
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);

  @ViewChild("canvasHost", { static: true })
  protected readonly canvasHostRef!: ElementRef<HTMLElement>;

  /** Tracks whether the current game is initializing/building its scene. */
  readonly isInitializing = signal<boolean>(true);

  /** Name of the game currently being prepared. */
  readonly gameName = computed(
    () => this.catalog.selectedEntry?.name ?? "Klondike",
  );

  /** Table layout spec matching the game currently selected. */
  readonly layoutSpec = computed(() =>
    boardLayoutSpec(this.catalog.selectedId()),
  );

  constructor() {
    effect((onCleanup) => {
      const { game } = this.catalog.session();
      this.isInitializing.set(true);

      let readyFired = false;
      const onReady = () => {
        readyFired = true;
        this.isInitializing.set(false);
      };

      const timeoutId = setTimeout(() => {
        if (!readyFired) {
          this.isInitializing.set(false);
        }
      }, 8000);

      const hostElement = this.canvasHostRef?.nativeElement;
      const klondike = new Klondike(window, hostElement, () =>
        makeBoardScene(game, this.presentation, onReady),
      );
      klondike.start();
      window.klondike = klondike;

      onCleanup(() => {
        clearTimeout(timeoutId);
        klondike.destroy();
        if (window.klondike === klondike) {
          delete window.klondike;
        }
      });
    });
  }
}
