import { Component, computed, inject, viewChild } from "@angular/core";
import { WallBoardComponent } from "@fz/brick-wall/app/board";
import type { Nudge } from "@fz/brick-wall/view/aiming";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  CanvasCardsComponent,
  type SceneSource,
  settledPictures,
} from "@fz/phaser/canvas";
import { CALL_WORDS, ROWS_READ, rowsWaiting } from "../../rules/run/describe";
import type { Pictures } from "../../scene/pictures";
import type {
  RickashayScene,
  RickashaySceneOptions,
} from "../../scene/rickashay_scene";
import { CALL_MS } from "../../view/effects/timing";
import { showsEveryFigure } from "../bar/figures";
import { GameService } from "../play/game.service";
import { BoardCardComponent } from "./board_card.component";

/**
 * The keys needed to play, one at a time, which describe the board, eight
 * at most. Fast-forward and Skip have their own buttons in the bar, which
 * leaves F and X out.
 */
const BOARD_KEYS: readonly string[] = [
  "Left and Right, or A and D: aim. Hold Shift for smaller steps.",
  "Space: release the shot.",
  "G: hear where the guide goes.",
  `R: hear the ${String(ROWS_READ)} lowest rows with bricks in them.`,
  "Esc: pause.",
  "P: pause and resume.",
  "Enter: resume, go to the next level, or try again.",
];

/**
 * Shows Rickashay's board in the wall games' frame (`<fz-wall-board>`): the
 * scene, which it loads once the canvas asks; the "Rickashay!" call over
 * the field as a flight reaches the level's rally mark, hidden from
 * assistive technology, since the announcer says it, and moving across
 * the field only where motion is welcome; and the card over the field
 * (`<app-board-card>`), which holds the canvas's own
 * (`<fz-canvas-cards>`), that the board is still loading on a slow
 * connection, or that it couldn't be drawn. The announcer says what
 * happens.
 */
@Component({
  selector: "app-board",
  imports: [BoardCardComponent, CanvasCardsComponent, WallBoardComponent],
  templateUrl: "./board.component.html",
  styleUrl: "./board.component.scss",
})
export class BoardComponent {
  protected readonly game = inject(GameService);
  private readonly viewport = inject(GameViewportService);
  private readonly board = viewChild.required(WallBoardComponent);

  /** The keys needed to play, which describe the board. */
  protected readonly keys = BOARD_KEYS;

  /** Names the board for the level on it, as "Rickashay, level 12: Trapdoor". */
  protected readonly label = computed(() => {
    const { number, data } = this.game.level();
    return `Rickashay, level ${String(number)}: ${data.name}`;
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
   * other card lies over the whole field.
   */
  protected readonly cardUnderLintel = computed(
    () => this.game.boardCard()?.kind === "ready",
  );

  /** The call showing over the field, one at most, each made afresh so it moves from the start. */
  protected readonly calls = computed(() => {
    const call = this.game.call();
    return call === null ? [] : [call];
  });

  /** How long the call shows, as its animation takes it. */
  protected readonly callTime = `${String(CALL_MS)}ms`;

  /** The call's words. */
  protected readonly callWords = CALL_WORDS;

  /** Whether the player welcomes motion, where the call moves across the field. */
  protected readonly moving = this.viewport.allowsMotion;

  /**
   * The pictures of each drawn kind of brick the board last handed the
   * game, while the Ready card shows the kind of brick a level brings in;
   * else, or before the scene has baked, null.
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

  /** The scene the canvas made, whose steering the bar's Nudges and Release move, or null before it has made one. */
  private made: RickashayScene | null = null;
  /** Whether the scene made has laid its field out, its steering made with it. */
  private steerable = false;

  /** What the scene is handed: plain functions over the game. */
  private readonly sceneOptions: RickashaySceneOptions = {
    tick: (deltaMs, aim) => {
      this.game.tick(deltaMs, aim);
    },
    view: () => this.game.view(),
    pointerAiming: () => this.game.pointerAiming(),
    pointerRelease: () => this.game.pointerRelease(),
    palette: () => this.game.palette(),
    shape: () => this.game.shape(),
    rules: () => this.game.fieldRules(),
    guide: () => this.game.guide(),
    motion: () => this.game.motion(),
    sound: () => this.game.sound(),
    onLayout: (metrics) => {
      this.steerable = true;
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
    const { makeRickashayScene } = await import("../../scene/rickashay_scene");
    const make = makeRickashayScene(this.sceneOptions);
    return (surroundings) => {
      this.steerable = false;
      return (this.made = make(surroundings));
    };
  };

  /** Turns the aim a quarter of a degree, as a Nudge in the bar asks, once the scene has laid its field out. */
  nudge(toward: Nudge): void {
    if (this.steerable) this.made?.steering.nudge(toward);
  }

  /** Lets the shot aimed fly, as the bar's Release asks, once the scene has laid its field out. */
  releaseShot(): void {
    if (this.steerable) this.made?.steering.release();
  }

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
