// The shell's part, played for the scene's specs: what the board plays,
// made of a move played by hand, of a board standing still or of parts a
// spec draws, a dark palette beside the art's light one, and a shell that
// hands the scene each and keeps what the scene tells it, the scene run
// for it.

import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import type { FuzzballFace } from "@fz/style/fuzzball";
import {
  type FuzzFluxScene,
  type FuzzFluxSceneOptions,
  makeFuzzFluxScene,
} from "../scene/fuzz_flux_scene";
import type { BoardPlay } from "../scene/play_clock";
import type { Piece } from "../rules/catalog/pieces";
import type { BoardMetrics } from "../view/board/metrics";
import { type BoardPalette, boardPalette } from "../view/colors/palette";
import type { GridShown } from "../view/run_state";
import {
  type PlaySettings,
  heldTimelineOf,
  timelineOf,
} from "../view/timeline/build";
import { FEEL } from "../view/timeline/feel";
import { lookAt } from "../view/timeline/looks";
import type { Look, PieceTrack, Timeline } from "../view/timeline/timeline";
import { ART_PALETTE } from "./art_frames";
import type { MoveFixture } from "./move_fixtures";
import { moveStartOf } from "./shown_board";

/** How the player has set moves to play, unless a spec says: at Normal speed, in full motion. */
const NORMAL: PlaySettings = { speed: "normal", motion: "full" };

/** A dark palette, its roles each a color no other role takes, as the art's light one's are. */
export const DARK: BoardPalette = boardPalette(
  {
    page: "#15181d",
    panel: "#20252c",
    text: "#eef1f5",
    muted: "#a7b0bc",
    warning: "#ffb35c",
  },
  "dark",
);

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

/** A board 3 squares by 3 with nothing on it, which a play a spec draws plays over. */
const BARE_GRID: GridShown = {
  width: 3,
  height: 3,
  squares: Array.from({ length: 9 }, () => ({ piece: null, dust: 0 })),
};

/** Returns the play of a timeline of the parts a spec draws and nothing more, over a bare board 3 squares by 3, at rest from the tap. */
export function drawnPlay(parts: Partial<Timeline>): BoardPlay {
  return {
    grid: BARE_GRID,
    timeline: {
      pieces: [],
      sprites: [],
      effects: [],
      flights: [],
      counts: [],
      dust: [],
      marks: [],
      sounds: [],
      dim: [],
      restMs: 0,
      end: null,
      ...parts,
    },
    feel: FEEL,
    landed: false,
  };
}

/** Returns the track of a piece standing still on the board from the tap, its look a resting one's in the middle square but as a spec changes it. */
export function stillTrackOf(
  piece: Piece,
  look: Partial<Look> = {},
  face: FuzzballFace = "rest",
): PieceTrack {
  return {
    id: piece.id,
    fromMs: 0,
    untilMs: null,
    drawn: piece,
    look: { ...lookAt({ x: 1, y: 1 }), ...look },
    face,
    keys: {},
    becomes: [],
    faces: [],
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
  /** The palette the board is drawn in. */
  colors: BoardPalette = ART_PALETTE;
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
  readonly palette = (): BoardPalette => this.colors;
  readonly onLayout = (metrics: BoardMetrics): void => {
    this.layouts.push(metrics);
  };
}

/** Describes the scene run for a shell. */
export interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<FuzzFluxScene>;
  readonly scene: FuzzFluxScene;
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
  return { shell, run, scene: run.scene };
}

/** Returns where the scene last laid the board out. */
export function layoutOf({ shell }: Board): BoardMetrics {
  const metrics = shell.layouts.at(-1);
  if (metrics === undefined) throw new Error("The board was never laid out.");
  return metrics;
}

/** Hands the scene a play, and draws frames of 16 ms until it stands a time into its timeline, to the frame: one frame at the least. */
export function playTo(board: Board, play: BoardPlay, ms: number): void {
  board.shell.shown = play;
  board.run.advance(Math.max(16, Math.ceil(ms / 16) * 16));
}
