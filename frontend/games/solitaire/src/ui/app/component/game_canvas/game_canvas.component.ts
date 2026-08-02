import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { PhaserHost } from "@/engine/render/phaser/phaser_host";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { makeBoardScene } from "../../provider/board_catalog";
import { GameId } from "../../provider/game_catalog";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";

declare global {
  interface Window {
    /**
     * The running game, exposed for poking at from the browser console.
     * Development builds only — see the effect below.
     */
    fsolitaire?: PlayableGame;
  }
}

/**
 * How long to wait for a board to report itself ready before saying so.
 *
 * Generous: the atlas is a few hundred kilobytes and a cold load on a slow
 * connection is legitimately slow. This is the point past which silence is
 * more likely to be a broken board than a slow one, and a player deserves to
 * be told rather than left watching a spinner.
 */
const BOARD_READY_TIMEOUT_MS = 8_000;

/**
 * Hosts the Phaser game canvas, with a skeleton of the board's own layout
 * shown while it builds.
 *
 * The canvas mounts inside a dedicated child element so Phaser owns that
 * subtree outright and never fights Angular over the loading overlay beside
 * it.
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

  private readonly canvasHostRef =
    viewChild.required<ElementRef<HTMLElement>>("canvasHost");

  /** Whether the current game is still building its scene. */
  protected readonly isInitializing = signal(true);

  /** Whether the board gave up before reporting itself ready. */
  protected readonly hasInitializationFailed = signal(false);

  /** Name of the game currently on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  /**
   * The grid the current game lies on, which the skeleton mirrors so the
   * placeholder has the shape of the board that is about to replace it.
   */
  protected readonly layoutSpec = computed(
    () => this.catalog.selectedEntry.layout,
  );

  constructor() {
    effect((onCleanup) => {
      const { game } = this.catalog.session();
      const gameId = this.catalog.selectedId() as GameId;
      this.isInitializing.set(true);
      this.hasInitializationFailed.set(false);

      let readyFired = false;
      const onReady = () => {
        readyFired = true;
        this.isInitializing.set(false);
      };

      const timeoutId = setTimeout(() => {
        if (!readyFired) {
          this.hasInitializationFailed.set(true);
          this.isInitializing.set(false);
        }
      }, BOARD_READY_TIMEOUT_MS);

      const host = new PhaserHost(
        window,
        this.canvasHostRef().nativeElement,
        () => makeBoardScene(gameId, game, this.presentation, onReady),
      );
      host.start();

      // A console handle on the running game, for development only: a
      // production bundle should not ship a global that pins the whole game
      // object in memory and invites tinkering.
      if (import.meta.env.DEV) {
        window.fsolitaire = game;
      }

      onCleanup(() => {
        clearTimeout(timeoutId);
        host.destroy();
        if (window.fsolitaire === game) {
          delete window.fsolitaire;
        }
      });
    });
  }
}
