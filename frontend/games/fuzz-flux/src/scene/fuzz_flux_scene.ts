import type { SceneSurroundings } from "@fz/phaser/host";
import { type Viewport, roomInside } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import { Scene } from "phaser";
import { type BoardMetrics, boardMetrics } from "../view/board/metrics";
import type { BoardPalette } from "../view/colors/palette";
import type { GridShown } from "../view/run_state";
import { BoardAtlas } from "./atlas";
import { type BoardPlay, PlayClock } from "./play_clock";

/** What the scene asks of the shell, and tells it. */
export interface FuzzFluxSceneOptions {
  /**
   * Takes the scene's clock as each frame starts, in milliseconds, and how
   * far into its timeline the play last handed over stands on it, by which
   * the shell keeps its beats: the board at rest, each goal's count, the
   * card at a level's end and each star lit on it.
   */
  readonly tick: (nowMs: number, playedMs: number) => void;
  /**
   * Returns what the board plays; a new value starts its timeline as the
   * frame does, and a value the frame has met plays on.
   */
  readonly play: () => BoardPlay;
  /** Returns the colors the board is drawn in; a new value bakes the atlas again. */
  readonly palette: () => BoardPalette;
  /** Takes where the board now lies on the canvas, and the panels beside it. */
  readonly onLayout: (metrics: BoardMetrics) => void;
}

/**
 * Plays a level of Fuzz Flux on the board: keeps the one clock a level
 * plays by, standing the play the shell hands it on it, hands the clock to
 * the shell each frame, and lays the board out to the canvas, its art
 * baked for it.
 */
export class FuzzFluxScene extends Scene {
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** The scene's clock, and where the play the board draws stands on it. */
  private readonly clock = new PlayClock();
  /** The canvas, and the chrome over it, as the board was last measured on it, or null before it first was. */
  private viewport: Viewport | null = null;
  /** How many squares across the board was as it was last measured. */
  private across = 0;
  /** How many squares down. */
  private down = 0;
  /** Where the board lies on the canvas, as it was last laid out. */
  private metrics!: BoardMetrics;
  /** A square's side, and the pixel ratio, as the board was last laid out, which the atlas bakes for. */
  private square!: ArtScale;
  /** Bakes the board's art, in its palette and for its square. */
  private atlas!: BoardAtlas;

  constructor(
    private readonly options: FuzzFluxSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = uniqueSceneKey("fuzz-flux-scene");
    super(key);
    this.key = key;
  }

  /**
   * Lays the board out for the play the shell hands it first, bakes the
   * atlas for it, and says it is ready once it has drawn.
   */
  create(): void {
    const { options } = this;
    this.measure(options.play().grid);
    this.atlas = new BoardAtlas(this, options.palette(), this.square);
    options.onLayout(this.metrics);
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Moves the clock on by the time the frame took, with the play the shell
   * hands it, lays the board out again where the canvas, the chrome or the
   * board changed, bakes the atlas again where the palette or the square
   * changed, and hands the shell the clock.
   */
  override update(_time: number, deltaMs: number): void {
    const { options, clock } = this;
    const play = options.play();
    this.fit(play.grid);
    this.atlas.bakeFor(options.palette(), this.square);
    clock.advance(play, deltaMs);
    options.tick(clock.nowMs, clock.playedMs);
  }

  /** Lays the board out again, and says where, if the canvas, the chrome over it or the board's size changed. */
  private fit(grid: GridShown): void {
    if (
      (canvasChanged(this, this.viewport) ||
        this.viewport?.insets !== this.surroundings.insets() ||
        this.across !== grid.width ||
        this.down !== grid.height) &&
      this.measure(grid)
    ) {
      this.options.onLayout(this.metrics);
    }
  }

  /**
   * Works out where a board lies on the canvas as it now is, and returns
   * whether it laid it out: always the first time, and after it, unless a
   * canvas has no room inside its chrome, as a hidden board's, which keeps
   * the layout it had.
   */
  private measure(grid: GridShown): boolean {
    const first = this.viewport === null;
    this.viewport = viewportOf(this, this.surroundings.insets());
    this.across = grid.width;
    this.down = grid.height;
    const room = roomInside(this.viewport);
    if (!first && (room.width <= 0 || room.height <= 0)) return false;
    this.metrics = boardMetrics(this.viewport, grid.width, grid.height);
    this.square = {
      unit: this.metrics.square,
      pixelRatio: this.viewport.pixelRatio,
    };
    return true;
  }
}

/** Returns what builds a Fuzz Flux scene, for the canvas to show. */
export function makeFuzzFluxScene(
  options: FuzzFluxSceneOptions,
): (surroundings: SceneSurroundings) => FuzzFluxScene {
  return (surroundings) => new FuzzFluxScene(options, surroundings);
}
