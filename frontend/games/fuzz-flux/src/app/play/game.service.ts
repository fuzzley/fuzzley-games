import { Injectable, computed, inject, signal } from "@angular/core";
import { levelAt } from "@fz/core/levels";
import { itemAt } from "@fz/core/records";
import { RunLifecycle } from "@fz/game-ui/run_lifecycle";
import type { ConfirmRequest } from "@fz/ui/confirm";
import type { Game } from "../../rules/board/board";
import { type Square, indexOf, squareOf } from "../../rules/board/cells";
import { fromScreen } from "../../rules/board/orientation";
import type { Hint, Level } from "../../rules/levels/level";
import type { LevelEntry } from "../../rules/levels/levels";
import type { MoveRecord } from "../../rules/move/record";
import { encore } from "../../rules/move/encore";
import { carefulMove } from "../../rules/move/hint";
import { bunchMatesOf, canSwap, goesOff } from "../../rules/move/swap";
import {
  describeCleared,
  describeLevelBegun,
  describeMove,
  describeOver,
} from "../../rules/run/describe";
import {
  type LevelInPlay,
  type Move,
  levelDealt,
  movePlayed,
} from "../../rules/run/saved_game";
import { starsEarned } from "../../rules/run/stars";
import type { BoardPlay } from "../../scene/play_clock";
import type { BoardShape } from "../../view/board/spaces";
import type { Hinting } from "../../view/idle/hint";
import { lowMovesCue, movesLow } from "../../view/idle/low_moves";
import type { BoardCommand } from "../../view/input/commands";
import type { Ring } from "../../view/input/keys";
import type { GameInPlay, Picking } from "../../view/input/picking";
import type {
  Card,
  GridShown,
  RunState,
  WindShown,
} from "../../view/run_state";
import type {
  HeldChange,
  MoveStart,
  PlaySettings,
} from "../../view/timeline/build";
import type { FeelTuning } from "../../view/timeline/feel";
import type { Cleared } from "../../view/timeline/level_end";
import { starsLitAt } from "../../view/timeline/stars_lit";
import type { SoundName } from "../../view/effects/sounds";
import type { SoundCue, Timeline } from "../../view/timeline/timeline";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { DebugService } from "../debug/debug.service";
import { RecordsService } from "../stats/records.service";
import { GAME_LEVELS, GAME_RULES } from "../tokens";
import {
  type Beats,
  cardAt,
  goalsLeftAt,
  hasPassed,
  sameCounts,
  windAt,
} from "./beats";
import { goalsOf, gridOf, runStateOf, windOf } from "./shown";
import type { ViewKit } from "./view_kit";

/** What is lost as a level in progress is left, which each question says. */
const MOVES_LOST = "You'll lose the moves you've made.";

/** What Restart, and Try again before a level's end, ask before the moves made on a level are lost. */
const RESTART_QUESTION: ConfirmRequest = {
  title: "Restart this level?",
  message: MOVES_LOST,
  confirmLabel: "Restart",
  tone: "danger",
};

/** What loading a reported game asks before the moves made on the level in progress are lost, as every game's loader asks it. */
const LOAD_QUESTION: ConfirmRequest = {
  title: "Load this game?",
  message: MOVES_LOST,
  confirmLabel: "Load",
  tone: "danger",
};

/** Returns what playing a level, by its number, asks before the moves made on the level in progress are lost. */
function levelQuestion(level: number): ConfirmRequest {
  const play = `Play level ${String(level)}`;
  return {
    title: `${play}?`,
    message: MOVES_LOST,
    confirmLabel: play,
    tone: "danger",
  };
}

/** What the debug menu's Play the certificate asks before the moves made on the level in play are lost. */
const LINE_QUESTION: ConfirmRequest = {
  title: "Play the certificate?",
  message: MOVES_LOST,
  confirmLabel: "Play the certificate",
  tone: "danger",
};

/** Returns what playing a deal of the level in play, by its number, asks before the moves made on it are lost. */
function dealQuestion(deal: number): ConfirmRequest {
  const play = `Play deal ${String(deal)}`;
  return {
    title: `${play}?`,
    message: MOVES_LOST,
    confirmLabel: play,
    tone: "danger",
  };
}

/** A tap that changes nothing held, as the board stands still. */
const NOTHING_HELD: HeldChange = { up: null, lookers: [], down: null };

/** Describes a move the board plays, and what the bar and the card keep to as it plays. */
interface MoveOnBoard {
  readonly record: MoveRecord;
  /** What each goal asked for as it started. */
  readonly goalsFrom: readonly number[];
  /** The moves left as it started, from which the moves running low are told. */
  readonly movesFrom: number;
  /** The card at the level's end it comes to, or null for a move after which the level plays on. */
  readonly card: Card | null;
  /** The wind as it started, which the bar shows until the gust that turns it sets in, or null for a level with none. */
  readonly windFrom: WindShown | null;
  /** The wind as it leaves it, or null for a level with none. */
  readonly windTo: WindShown | null;
}

/** Describes how a move leaves its level: the encore and the stars of one it cleared, and the card at the level's end; neither for a level that plays on. */
interface Ending {
  readonly cleared: Cleared | null;
  readonly card: Card | null;
}

/** How a move that leaves its level in play ends it: not at all. */
const PLAYS_ON: Ending = { cleared: null, card: null };

/** Describes what the board shows: the play the scene draws, and the move it plays, or null for the board standing still, a tap or a hint. */
interface Showing {
  readonly play: BoardPlay;
  readonly move: MoveOnBoard | null;
}

/**
 * Describes the level on the board, as the view plays it: the view's parts
 * it is played with, the picking and the ring the player's presses and
 * keys play on, the hint's clock, what the board plays and whether its move
 * has rested, the hand and the shell's own sound cues.
 */
interface LevelBoard {
  readonly kit: ViewKit;
  readonly picking: Picking;
  readonly ring: Ring;
  readonly hinting: Hinting;
  showing: Showing;
  /** Whether the move it shows, if any, has come to rest. */
  rested: boolean;
  /** The square of a fuzzball put down in the frame under way, which a move made in it starts by putting down, or null. */
  putDownNow: number | null;
  hand: Timeline | null;
  cues: readonly SoundCue[];
}

/** Returns the squares of a board as the picking and the ring take them, a gap no square of it. */
function shapeOf({ width, height, squares }: GridShown): BoardShape {
  return { width, height, open: squares.map((square) => square !== null) };
}

/**
 * Plays the game: a level as a run, begun on one of its deals, its moves
 * played by the rules once each and handed to the board to play out on the
 * scene's clock, and what the bar, the card and the grid over the board
 * show of it, kept to the beats of that clock.
 *
 * The announcer says a level begun, each move as it is made, and the card
 * at the level's end as it shows; a level taken up as the page loads goes
 * unsaid, since the page is read then.
 *
 * Nothing pauses: with no clock to stop, looking away lands the move in
 * play at once and puts down the fuzzball held, and coming back finds the
 * board at rest. A swap made while a move plays is kept for when the board
 * rests, and a later one takes its place.
 *
 * The board hands it the view's parts (`useView()`) as it makes each
 * scene, before the scene asks for anything; until then it holds the level
 * in play, and the board nothing.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RunLifecycle {
  private readonly levels = inject(GAME_LEVELS);
  private readonly rules = inject(GAME_RULES);
  private readonly records = inject(RecordsService);
  private readonly progress = inject(ProgressService);
  private readonly playerSettings = inject(SettingsService);
  private readonly debug = inject(DebugService);

  private readonly inPlayState = signal<LevelInPlay>(
    this.dealtAnew(itemAt(this.levels, 0)),
  );
  private readonly beatsState = signal<Beats>(
    this.beatsAtRest(this.inPlayState()),
  );

  /** The level on the board, once the board has handed over the view's parts, or null before. */
  private board: LevelBoard | null = null;
  /** The square under the ring the keys move, or null before the board has a ring. */
  private readonly ringState = signal<Square | null>(null);
  /** The square of the fuzzball the board shows held between moves, by its index on the screen, or null. */
  private readonly shownHeld = signal<number | null>(null);
  /** The scene's clock as it last ticked, in milliseconds. */
  private nowMs = 0;
  /**
   * The moves of the line the debug menu plays still to make, each in the
   * screen's frame, and the level in play the last left, on which alone
   * the next is made; or null.
   */
  private line: {
    readonly moves: readonly Move[];
    readonly on: LevelInPlay;
  } | null = null;

  /** The level in play: its level, the seed of its deal, the moves made and the game they leave. */
  readonly inPlay = this.inPlayState.asReadonly();

  /** The board of the game in play as the screen shows it, a new value only as a move is made. */
  private readonly grid = computed(() => gridOf(this.inPlayState().game));

  /** Everything the shell shows of the level in play, a new value as a move is made and at each beat of the board's play. */
  readonly state = computed<RunState>(() =>
    runStateOf(this.inPlayState(), this.grid(), this.beatsState()),
  );

  /** The square under the ring the keys move, which the grid over the board keeps the focus on, or null before the board has a ring. */
  readonly ringSquare = this.ringState.asReadonly();

  /** The square of the fuzzball the board shows held, which the grid over the board marks selected, or null while none shows. */
  readonly heldSquare = computed(() => {
    const held = this.shownHeld();
    return held === null ? null : squareOf(held, this.grid().width);
  });

  /** Where the level stands: in play, cleared, or over, its moves run out. */
  readonly outcome = computed(() => this.inPlayState().game.outcome);

  readonly ended = computed(() => this.outcome() !== "playing");

  /** Whether a level is in play with a move made, which Restart and starting another ask before losing. */
  readonly inProgress = computed(
    () => !this.ended() && this.inPlayState().moves.length > 0,
  );

  /** Whether a level comes after the level in play. */
  readonly hasNextLevel = computed(
    () => this.inPlayState().level.number < this.levels.length,
  );

  /** Whether the card over an ended level has been put away: never, as each card's buttons go on from it. */
  readonly resultClosed = signal(false).asReadonly();

  /** Answers the picking from the level in play, each square in the screen's frame. */
  private readonly answers: GameInPlay = {
    canSwap: (square) => {
      const { game } = this.inPlayState();
      return (
        game.outcome === "playing" &&
        canSwap(game.board, this.boardSquare(square), this.rules.elements)
      );
    },
    goesOff: (square) => {
      const { board } = this.inPlayState().game;
      return goesOff(itemAt(board.pieces, this.boardSquare(square)));
    },
    bunchMatesOf: (square) => {
      const { game } = this.inPlayState();
      return bunchMatesOf(
        game,
        this.screenSquare(square),
        this.rules.elements,
      ).map((mate) => squareOf(mate, this.grid().width));
    },
    movePlays: () => this.movePlays(),
  };

  /**
   * Takes the view's parts as a scene is made, and lays the level in play on
   * its board with them, at rest, every beat of a move it was playing on a
   * board before passed.
   */
  useView(kit: ViewKit): void {
    // Each scene's clock starts from nothing.
    this.nowMs = 0;
    this.beatsState.set(this.beatsAtRest(this.inPlayState()));
    this.layOnBoard(kit, []);
  }

  /** Returns what the board plays: the play the scene draws, a new value as each starts. */
  play(): BoardPlay {
    return this.levelBoard().showing.play;
  }

  /** Returns the picking the board's presses play on, made for the level in play. */
  picking(): Picking {
    return this.levelBoard().picking;
  }

  /** Returns the ring the keys move over the board, made for the level in play. */
  ring(): Ring {
    return this.levelBoard().ring;
  }

  /** Returns the hand's timeline while it shows a teaching level's own first move, or null. */
  hand(): Timeline | null {
    return this.levelBoard().hand;
  }

  /** Returns the shell's own sound cues on the scene's clock, the same list until one is added. */
  cues(): readonly SoundCue[] {
    return this.levelBoard().cues;
  }

  /**
   * Keeps the beats of the board's play by the scene's clock as a frame
   * starts: each goal's count as its flights land, the wind as the gust
   * that turns it sets in, the card at the level's end, and the board's
   * rest after a move, at which it plays the swap kept meanwhile; makes
   * the next move of the debug menu's line, if any, at rest; and shows the
   * hint once the board has rested long enough.
   */
  tick(nowMs: number, playedMs: number): void {
    this.nowMs = nowMs;
    const board = this.levelBoard();
    board.putDownNow = null;
    const { play, move } = board.showing;
    if (move !== null) {
      this.keepBeats(play.timeline, move, playedMs);
      if (!board.rested && hasPassed(play.timeline.restMs, playedMs)) {
        this.rest(board, move);
      }
    }
    if (board.rested) this.playLineOn(board);
    if (
      !this.movePlays() &&
      !this.ended() &&
      board.picking.held === null &&
      board.hinting.hintsAt(nowMs, false, this.feel())
    ) {
      this.showHint(board);
    }
  }

  /** Does what a press or a key on the board asks. */
  boardCommand(command: BoardCommand): void {
    const board = this.levelBoard();
    switch (command.what) {
      case "pick-up":
        this.pickUp(board, command.square, command.mates);
        return;
      case "put-down":
        this.putDown(board, command.square);
        return;
      case "swap":
        this.playMove(board, {
          from: this.screenSquare(command.from),
          to: this.screenSquare(command.to),
        });
        return;
      case "set-off": {
        const square = this.screenSquare(command.square);
        this.playMove(board, { from: square, to: square });
        return;
      }
      case "hint":
        this.hint();
        return;
      case "move-ring":
        this.ringState.set(command.square);
        return;
    }
  }

  /** Moves the ring to a square, as the focus moving there does, once the board has a ring. */
  moveRing(square: Square): void {
    for (const command of this.board?.ring.moveTo(square) ?? []) {
      this.boardCommand(command);
    }
  }

  /** Taps a square, as a click assistive technology makes on its cell does, once the board has a ring. */
  tapSquare(square: Square): void {
    for (const command of this.board?.ring.tapAt(square) ?? []) {
      this.boardCommand(command);
    }
  }

  /** Shows the hint at once, as Hint and H ask, putting down the fuzzball held first; never while a move plays. */
  hint(): void {
    const board = this.board;
    if (board === null || this.ended() || this.movePlays()) return;
    // Asked for, the hint shows whenever the board rests; this starts the
    // wait for the next from now.
    board.hinting.hintsAt(this.nowMs, true, this.feel());
    for (const command of board.picking.putDown()) this.boardCommand(command);
    this.showHint(board);
  }

  /**
   * Lands the move in play at once, and puts down the fuzzball held, as
   * looking away does, since nothing in a level pauses.
   */
  pause(): void {
    const board = this.board;
    if (board === null) return;
    for (const command of board.picking.letGo()) this.boardCommand(command);
    const { play, move } = board.showing;
    board.showing = { play: { ...play, landed: true }, move };
  }

  /** Does nothing: no level pauses, so none goes on. */
  resume(): void {
    // Nothing pauses.
  }

  /**
   * Plays the level again on its deal, asking first once a move is made,
   * and resolves to whether it did.
   */
  async restart(): Promise<boolean> {
    if (!(await this.mayLoseRun(RESTART_QUESTION))) return false;
    const { level, deal } = this.inPlayState();
    // The same deal again stays off the record if it was played off it.
    this.begin(levelDealt(level, deal, this.rules), this.debug.offRecord());
    return true;
  }

  /**
   * Plays the level again on its next deal, as Try again and Play again do,
   * asking first once a move is made, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    if (!(await this.mayLoseRun(RESTART_QUESTION))) return false;
    this.begin(this.dealtAnew(this.inPlayState().level));
    return true;
  }

  /**
   * Plays a level, by its number, on its next deal, as coming back to it
   * does, asking first while one is in progress, and resolves to whether
   * it did.
   */
  async startLevel(level: number): Promise<boolean> {
    if (!(await this.mayLoseRun(levelQuestion(level)))) return false;
    this.begin(this.dealtAnew(levelAt(this.levels, level)));
    return true;
  }

  /** Takes up a level in play a saved game kept, at rest on the board after its last move, on the record unless `offRecord` says, without saying it. */
  takeUp(inPlay: LevelInPlay, offRecord = false): void {
    this.putInPlay(inPlay, offRecord);
  }

  /**
   * Puts a level in play a bug report kept on the board, at rest after its
   * last move, its card shown where the level had ended, asking first once
   * a move is made on the level in progress, and resolves to whether it
   * did. It is played off the record, the moves made on it from here on
   * included.
   */
  async load(inPlay: LevelInPlay): Promise<boolean> {
    if (!(await this.mayLoseRun(LOAD_QUESTION))) return false;
    this.putInPlay(inPlay, true);
    return true;
  }

  /**
   * Plays the level in play again on one of its deals, by its number from
   * 1, off the record, as the debug menu asks, asking first once a move is
   * made, and resolves to whether it did.
   */
  async playDeal(deal: number): Promise<boolean> {
    if (!(await this.mayLoseRun(dealQuestion(deal)))) return false;
    const { level } = this.inPlayState();
    const seed = itemAt(level.data.deals, deal - 1);
    this.begin(levelDealt(level, seed, this.rules), true);
    return true;
  }

  /**
   * Plays the level in play again on its deal, off the record, as the debug
   * menu's Play the certificate asks, asking first once a move is made, and
   * on it a line of moves, each in the screen's frame, one as the board
   * rests from the one before; and resolves to whether it did. The line
   * stops where the rules refuse a move of it, where the player takes over,
   * picking up a fuzzball or making a move, and where anything else changes
   * the level in play.
   */
  async playLine(moves: readonly Move[]): Promise<boolean> {
    if (!(await this.mayLoseRun(LINE_QUESTION))) return false;
    const { level, deal } = this.inPlayState();
    this.begin(levelDealt(level, deal, this.rules), true);
    this.line = { moves, on: this.inPlayState() };
    return true;
  }

  /**
   * Plays the level after the level in play on its next deal, as Next level
   * asks, where there is one, and resolves to whether it did.
   */
  async nextLevel(): Promise<boolean> {
    if (!this.hasNextLevel()) return false;
    return this.startLevel(this.inPlayState().level.number + 1);
  }

  /**
   * Plays one of the shell's own sounds at once, on the scene's clock, as a
   * card's button does: none before the board hands over the view's parts.
   */
  cue(sound: SoundName): void {
    const board = this.board;
    if (board === null) return;
    const cue = { atMs: this.nowMs, sound, cents: 0, volume: 1 };
    board.cues = [...board.cues, cue];
  }

  /** Plays the level after the one just cleared, on its next deal, where there is one. */
  protected override nextStage(): void {
    void this.nextLevel();
  }

  /** Returns a level in play on the deal a level begins on next. */
  private dealtAnew(level: LevelEntry): LevelInPlay {
    return levelDealt(level, this.records.nextDeal(level.data), this.rules);
  }

  /** Puts a level in play, at rest on the board, on the record unless `offRecord` says or the level is still locked, counts it begun, and says so. */
  private begin(inPlay: LevelInPlay, offRecord = false): void {
    this.putInPlay(inPlay, offRecord);
    this.announcer.say(describeLevelBegun(this.state()));
  }

  /**
   * Puts a level in play, at rest on the board, on the record unless
   * `offRecord` says or the level is still locked, and counts it begun;
   * the shell's cues still to play, as the button's that played it, play
   * on.
   */
  private putInPlay(inPlay: LevelInPlay, offRecord = false): void {
    const locked = !this.progress.isOpen(inPlay.level.number);
    this.debug.levelBegun(offRecord || locked);
    this.inPlayState.set(inPlay);
    this.beatsState.set(this.beatsAtRest(inPlay));
    const board = this.board;
    if (board !== null) {
      const toCome = board.cues.filter(({ atMs }) => atMs >= this.nowMs);
      this.layOnBoard(board.kit, toCome);
    }
    this.began();
  }

  /** Returns what the bar and the card show of a level in play at rest: its counts as the rules have them, and the card at its end, if it has ended, every star it earned lit. */
  private beatsAtRest(inPlay: LevelInPlay): Beats {
    const { goalsLeft, movesLeft } = inPlay.game;
    const { card } = this.endingOf(inPlay);
    return {
      goalsLeft,
      movesLow: movesLow(movesLeft, this.feel()),
      card,
      starsLit: card?.what === "cleared" ? card.stars : 0,
      wind: windOf(inPlay.level, inPlay.game),
    };
  }

  /**
   * Lays the level in play on the board, at rest, with the view's parts,
   * and the picking, the ring and the hint's clock made for it, and the
   * shell's cues given; the hint's clock starts now.
   */
  private layOnBoard(kit: ViewKit, cues: readonly SoundCue[]): void {
    const grid = this.grid();
    const shape = shapeOf(grid);
    const { level, moves } = this.inPlayState();
    const picking = new kit.Picking(shape, this.answers);
    const hinting = new kit.Hinting(
      moves.length === 0 ? level.data.hint : null,
    );
    hinting.rests(this.nowMs);
    const ring = new kit.Ring(shape, picking);
    this.ringState.set(ring.square);
    this.shownHeld.set(null);
    this.board = {
      kit,
      picking,
      ring,
      hinting,
      showing: {
        play: this.boardPlay(
          kit,
          grid,
          kit.heldTimelineOf(grid, NOTHING_HELD, this.feel(), this.settings()),
        ),
        move: null,
      },
      rested: true,
      putDownNow: null,
      hand: null,
      cues,
    };
  }

  /**
   * Makes the next move of the debug menu's line, if any, where the level
   * in play is the one its last move left and no fuzzball is held, else
   * drops the line, as it does once the rules refuse a move of it.
   */
  private playLineOn(board: LevelBoard): void {
    const line = this.line;
    if (line === null) return;
    const [next, ...moves] = line.moves;
    if (
      next === undefined ||
      line.on !== this.inPlayState() ||
      board.picking.held !== null
    ) {
      this.line = null;
      return;
    }
    this.playMove(board, next);
    const after = this.inPlayState();
    this.line = after === line.on ? null : { moves, on: after };
  }

  /** Picks up the fuzzball on a square, as the board shows it while no move plays; while one does, it shows as the board rests. */
  private pickUp(
    board: LevelBoard,
    square: Square,
    mates: readonly Square[],
  ): void {
    if (this.movePlays()) return;
    const up = this.screenSquare(square);
    this.showTap(board, {
      up,
      lookers: mates.map((mate) => this.screenSquare(mate)),
      down: board.putDownNow,
    });
    this.shownHeld.set(up);
  }

  /** Puts down the fuzzball the board shows held. */
  private putDown(board: LevelBoard, square: Square): void {
    const down = this.screenSquare(square);
    if (this.shownHeld() !== down) return;
    this.showTap(board, { ...NOTHING_HELD, down });
    this.shownHeld.set(null);
    board.putDownNow = down;
  }

  /** Hands the board a tap between moves to play. */
  private showTap(board: LevelBoard, change: HeldChange): void {
    const grid = this.grid();
    const { kit } = board;
    this.show(board, {
      play: this.boardPlay(
        kit,
        grid,
        kit.heldTimelineOf(grid, change, this.feel(), this.settings()),
      ),
      move: null,
    });
  }

  /**
   * Hands the board a play, the counts of a move it puts away landed at
   * once: a copy still flying to its goal flies on, but its count shows
   * already.
   */
  private show(board: LevelBoard, showing: Showing): void {
    if (board.showing.move !== null) {
      const { goalsLeft } = this.inPlayState().game;
      this.beatsState.update((beats) => ({ ...beats, goalsLeft }));
    }
    board.showing = showing;
  }

  /**
   * Plays a move once, by the rules, says what it did, and hands the board
   * its timeline, a fuzzball put down in the same frame put down as it
   * starts: a move the rules refuse costs nothing and shakes its fuzzballs'
   * heads; a move made keeps what it does to the records, unless the level
   * is played off them, stops the hint's clock, and takes the hand away.
   */
  private playMove(board: LevelBoard, move: Move): void {
    const before = this.inPlayState();
    const grid = this.grid();
    const { inPlay, record } = movePlayed(before, move, this.rules);
    const made = !record.swap.refused;
    const { cleared, card } = made ? this.endingOf(inPlay) : PLAYS_ON;
    this.sayMove(record, before.game, inPlay.game, card);
    const start: MoveStart = {
      grid,
      wind: windOf(before.level, before.game),
      goals: goalsOf(before.game.goals, before.game.goalsLeft),
      held: board.putDownNow,
    };
    const timeline = board.kit.timelineOf(
      record,
      start,
      this.feel(),
      this.settings(),
      cleared,
    );
    this.show(board, {
      play: this.boardPlay(board.kit, grid, timeline),
      move: {
        record,
        goalsFrom: before.game.goalsLeft,
        movesFrom: before.game.movesLeft,
        card,
        windFrom: this.beatsState().wind,
        windTo: windOf(inPlay.level, inPlay.game),
      },
    });
    board.rested = false;
    this.shownHeld.set(null);
    board.putDownNow = null;
    if (!made) return;
    if (!this.debug.offRecord()) this.keepRecords(before, inPlay, card);
    this.inPlayState.set(inPlay);
    board.hinting.moves();
    board.hand = null;
  }

  /** Keeps what a move made does to the records: its level's deal used, if it is the first, and the level cleared, if it clears it. */
  private keepRecords(
    before: LevelInPlay,
    after: LevelInPlay,
    card: Card | null,
  ): void {
    if (before.moves.length === 0) {
      this.records.dealUsed(before.level.data, before.deal);
    }
    if (card?.what === "cleared") this.keepCleared(after.level.data, card);
  }

  /** Keeps a level cleared, as the move that clears it is made: its stars and its moves to spare in its record, and the level after it opened. */
  private keepCleared(
    level: Level,
    { stars, spare }: Extract<Card, { what: "cleared" }>,
  ): void {
    this.records.cleared(level, stars, spare);
    this.progress.recordCleared(level.id);
  }

  /** Returns how a level in play ends: the encore and the stars of one a move cleared, and the card each end shows. */
  private endingOf({ level, game }: LevelInPlay): Ending {
    switch (game.outcome) {
      case "playing":
        return PLAYS_ON;
      case "over":
        return { cleared: null, card: { what: "over" } };
      case "cleared": {
        const stars = starsEarned(level.data, game.movesLeft);
        return {
          cleared: { encore: encore(game, this.rules.elements).record, stars },
          card: { what: "cleared", stars, spare: game.movesLeft },
        };
      }
    }
  }

  /** Keeps the bar's counts and its wind, the card and its stars lit to where a move on the board stands on its timeline, saying the card as it shows. */
  private keepBeats(
    timeline: Timeline,
    move: MoveOnBoard,
    playedMs: number,
  ): void {
    const beats = this.beatsState();
    const goalsLeft = goalsLeftAt(timeline.counts, move.goalsFrom, playedMs);
    const card = cardAt(timeline, move.card, playedMs);
    const starsLit =
      timeline.end === null ? 0 : starsLitAt(timeline.end, playedMs);
    const wind = windAt(timeline, move.windFrom, move.windTo, playedMs);
    if (
      sameCounts(goalsLeft, beats.goalsLeft) &&
      card === beats.card &&
      starsLit === beats.starsLit &&
      wind === beats.wind
    ) {
      return;
    }
    this.beatsState.set({ ...beats, goalsLeft, card, starsLit, wind });
    if (card !== null && beats.card === null) this.sayCard(card);
  }

  /**
   * Says a move as it is made, from the game before it to the game it
   * leaves and the card that ends the level, if any: the moves left among
   * it where it brings them low, as the sound at its rest does.
   */
  private sayMove(
    record: MoveRecord,
    before: Game,
    after: Game,
    card: Card | null,
  ): void {
    const { movesLeft } = after;
    const low = lowMovesCue(
      before.movesLeft,
      { movesLeft, card },
      this.nowMs,
      this.feel(),
    );
    this.announcer.say(
      describeMove(
        record,
        goalsOf(before.goals, before.goalsLeft),
        goalsOf(after.goals, after.goalsLeft),
        low === null ? null : movesLeft,
      ),
    );
  }

  /** Says the card at the level's end, as it shows. */
  private sayCard(card: Card): void {
    const { level, game } = this.inPlayState();
    switch (card.what) {
      case "cleared":
        this.announcer.say(
          describeCleared(level.number, card.stars, card.spare),
        );
        return;
      case "over":
        this.announcer.say(describeOver(goalsOf(game.goals, game.goalsLeft)));
        return;
    }
  }

  /**
   * Takes the board coming to rest after a move: unless the swap was
   * refused, the moves left show low from here, with their sound where the
   * move brought them there, and the hint's clock starts again; then the
   * swap kept while it played plays, or else a fuzzball picked up meanwhile
   * shows held.
   */
  private rest(board: LevelBoard, move: MoveOnBoard): void {
    board.rested = true;
    if (!move.record.swap.refused) {
      const { movesLeft } = this.inPlayState().game;
      const after = { movesLeft, card: move.card };
      const low = lowMovesCue(move.movesFrom, after, this.nowMs, this.feel());
      if (low !== null) board.cues = [...board.cues, low];
      this.beatsState.update((beats) => ({
        ...beats,
        movesLow: movesLow(movesLeft, this.feel()),
      }));
      board.hinting.rests(this.nowMs);
    }
    this.playKept(board);
  }

  /** Plays the swap kept while the move on the board played, or shows a fuzzball picked up meanwhile held. */
  private playKept(board: LevelBoard): void {
    const kept = board.picking.boardRests();
    if (kept.length > 0) {
      for (const command of kept) this.boardCommand(command);
      return;
    }
    const held = board.picking.held;
    if (held === null) return;
    this.pickUp(board, held, this.answers.bunchMatesOf(held));
  }

  /**
   * Shows the hint on the board: the careful player's move, or a teaching
   * level's own first move with the hand, the two fuzzballs hopping.
   */
  private showHint(board: LevelBoard): void {
    const shown = board.hinting.shown(() => this.carefulHint());
    if (shown === null) return;
    const { kit } = board;
    const grid = this.grid();
    this.show(board, {
      play: this.boardPlay(
        kit,
        grid,
        kit.hintTimeline(grid, shown.move, this.feel()),
      ),
      move: null,
    });
    if (shown.hand) {
      board.hand = kit.handTimeline(
        shown.move,
        this.feel(),
        this.settings().motion,
      );
    }
  }

  /** Returns the careful player's move on the game in play, its squares on the screen, or null where it finds none. */
  private carefulHint(): Hint | null {
    const { game } = this.inPlayState();
    const move = carefulMove(game, this.rules.elements, this.rules.wind);
    if (move === null) return null;
    const { width } = this.grid();
    return { from: squareOf(move.from, width), to: squareOf(move.to, width) };
  }

  /** Returns a play of a timeline from the board as it starts, at the player's speed. */
  private boardPlay(
    kit: ViewKit,
    grid: GridShown,
    timeline: Timeline,
  ): BoardPlay {
    return {
      grid,
      timeline,
      feel: kit.pacedFeel(this.feel(), this.settings().speed),
      landed: false,
    };
  }

  /** Returns the feel's numbers each play is built by: the design's, or as the debug menu tunes them. */
  private feel(): FeelTuning {
    return this.debug.tuning.tuning();
  }

  /** Returns how the player has set moves to play: their speed, and whether with Less motion. */
  private settings(): PlaySettings {
    return {
      speed: this.playerSettings.settings().speed,
      motion: this.playerSettings.lessMotion() ? "less" : "full",
    };
  }

  /** Returns whether a move plays on the board, which keeps a swap made meanwhile for when it rests. */
  private movePlays(): boolean {
    return this.board !== null && !this.board.rested;
  }

  /** Returns a square of the screen by its index on the board as the screen shows it. */
  private screenSquare(square: Square): number {
    return indexOf(square, this.grid().width);
  }

  /** Returns the square of the game in play's board, in its own frame, that a square of the screen shows. */
  private boardSquare(square: Square): number {
    return fromScreen(this.inPlayState().game, this.screenSquare(square));
  }

  /** Returns the level on the board, which the scene asks for only once the board has handed over the view's parts. */
  private levelBoard(): LevelBoard {
    if (this.board === null) {
      throw new Error("The board asked for the level before its view's parts.");
    }
    return this.board;
  }
}
