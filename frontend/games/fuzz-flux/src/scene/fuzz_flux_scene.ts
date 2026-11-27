import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type CssRect, type Viewport, roomInside } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  picturesWhenAsked,
  softDisc,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import { type GameObjects, Scene } from "phaser";
import { type BoardMetrics, boardMetrics } from "../view/board/metrics";
import type { BoardPalette } from "../view/colors/palette";
import type { BoardCommand } from "../view/input/commands";
import type { Ring } from "../view/input/keys";
import type { Picking } from "../view/input/picking";
import type { GridShown } from "../view/run_state";
import { type Frame, frameFor, sampleAt } from "../view/timeline/sample";
import type { SoundCue, Timeline } from "../view/timeline/timeline";
import { ATLAS, BoardAtlas } from "./atlas";
import { BoardInput } from "./board_input";
import { BoardSounds } from "./board_sounds";
import { DISC } from "./disc";
import { LAYERS, type Layer } from "./layers";
import { BoardPainter } from "./painters/board_painter";
import { BoardShake } from "./painters/board_shake";
import { EffectsPainter } from "./painters/effects_painter";
import { FlightsPainter } from "./painters/flights_painter";
import { HandPainter } from "./painters/hand_painter";
import { LoosePainter } from "./painters/loose_painter";
import { MarksPainter } from "./painters/marks_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { PiecesPainter } from "./painters/pieces_painter";
import { PuffsPainter } from "./painters/puffs_painter";
import { PICTURE_FRAMES, type Pictures } from "./pictures";
import { type BoardPlay, PlayClock } from "./play_clock";

/** What the scene asks of the shell, and tells it. */
export interface FuzzFluxSceneOptions {
  /**
   * Takes the scene's clock as each frame starts, in milliseconds, and how
   * far into its timeline the play last handed over stands on it, by which
   * the shell keeps its beats: the board at rest, each goal's count, the
   * card at a level's end and each star lit on it. A beat falls in the
   * first frame that stands past it, as a cue at the same moment plays.
   */
  readonly tick: (nowMs: number, playedMs: number) => void;
  /**
   * Returns what the board plays; a new value starts its timeline as the
   * frame does, and a value the frame has met plays on.
   */
  readonly play: () => BoardPlay;
  /** Returns the colors the board is drawn in; a new value bakes the atlas again. */
  readonly palette: () => BoardPalette;
  /** Takes where the board now lies on the canvas, its rect in CSS pixels where the grid over it and its focus ring go, and the panels beside it. */
  readonly onLayout: (metrics: BoardMetrics) => void;
  /** Returns the picking the board's presses play on, the fuzzball held and the move kept, which the shell makes for a level and answers. */
  readonly picking: () => Picking;
  /** Returns the ring the keys move over the board, playing on the picking. */
  readonly ring: () => Ring;
  /** Takes each command a press or a key on the board gives, in turn. */
  readonly command: (command: BoardCommand) => void;
  /**
   * Takes a picture of each piece the bar and How to play show as the atlas
   * bakes, again as it bakes afresh: a function that draws them only once a
   * page shows them.
   */
  readonly onPictures: (pictures: () => Pictures) => void;
  /**
   * Returns where each goal's picture lies on the bar, in CSS pixels from
   * the canvas's top left corner, in the level's order, which a fuzzball's
   * copy flies to; asked each frame, so the same array until a picture
   * moves.
   */
  readonly goals: () => readonly CssRect[];
  /**
   * Returns the hand's timeline showing a move, which the board plays again
   * and again, or null for no hand; a new value plays from its start, and a
   * value the frame has met plays on.
   */
  readonly hand: () => Timeline | null;
  /** Returns whether the player wants sound, as the Sound setting says. */
  readonly sound: () => boolean;
  /**
   * Returns the shell's own cues, such as the low sound's and the card's
   * button's, each at its moment of the scene's clock as the tick hands it,
   * which plays in the frame the clock first stands past it, as the
   * timeline's do as the play passes theirs, so one before the last tick's
   * never plays; asked each frame, so the same array until a cue is added.
   */
  readonly cues: () => readonly SoundCue[];
}

/**
 * Plays a level of Fuzz Flux on the board: keeps the one clock a level
 * plays by, standing the play the shell hands it on it, hands the clock to
 * the shell each frame, plays the timeline's sounds and the shell's as the
 * clock reaches them, and draws the play's timeline as it samples at the
 * moment the play stands at: the squares and their dust, the pieces, the
 * effects, the waves' marks, what flies loose and the copies flying to the
 * goals, the board dimmed and shaken as the timeline has it, and its life
 * between moves beside it, the pieces' blinks and breaths and the hint's
 * hand, on a board laid out to the canvas, its art baked for it, the
 * shell handed pictures of the pieces from it; and reads the player's
 * presses and keys into commands for the shell, a tap hurrying the clock
 * through a level's end.
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

  /** Draws the squares, their dust and the rim. */
  board!: BoardPainter;
  /** Draws the puffs of dust a sweep raises. */
  puffs!: PuffsPainter;
  /** Draws the pieces, a glow and the dimming. */
  pieces!: PiecesPainter;
  /** Draws the rings, the streaks, the bolts and the flash. */
  effects!: EffectsPainter;
  /** Draws the waves' marks. */
  marks!: MarksPainter;
  /** Draws the loose sprites and the fluff. */
  loose!: LoosePainter;
  /** Draws the fuzzballs' copies flying to their goals. */
  flights!: FlightsPainter;
  /** Draws the hint's hand. */
  hand!: HandPainter;
  /** Plays the board's sounds. */
  sounds!: BoardSounds;
  /** Every painter, back to front, which each frame draws. */
  private painters: readonly Painter[] = [];
  /** What the painters draw each frame from, which the scene writes over. */
  private context!: PaintContext;
  /** The timeline the frame's records were made for, which a new one's are made again for. */
  private sampled: Timeline | null = null;
  /** The records the timeline's frames are sampled into. */
  private frame!: Frame;

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
   * atlas for it, makes every painter's images in their layers, back to
   * front, the sound player and the input, hands the shell the board's
   * place and pictures, and says it is ready once it has drawn.
   */
  create(): void {
    const { options } = this;
    const play = options.play();
    this.measure(play.grid);
    this.atlas = new BoardAtlas(this, options.palette(), this.square);
    softDisc(this, DISC.key, DISC.size);
    const layers = this.layers();
    this.board = new BoardPainter(this, layers);
    this.puffs = new PuffsPainter(this, layers.puffs);
    this.pieces = new PiecesPainter(this, layers);
    this.effects = new EffectsPainter(this, layers);
    this.marks = new MarksPainter(this, layers.marks);
    this.loose = new LoosePainter(this, layers.loose);
    this.flights = new FlightsPainter(this, layers.flights);
    this.hand = new HandPainter(this, layers.hand);
    this.painters = [
      this.board,
      this.puffs,
      this.pieces,
      this.effects,
      this.marks,
      this.loose,
      this.flights,
      this.hand,
      new BoardShake(this.cameras.main),
    ];
    this.context = {
      play,
      frame: this.frameOf(play.timeline),
      clock: this.clock,
      metrics: this.metrics,
      pixelRatio: this.square.pixelRatio,
      baked: this.atlas.scale,
      palette: this.atlas.palette,
      goals: options.goals(),
      hand: options.hand(),
    };
    this.sounds = new BoardSounds(this);
    new BoardInput(
      this,
      {
        picking: options.picking,
        ring: options.ring,
        command: options.command,
        metrics: () => this.metrics,
        feel: () => this.context.play.feel,
      },
      this.clock,
    );
    options.onLayout(this.metrics);
    this.handPictures();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Moves the clock on by the time the frame took, with the play the shell
   * hands it, lays the board out again where the canvas, the chrome or the
   * board changed, bakes the atlas again where the palette or the square
   * changed and hands the shell its pictures, hands the shell the clock,
   * plays the sounds whose moments come in the frame, and draws the play
   * as it stands.
   *
   * It makes nothing but on a new play, whose timeline's records it makes
   * once, a new layout or a new palette; the sound player makes a voice
   * for a sound the first times its plays overlap, and Phaser a buffer
   * source for each sound it plays, as Web Audio starts each only once.
   */
  override update(_time: number, deltaMs: number): void {
    const { options, clock } = this;
    const play = options.play();
    this.fit(play.grid);
    if (this.atlas.bakeFor(options.palette(), this.square)) {
      this.handPictures();
    }
    clock.advance(play, deltaMs);
    options.tick(clock.nowMs, clock.playedMs);
    this.sounds.play(options.sound(), play, options.cues(), clock);
    this.draw(play);
  }

  /** Samples the play's timeline at the moment the play stands at, and has each painter draw the frame in its layer. */
  private draw(play: BoardPlay): void {
    const { context } = this;
    context.play = play;
    context.frame = sampleAt(
      play.timeline,
      play.feel,
      this.clock.playedMs,
      this.frameOf(play.timeline),
    );
    context.metrics = this.metrics;
    context.pixelRatio = this.square.pixelRatio;
    context.baked = this.atlas.scale;
    context.palette = this.atlas.palette;
    context.goals = this.options.goals();
    context.hand = this.options.hand();
    this.painters.forEach(this.paint);
  }

  /** Has a painter draw the frame: made once, so the frame's round of the painters makes nothing. */
  private readonly paint = (painter: Painter): void => {
    painter.draw(this.context);
  };

  /** Returns the records a timeline's frames are sampled into: those made for it, or new ones for a new timeline. */
  private frameOf(timeline: Timeline): Frame {
    if (timeline !== this.sampled) {
      this.sampled = timeline;
      this.frame = frameFor(timeline);
    }
    return this.frame;
  }

  /** Hands the shell the pictures of the pieces, as the atlas last baked them. */
  private handPictures(): void {
    this.options.onPictures(picturesWhenAsked(this, ATLAS, PICTURE_FRAMES));
  }

  /** Returns a layer for each entry of the list, made back to front. */
  private layers(): Readonly<Record<Layer, GameObjects.Layer>> {
    return recordOf(LAYERS, () => this.add.layer());
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
