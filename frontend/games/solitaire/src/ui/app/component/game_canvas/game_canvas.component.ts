import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { CARD_DECKS } from "@/engine/render/card_deck";
import { PhaserHost } from "@/engine/render/phaser/phaser_host";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { makeBoardScene } from "../../provider/board_catalog";
import { GameId } from "../../provider/game_catalog";
import { skeletonSlots } from "../../model/skeleton_slots";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";

declare global {
  interface Window {
    /** The running game, exposed to the console in development builds. */
    fsolitaire?: PlayableGame;
  }
}

/**
 * How long to wait, generously, for a board to report itself ready before
 * saying it failed.
 */
const BOARD_READY_TIMEOUT_MS = 8_000;

/**
 * Hosts the Phaser game canvas, with a skeleton of the board's own layout
 * shown while it builds.
 *
 * Phaser gets a child element of its own, so it never fights Angular over the
 * loading overlay beside it.
 */
@Component({
  selector: "app-game-canvas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_canvas.component.html",
  styleUrl: "./game_canvas.component.scss",
})
export class GameCanvasComponent {
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);

  private readonly canvasHostRef =
    viewChild.required<ElementRef<HTMLElement>>("canvasHost");

  /**
   * The Phaser game, kept for the component's whole life so every deal reuses
   * its WebGL context, and made on the first deal, once the canvas host exists.
   */
  private host?: PhaserHost;

  /** Whether the current game is still building its scene. */
  protected readonly isInitializing = signal(true);

  /** Whether the board gave up before reporting itself ready. */
  protected readonly hasInitializationFailed = signal(false);

  /** Name of the game currently on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  /**
   * Where the skeleton draws each pile of the current game, so the placeholder
   * has the shape of the board that is about to replace it.
   */
  protected readonly skeletonSlots = computed(() =>
    skeletonSlots(this.catalog.selectedEntry.layout),
  );

  /**
   * What the deck being fetched is called, or null when the table is up to
   * date.
   */
  protected readonly pendingDeckName = computed(() => {
    const pending = this.presentation.pendingCardDeck();
    if (!pending) return null;
    return CARD_DECKS.find((deck) => deck.id === pending)?.name ?? null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.host?.destroy();
    });

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

      const parent = this.canvasHostRef().nativeElement;
      // Untracked, because a board swapped into a running game is built at
      // once, and the settings it reads and follows must not become this
      // effect's: a new deck would deal the game again.
      untracked(() => {
        this.host ??= new PhaserHost(window, parent);
        this.host.show(({ insetTop }) =>
          makeBoardScene(gameId, game, {
            presentation: this.presentation,
            onReady,
            insetTop,
          }),
        );
      });

      // Development only: a production global would pin the game in memory.
      if (import.meta.env.DEV) {
        window.fsolitaire = game;
      }

      onCleanup(() => {
        clearTimeout(timeoutId);
        if (window.fsolitaire === game) {
          delete window.fsolitaire;
        }
      });
    });
  }
}
