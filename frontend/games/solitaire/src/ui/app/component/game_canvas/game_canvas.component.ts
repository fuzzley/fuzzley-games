import {
  Component,
  afterRenderEffect,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from "@angular/core";
import { CARD_DECKS } from "@/engine/render/deck/card_deck";
import { chooseTableLayout } from "@/engine/render/layout/board_layouts";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/view/presentation";
import { PhaserCanvasComponent, type SceneSource } from "@fz/phaser/canvas";
import type { HostOptions } from "@fz/phaser/host";
import type { PlayableGame } from "@/engine/tableau/session/playable_game";
import { makeBoardScene } from "../../provider/board_catalog";
import { type GameId, boardLayoutsOf } from "../../provider/game_catalog";
import { skeletonSlots } from "../../model/skeleton_slots";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";
import { GameViewportService } from "@fz/game-ui/viewport";

declare global {
  interface Window {
    /** The running game, exposed to the console in development builds. */
    fsolitaire?: PlayableGame;
  }
}

/**
 * Shows the board of the game on the table, with a skeleton of the board's
 * own layout laid over it while it builds.
 */
@Component({
  selector: "app-game-canvas",
  imports: [PhaserCanvasComponent],
  templateUrl: "./game_canvas.component.html",
  styleUrl: "./game_canvas.component.scss",
})
export class GameCanvasComponent {
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);
  private readonly viewport = inject(GameViewportService);

  private readonly canvas = viewChild.required(PhaserCanvasComponent);

  protected readonly hostOptions: HostOptions = {
    title: "fSolitaire",
    // Shown only until the board applies the player's colour.
    background: DEFAULT_BACKGROUND_COLOR,
  };

  /**
   * The board of the game on the table, which the canvas swaps into the one
   * Phaser game it keeps, so every deal reuses its WebGL context.
   */
  protected readonly board = computed<SceneSource>(() => {
    const { game } = this.catalog.session();
    const gameId = this.catalog.selectedId() as GameId;
    const presentation = this.presentation;
    return () =>
      ({ insets, ready }) =>
        makeBoardScene(gameId, game, { presentation, onReady: ready, insets });
  });

  /** Whether the current game is still building its scene. */
  protected readonly isInitializing = computed(
    () => this.canvas().state() === "loading",
  );

  /** Whether the board is taking long to load, as on a slow connection. */
  protected readonly isSlow = computed(() => this.canvas().slow());

  /** Whether the board couldn't be loaded, or was given up on. */
  protected readonly hasInitializationFailed = computed(
    () => this.canvas().state() === "failed",
  );

  /** Name of the game currently on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  /** What the board is called to assistive technology. */
  protected readonly boardLabel = computed(() => `${this.gameName()} board`);

  /**
   * Where the skeleton draws each pile of the current game, on the grid the
   * screen calls for, so the placeholder has the shape of the board that is
   * about to replace it.
   */
  protected readonly skeletonSlots = computed(() =>
    skeletonSlots(
      chooseTableLayout(
        boardLayoutsOf(this.catalog.selectedEntry),
        this.viewport.formFactor(),
        this.presentation.boardArrangement(),
      ),
    ),
  );

  /**
   * Which side the stock is on, on the screen as it is now, which is the side
   * the chrome on a phone stands opposite.
   */
  private readonly stockSide = computed(
    () => this.presentation.resolvedArrangement().stockSide,
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
    // A change of the stock's side moves the rail on a sideways phone to the
    // other edge without resizing anything, so the board would not otherwise
    // hear of it. Read once the chrome has been drawn on its new side.
    afterRenderEffect({
      read: () => {
        this.stockSide();
        untracked(() => {
          this.canvas().refreshInsets();
        });
      },
    });

    effect((onCleanup) => {
      const { game } = this.catalog.session();
      // Development only: a production global would pin the game in memory.
      if (import.meta.env.DEV) {
        window.fsolitaire = game;
      }
      onCleanup(() => {
        if (window.fsolitaire === game) {
          delete window.fsolitaire;
        }
      });
    });
  }
}
