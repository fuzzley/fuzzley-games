import { Component, computed, inject, viewChild } from "@angular/core";
import { WallBoardComponent } from "@fz/brick-wall/app/board";
import {
  ComingNextComponent,
  InThisWallComponent,
} from "@fz/brick-wall/app/panels";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  CanvasCardsComponent,
  type SceneSource,
  settledPictures,
} from "@fz/phaser/canvas";
import { cssHex } from "@fz/phaser/color";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import { ROWS_READ, describeBoon, rowsWaiting } from "../../rules/run/describe";
import type { Brick } from "../../rules/wall/wall";
import type { Pictures } from "../../scene/pictures";
import type { WallSceneOptions } from "../../scene/wall_scene";
import { brickColor } from "../../view/colors/brick_colors";
import { showsEveryFigure } from "../bar/figures";
import { CrewAndBoonComponent } from "../panels/crew_and_boon.component";
import { GameService } from "../play/game.service";
import { BoardCardComponent } from "./board_card.component";

/**
 * The keys needed to play, one at a time, which describe the board.
 * Fast-forward and Drop have their own buttons, and How to play lists F and
 * X.
 */
const BOARD_KEYS: readonly string[] = [
  "Left and Right, or A and D: aim. Hold Shift for smaller steps.",
  "Up and Down, or W and S: raise and lower the charge.",
  "Space: shoot.",
  "Esc: cancel the charge, or pause.",
  "P: pause and resume.",
  "Enter: resume, go to the next level, or try again.",
  `R: hear the ${String(ROWS_READ)} lowest rows with bricks in them.`,
];

/**
 * Shows Brick Fuzz Pop's board in the wall games' frame
 * (`<fz-wall-board>`): the wall scene, which it loads once the canvas asks;
 * the panels beside the field where the room spares them (Coming next and
 * In this wall, with the crew and the boon); and the card over the field
 * (`<app-board-card>`), which holds the canvas's own (`<fz-canvas-cards>`),
 * that the board is still loading on a slow connection, or that it
 * couldn't be drawn. The announcer says what happens.
 */
@Component({
  selector: "app-board",
  imports: [
    BoardCardComponent,
    CanvasCardsComponent,
    ComingNextComponent,
    CrewAndBoonComponent,
    InThisWallComponent,
    WallBoardComponent,
  ],
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly board = viewChild.required(WallBoardComponent);

  /** The keys needed to play, which describe the board. */
  protected readonly keys = BOARD_KEYS;

  /** Names the board for the level on it, as "Brick Fuzz Pop, level 6: Zip line". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.level();
    return `Brick Fuzz Pop, level ${String(number)}: ${data.name}`;
  });

  /** Whether the screen is compact, where the field keeps a smaller margin. */
  protected readonly compact = this.viewport.isCompact;

  /**
   * Whether the bar's Rows left says how many rows wait, where the bar
   * shows every figure (`showsEveryFigure()`), so the lintel's count needn't
   * be read.
   */
  protected readonly countShown = computed(() =>
    showsEveryFigure(this.viewport),
  );

  /** How many rows wait over the ceiling, as the lintel says it: "5 rows waiting", or "No rows waiting". */
  protected readonly rowsWaiting = computed(() =>
    rowsWaiting(this.game.rowsLeft()),
  );

  /**
   * Whether the card lies under the lintel: the Ready card, held at its
   * layer's top, so it never covers the count of the rows waiting; every
   * other card lies over the whole field, as tall as a Cleared card needs
   * on a phone on its side.
   */
  protected readonly cardUnderLintel = computed(
    () => this.game.boardCard()?.kind === "ready",
  );

  /** Every kind of brick, in How to play's order, which In this wall lists those of the wall from. */
  protected readonly brickKinds = BRICK_KIND_IDS;

  /** Returns a kind of brick's name and what it does, as In this wall lists it. */
  protected readonly brickKind = brickKind;

  /** Returns a brick's ink as CSS, in the palette the field is drawn in, as Coming next draws the rows waiting. */
  protected readonly inkOf = computed(() => {
    const palette = this.game.palette();
    return (brick: Brick): string => cssHex(brickColor(brick, palette));
  });

  /** What the level in play's jump earns, in two sentences, as Coming next says it. */
  protected readonly jump = computed(() => describeBoon(this.game.levelBoon()));

  /**
   * The pictures of every kind of brick the board last handed the game, as
   * In this wall shows them, or null before the scene has baked. Read only
   * in the panels, which show only where the room spares them, as each
   * bake's are encoded as they are first read.
   */
  protected readonly brickPictures = computed(
    () => this.game.pictures()?.().bricks ?? null,
  );

  /**
   * The pictures of every kind of brick the board last handed the game,
   * while the Ready card shows the kind of brick a level brings in; else,
   * or before the scene has baked, null.
   */
  protected readonly cardPictures = computed(() => {
    const card = this.game.boardCard();
    return card?.kind === "ready" && card.newKind !== null
      ? (this.game.pictures()?.() ?? null)
      : null;
  });

  /**
   * Hands the game the pictures of each bake of the scene's atlas: the
   * first at once, and a later one once the atlas has settled.
   */
  private readonly takePictures = settledPictures<() => Pictures>(
    (pictures) => {
      this.game.onPictures(pictures);
    },
  );

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: WallSceneOptions = {
    tick: (deltaMs, steer) => {
      this.game.tick(deltaMs, steer);
    },
    view: () => this.game.view(),
    waitingX: () => this.game.waitingX(),
    boon: () => this.game.boon(),
    crew: () => this.game.crew(),
    guide: () => this.game.guide(),
    pointerAiming: () => this.game.pointerAiming(),
    palette: () => this.game.palette(),
    shape: () => this.game.shape(),
    motion: () => this.game.motion(),
    sound: () => this.game.sound(),
    onLayout: (metrics) => {
      this.game.onLayout(metrics);
    },
    command: (command) => {
      this.game.fieldCommand(command);
    },
    onPictures: (pictures) => {
      this.takePictures(pictures);
    },
  };

  /** Loads the scene, and Phaser with it, only once the canvas asks, so the shell paints first. */
  protected readonly scene: SceneSource = async () => {
    const { makeWallScene } = await import("../../scene/wall_scene");
    return makeWallScene(this.sceneOptions);
  };

  /** Puts the focus on the board after Angular's next render, as a run begins. */
  focus(options?: FocusOptions): void {
    this.board().focus(options);
  }

  /** Goes on with the paused level, as the Paused card's Resume asks. */
  protected resumeRun(): void {
    this.board().takeFocus();
    this.game.resume();
  }

  /** Goes on to the next level, as the Cleared card's Next level asks. */
  protected nextLevel(): void {
    this.board().takeFocus();
    this.game.nextLevel();
  }

  /** Tries the lost level again, as the Ended card asks. */
  protected tryAgain(): void {
    this.board().takeFocus();
    this.game.tryAgain();
  }

  /** Starts a new game, as the Ended card asks once every level is cleared. */
  protected newGame(): void {
    this.board().takeFocus();
    void this.game.newGame();
  }
}
