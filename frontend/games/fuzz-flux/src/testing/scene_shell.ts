// The shell's part, played for the scene's specs: what the board plays,
// made of a move played by hand or of a board standing still, and a shell
// that hands the scene each and keeps what the scene tells it, the scene
// run for it.

import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import {
  type FuzzFluxScene,
  type FuzzFluxSceneOptions,
  makeFuzzFluxScene,
} from "../scene/fuzz_flux_scene";
import type { BoardPlay } from "../scene/play_clock";
import type { BoardMetrics } from "../view/board/metrics";
import type { GridShown } from "../view/run_state";
import {
  type PlaySettings,
  heldTimelineOf,
  timelineOf,
} from "../view/timeline/build";
import { FEEL } from "../view/timeline/feel";
import type { MoveFixture } from "./move_fixtures";
import { moveStartOf } from "./shown_board";

/** How the player has set moves to play, unless a spec says: at Normal speed, in full motion. */
const NORMAL: PlaySettings = { speed: "normal", motion: "full" };

/** Returns the play of a move played by hand, on its board, at the design's feel, as the player has set moves to play. */
export function playOf(
  fixture: MoveFixture,
  settings: PlaySettings = NORMAL,
): BoardPlay {
  const start = moveStartOf(fixture);
  return {
    grid: start.grid,
    timeline: timelineOf(fixture.record, start, FEEL, settings, null),
    feel: FEEL,
    landed: false,
  };
}

/** Returns the play of a board standing still, as it rests between moves. */
export function stillPlayOf(grid: GridShown): BoardPlay {
  return {
    grid,
    timeline: heldTimelineOf(
      grid,
      { up: null, lookers: [], down: null },
      FEEL,
      NORMAL,
    ),
    feel: FEEL,
    landed: false,
  };
}

/** Describes a frame's clock, as the scene handed it to the shell. */
interface Tick {
  readonly nowMs: number;
  readonly playedMs: number;
}

/** Plays the shell's part, handing the scene what a spec sets and keeping what the scene tells it. */
export class FakeShell implements FuzzFluxSceneOptions {
  /** The play the board draws. */
  shown: BoardPlay;
  /** The chrome over the canvas. */
  chrome: Insets = NO_INSETS;
  readonly ticks: Tick[] = [];
  readonly layouts: BoardMetrics[] = [];

  /** Starts with a move played by hand's board standing still. */
  constructor(fixture: MoveFixture) {
    this.shown = stillPlayOf(moveStartOf(fixture).grid);
  }

  readonly tick = (nowMs: number, playedMs: number): void => {
    this.ticks.push({ nowMs, playedMs });
  };
  readonly play = (): BoardPlay => this.shown;
  readonly onLayout = (metrics: BoardMetrics): void => {
    this.layouts.push(metrics);
  };
}

/** Describes the scene run for a shell. */
export interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<FuzzFluxScene>;
}

/** Describes the canvas a board runs on, in pixels, at one to a CSS pixel. */
export interface Canvas {
  readonly width: number;
  readonly height: number;
}

/**
 * Runs the scene for a shell on a move played by hand's board, set up as a
 * spec says, on a canvas 400 pixels square unless given another, until the
 * test finishes, and draws its first frame; the chrome over the canvas is
 * the shell's to change as it runs.
 */
export async function startBoard(
  fixture: MoveFixture,
  setUp: (shell: FakeShell) => void = () => undefined,
  canvas: Canvas = { width: 400, height: 400 },
): Promise<Board> {
  const shell = new FakeShell(fixture);
  setUp(shell);
  const make = makeFuzzFluxScene(shell);
  const run = await runScene(
    (surroundings) => make({ ...surroundings, insets: () => shell.chrome }),
    canvas,
  );
  onTestFinished(() => {
    run.destroy();
  });
  run.advance(16);
  return { shell, run };
}
