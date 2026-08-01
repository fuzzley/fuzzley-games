import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Klondike } from "@/games/klondike/klondike";
import { makeBoardScene } from "../../provider/board_catalog";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";
import { gameLayoutSpec } from "../../model/game_layout_spec";

declare global {
  interface Window {
    /** The running game, exposed for debugging from the browser console. */
    klondike?: Klondike;
  }
}

/**
 * Hosts the Phaser game canvas and provides a modern loading placeholder overlay during initialization.
 *
 * The game used to boot as a side effect of importing a module from main.ts,
 * which tied its lifetime to module evaluation order rather than to anything
 * visible. Owning it here gives the canvas an owner that is created and torn
 * down with the element it draws into.
 *
 * Which game is on the table is decided by the catalog, not here: this hosts
 * whichever board that game asks for, and rebuilds when the choice changes.
 */
@Component({
  selector: "app-game-canvas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_canvas.component.html",
  styleUrl: "./game_canvas.component.css",
})
export class GameCanvasComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);

  /** Tracks whether the current game is initializing/building its scene. */
  readonly isInitializing = signal<boolean>(true);

  /** Name of the game currently being prepared. */
  readonly gameName = computed(() => this.catalog.selectedEntry?.name ?? "Game");

  /** Skeleton layout spec matching the game currently selected. */
  readonly layoutSpec = computed(() =>
    gameLayoutSpec(this.catalog.selectedId?.() ?? "klondike"),
  );

  /** Array of tableau column indices for grid iterations. */
  readonly tableauColumns = computed(() =>
    Array.from({ length: this.layoutSpec().tableauColumns }, (_, i) => i),
  );

  /** Helper to generate slot iteration arrays in template. */
  range(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  constructor() {
    // One Phaser host per game. Switching games tears the old canvas down and
    // builds a new one, because a board is wired to the game it draws when it
    // is constructed and there is nothing sensible to re-point at a different
    // one mid-flight.
    effect((onCleanup) => {
      const { game } = this.catalog.session();
      this.isInitializing.set(true);

      const onReady = () => {
        this.isInitializing.set(false);
      };

      const klondike = new Klondike(window, this.host.nativeElement, () =>
        makeBoardScene(game, this.presentation, onReady),
      );
      klondike.start();
      window.klondike = klondike;

      onCleanup(() => {
        klondike.destroy();
        if (window.klondike === klondike) {
          delete window.klondike;
        }
      });
    });
  }
}
