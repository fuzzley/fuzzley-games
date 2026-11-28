import { TestBed } from "@angular/core/testing";
import { isRecord } from "@fz/core/json";
import { itemAt } from "@fz/core/records";
import { installFakeViewport } from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { type Square, squareOf } from "../../rules/board/cells";
import { onScreen } from "../../rules/board/orientation";
import { ELEMENT_RULES, WIND_RULE } from "../../rules/elements/element_rules";
import type { LevelEntry } from "../../rules/levels/levels";
import { legalMoves } from "../../rules/move/swap";
import { type Move, levelDealt } from "../../rules/run/saved_game";
import { BoardFrames } from "../../testing/board_frames";
import {
  BLUE_LINE,
  PUFFER,
  REFUSED,
  SEEDED_LEVELS,
  SMALL_LEVELS,
} from "../../testing/small_levels";
import { DebugService } from "../debug/debug.service";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { RecordsService } from "../stats/records.service";
import { GAME_LEVELS } from "../tokens";
import { GameService } from "./game.service";
import { FEEL } from "../../view/timeline/feel";
import { VIEW_KIT } from "./view_kit";

/** How many squares across the small levels' board is. */
const ACROSS = 5;

/** Returns a square of the small levels' board by its index. */
function at(square: number): Square {
  return squareOf(square, ACROSS);
}

/** Describes the game, the board's view handed it, and the board's frames played for it. */
interface Played {
  readonly game: GameService;
  readonly frames: BoardFrames;
}

/**
 * Returns the game at a level by its number, of the small levels unless
 * given others, opened by the level before it cleared, the board's view
 * handed it, and its first frame played, keeping what it stores in a
 * store of its own where given one.
 */
async function startGame(
  level = 1,
  levels: readonly LevelEntry[] = SMALL_LEVELS,
  storage = new MemoryStorage(),
): Promise<Played> {
  TestBed.configureTestingModule({
    providers: [
      { provide: GAME_LEVELS, useValue: levels },
      provideMemoryStorage(storage),
    ],
  });
  const game = TestBed.inject(GameService);
  game.useView(VIEW_KIT);
  if (level !== 1) {
    const before = itemAt(levels, level - 2);
    TestBed.inject(ProgressService).recordCleared(before.data.id);
    await game.startLevel(level);
  }
  const frames = new BoardFrames(game);
  frames.frame();
  return { game, frames };
}

/** Returns each level's record as a store keeps it. */
function recordsIn(storage: MemoryStorage): unknown {
  const kept: unknown = JSON.parse(
    storage.getItem("fuzz-flux-records") ?? "null",
  );
  return isRecord(kept) ? kept["levels"] : null;
}

/** Makes a move by taps on its two squares, as a player would. */
function swap({ frames }: Played, move: Move): void {
  frames.tap(at(move.from), at(move.to));
}

/** Returns a move the game in play allows, its squares on the screen. */
function aLegalMove(game: GameService): Move {
  const { game: inPlay } = game.inPlay();
  const move = itemAt(legalMoves(inPlay.board, ELEMENT_RULES), 0);
  return { from: onScreen(inPlay, move.from), to: onScreen(inPlay, move.to) };
}

/** Returns the small levels, the third's wind blowing down and turning a quarter once it has waited so many moves. */
function windyLevels(every: number): readonly LevelEntry[] {
  return SMALL_LEVELS.map((entry) =>
    entry.number === 3
      ? {
          ...entry,
          data: {
            ...entry.data,
            wind: { blows: "down", turns: { every, quarters: 1 } },
          },
        }
      : entry,
  );
}

/** Resolves once the game has done what a command started and left to finish. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

/** Answers the question asked before a level is lost, and returns a way to read the last one asked, or null for none. */
function answerQuestions(answer: boolean): () => ConfirmRequest | null {
  let asked: ConfirmRequest | null = null;
  vi.spyOn(TestBed.inject(ConfirmService), "ask").mockImplementation(
    (question) => {
      asked = question;
      return Promise.resolve(answer);
    },
  );
  return () => asked;
}

describe("GameService", () => {
  describe("as the page opens", () => {
    it("plays the first level on its first deal, no move made", async () => {
      const { game } = await startGame();

      expect(game.inPlay()).toMatchObject({ deal: 1, moves: [] });
    });

    it("shows the level's number, name, moves and goals", async () => {
      const { game } = await startGame();

      expect(game.state()).toMatchObject({
        level: { number: 1, name: "Quick clear" },
        movesLeft: 5,
        goals: [{ left: 3, met: false }],
        wind: null,
        newThing: null,
        card: null,
      });
    });

    it("shows the board in play standing still", async () => {
      const { game } = await startGame();

      expect(game.play()).toMatchObject({
        grid: game.state().grid,
        landed: false,
        timeline: { restMs: 0 },
      });
    });

    it("has no ring, and moves none, before the board hands over the view", () => {
      const game = TestBed.inject(GameService);

      game.moveRing(at(7));

      expect(game.ringSquare()).toBeNull();
    });

    it("has no level on the board before the board hands over the view", () => {
      const game = TestBed.inject(GameService);

      expect(() => game.play()).toThrow(
        "The board asked for the level before its view's parts.",
      );
    });

    it("lets go of nothing looked away from before the board hands over the view", () => {
      const game = TestBed.inject(GameService);

      expect(() => {
        game.pause();
      }).not.toThrow();
    });

    it("lays a level begun before the board hands over the view on the board once it does", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: GAME_LEVELS, useValue: SMALL_LEVELS }],
      });
      const game = TestBed.inject(GameService);
      await game.startLevel(3);

      game.useView(VIEW_KIT);

      expect(game.play().grid).toBe(game.state().grid);
    });

    it("lays a level a move cut short has cleared on a board made again, its card shown", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.game.useView(VIEW_KIT);
      new BoardFrames(played.game).frame();

      expect(played.game.state()).toMatchObject({
        goals: [{ left: 0, met: true }],
        card: { what: "cleared", stars: 3, spare: 4 },
      });
    });

    it("hints a while after a board is made again, whatever the time on the board before", async () => {
      const played = await startGame();
      played.frames.playFor(20_000);
      played.game.useView(VIEW_KIT);
      const frames = new BoardFrames(played.game);
      frames.frame();
      const still = played.game.play();

      frames.playFor(7100);

      expect(played.game.play()).not.toBe(still);
    });

    it("lays the level in play on a board made again, its hand shown no more once a move is made", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      played.frames.playToRest();

      played.game.useView(VIEW_KIT);
      played.frames.frame();

      expect({
        moves: played.game.inPlay().moves,
        hand: played.game.hand(),
      }).toEqual({ moves: [BLUE_LINE], hand: null });
    });

    it("is no run in progress, and none ended", async () => {
      const { game } = await startGame();

      expect({
        outcome: game.outcome(),
        ended: game.ended(),
        inProgress: game.inProgress(),
      }).toEqual({ outcome: "playing", ended: false, inProgress: false });
    });
  });

  describe("a move", () => {
    it("is played once and kept", async () => {
      const played = await startGame(3);

      swap(played, BLUE_LINE);

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE]);
    });

    it("counts the move at once", async () => {
      const played = await startGame(3);

      swap(played, BLUE_LINE);

      expect(played.game.state().movesLeft).toBe(5);
    });

    it("hands the board the move to play from the board it was made on", async () => {
      const played = await startGame(3);
      const before = played.game.state().grid;

      swap(played, BLUE_LINE);

      expect(played.game.play()).toMatchObject({
        grid: before,
        timeline: { restMs: expect.any(Number) as unknown },
      });
    });

    it("counts a goal on the bar only as its flights land", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(played.game.state().goals[0]?.left).toBe(20);
    });

    it("has every goal counted once its flights have landed", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(played.game.state().goals.map(({ left }) => left)).toEqual(
        played.game.inPlay().game.goalsLeft,
      );
    });

    it("leaves a level in play in progress", async () => {
      const played = await startGame(3);

      swap(played, BLUE_LINE);

      expect(played.game.inProgress()).toBe(true);
    });

    it("sets off a special where it stands, as a tap on it held does", async () => {
      const played = await startGame(4);

      played.frames.tap(at(PUFFER), at(PUFFER));

      expect(played.game.inPlay().moves).toEqual([
        { from: PUFFER, to: PUFFER },
      ]);
    });
  });

  describe("the wind on the bar", () => {
    it("shows as it blew until the gust that turns it sets in", async () => {
      const played = await startGame(3, windyLevels(1));
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(played.game.state().wind).toEqual({ blows: "down", turnsIn: 1 });
    });

    it("turns, its wait begun again, as the gust sets in", async () => {
      const played = await startGame(3, windyLevels(1));
      swap(played, BLUE_LINE);
      const { windTurnsMs } = played.game.play().timeline;

      played.frames.playPast(windTurnsMs ?? Infinity);

      expect(played.game.state().wind).toEqual({ blows: "right", turnsIn: 1 });
    });

    it("counts its wait down at once after a move that turns it none", async () => {
      const played = await startGame(3, windyLevels(2));
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(played.game.state().wind).toEqual({ blows: "down", turnsIn: 1 });
    });
  });

  describe("a swap refused", () => {
    it("costs nothing", async () => {
      const played = await startGame(3);

      swap(played, REFUSED);

      expect({
        moves: played.game.inPlay().moves,
        left: played.game.state().movesLeft,
      }).toEqual({ moves: [], left: 6 });
    });

    it("leaves the board to take the next move once it rests", async () => {
      const played = await startGame(3);
      swap(played, REFUSED);
      played.frames.playToRest();

      swap(played, BLUE_LINE);

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE]);
    });

    it("plays on the board, its fuzzballs shaking their heads", async () => {
      const played = await startGame(3);
      const still = played.game.play();

      swap(played, REFUSED);

      expect(played.game.play()).not.toBe(still);
    });
  });

  describe("the swap kept while a move plays", () => {
    it("plays as the board rests", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const next = aLegalMove(played.game);
      swap(played, next);

      played.frames.playToRest();

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE, next]);
    });

    it("lands the counts of the move before as it starts, their flights still flying", async () => {
      installFakeViewport(390, 844);
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const { goalsLeft } = played.game.inPlay().game;
      swap(played, aLegalMove(played.game));

      played.frames.playToRest();

      expect(played.game.state().goals.map(({ left }) => left)).toEqual(
        goalsLeft,
      );
    });

    it("gives way to a later one", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const next = aLegalMove(played.game);
      swap(played, REFUSED);
      swap(played, next);

      played.frames.playToRest();

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE, next]);
    });

    it("is waited for by the board's play until it rests", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const playing = played.game.play();

      swap(played, aLegalMove(played.game));

      expect(played.game.play()).toBe(playing);
    });
  });

  describe("the keys", () => {
    it("play a move as the ring steers it", async () => {
      const played = await startGame(3);

      played.frames.pressKeys(
        "ArrowRight",
        "ArrowRight",
        "ArrowDown",
        "ArrowDown",
        "Enter",
        "ArrowRight",
      );

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE]);
    });

    it("move the ring the grid over the board keeps the focus on", async () => {
      const played = await startGame();

      played.frames.pressKeys("ArrowRight", "ArrowDown");

      expect(played.game.ringSquare()).toEqual(at(6));
    });

    it("play the square the focus moves the ring to", async () => {
      const played = await startGame(3);
      played.game.moveRing(at(BLUE_LINE.from));

      played.frames.pressKeys("Enter");

      expect(played.game.picking().held).toEqual(at(BLUE_LINE.from));
    });

    it("start the ring on the first square of a level begun", async () => {
      const played = await startGame();
      played.game.moveRing(at(7));

      await played.game.startLevel(2);

      expect(played.game.ringSquare()).toEqual(at(0));
    });

    it("move the ring over the board, the board left as it stands", async () => {
      const played = await startGame();
      const still = played.game.play();

      played.frames.pressKeys("ArrowRight");

      expect({
        ring: played.game.ring().square,
        still: played.game.play() === still,
      }).toEqual({ ring: at(1), still: true });
    });
  });

  describe("the motion", () => {
    it("is full where the system allows it, the board shaking as a puffer goes off", async () => {
      installFakeViewport(390, 844);
      const played = await startGame(4);

      played.frames.tap(at(PUFFER), at(PUFFER));

      expect(played.game.play().timeline.effects).toContainEqual(
        expect.objectContaining({ what: "shake" }),
      );
    });

    it("is less where the system asks for it, the board kept still", async () => {
      installFakeViewport(390, 844).setReducedMotion(true);
      const played = await startGame(4);

      played.frames.tap(at(PUFFER), at(PUFFER));

      expect(played.game.play().timeline.effects).not.toContainEqual(
        expect.objectContaining({ what: "shake" }),
      );
    });

    it("is less where the player turns Less motion on, whatever the system", async () => {
      installFakeViewport(390, 844);
      const played = await startGame(4);
      TestBed.inject(SettingsService).update({ lessMotion: true });

      played.frames.tap(at(PUFFER), at(PUFFER));

      expect(played.game.play().timeline.effects).not.toContainEqual(
        expect.objectContaining({ what: "shake" }),
      );
    });
  });

  describe("the speed", () => {
    it("is Normal at first", async () => {
      const played = await startGame();

      expect(played.game.play().feel.swapMs).toBe(FEEL.swapMs);
    });

    it("is the player's, a move played Fast quicker", async () => {
      const played = await startGame();
      TestBed.inject(SettingsService).update({ speed: "fast" });

      swap(played, BLUE_LINE);

      expect(played.game.play().feel.swapMs).toBeLessThan(FEEL.swapMs);
    });
  });

  describe("off the record", () => {
    it("plays the next move by the numbers the debug menu tunes", async () => {
      const played = await startGame();
      TestBed.inject(DebugService).tuning.tune("swapMs", 2 * FEEL.swapMs);

      swap(played, BLUE_LINE);

      expect(played.game.play().feel.swapMs).toBe(2 * FEEL.swapMs);
    });

    it("keeps no record of a level cleared with a number retuned", async () => {
      const storage = new MemoryStorage();
      const played = await startGame(1, SMALL_LEVELS, storage);
      TestBed.inject(DebugService).tuning.tune("swapMs", 2 * FEEL.swapMs);

      swap(played, BLUE_LINE);

      expect({
        records: recordsIn(storage),
        open: TestBed.inject(ProgressService).isOpen(2),
      }).toEqual({ records: null, open: false });
    });

    it("plays a deal the debug menu chooses, by its number, off the record", async () => {
      const played = await startGame(3, SEEDED_LEVELS);

      const went = await played.game.playDeal(2);

      expect({
        went,
        deal: played.game.inPlay().deal,
        offRecord: TestBed.inject(DebugService).offRecord(),
      }).toEqual({ went: true, deal: 11, offRecord: true });
    });

    it("asks before playing a deal over moves made, and plays none where the player says no", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const asked = answerQuestions(false);
      const inPlay = played.game.inPlay();

      const went = await played.game.playDeal(2);

      expect({
        asked: asked()?.title,
        went,
        same: played.game.inPlay() === inPlay,
      }).toEqual({ asked: "Play deal 2?", went: false, same: true });
    });

    it("keeps a deal the debug menu chose off the record at Restart", async () => {
      const played = await startGame(3);
      await played.game.playDeal(2);

      await played.game.restart();

      expect(TestBed.inject(DebugService).offRecord()).toBe(true);
    });

    it("keeps the level begun next on the record, the numbers put back", async () => {
      const played = await startGame();
      const debug = TestBed.inject(DebugService);
      debug.tuning.tune("swapMs", 2 * FEEL.swapMs);
      debug.tuning.reset();

      await played.game.newGame();

      expect(debug.offRecord()).toBe(false);
    });

    it("plays the level after one cleared off the record off it too, as it is still locked", async () => {
      const played = await startGame();
      await played.game.playDeal(1);
      swap(played, BLUE_LINE);

      await played.game.nextLevel();

      expect({
        level: played.game.inPlay().level.number,
        offRecord: TestBed.inject(DebugService).offRecord(),
      }).toEqual({ level: 2, offRecord: true });
    });

    it("plays a level a bug report kept off the record", async () => {
      const played = await startGame();
      const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };

      await played.game.load(levelDealt(itemAt(SMALL_LEVELS, 2), 1, rules));

      expect(TestBed.inject(DebugService).offRecord()).toBe(true);
    });
  });

  describe("the debug menu's line", () => {
    /** A line of two moves on the third level's first deal: the swap that lines up blue, and one the board it leaves allows. */
    const LINE: readonly Move[] = [BLUE_LINE, { from: 7, to: 8 }];

    it("plays the level again on its deal, off the record, and the line's first move as the board next draws", async () => {
      const played = await startGame(3, SEEDED_LEVELS);

      const went = await played.game.playLine(LINE);
      played.frames.frame();

      expect({
        went,
        deal: played.game.inPlay().deal,
        moves: played.game.inPlay().moves,
        offRecord: TestBed.inject(DebugService).offRecord(),
      }).toEqual({ went: true, deal: 7, moves: [BLUE_LINE], offRecord: true });
    });

    it("makes no next move while the board still plays the one before", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      await played.game.playLine(LINE);

      played.frames.playFor(100);

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE]);
    });

    it("makes each next move once the board rests from the one before", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      await played.game.playLine(LINE);
      played.frames.frame();

      played.frames.playToRest();
      played.frames.frame();

      expect(played.game.inPlay().moves).toEqual(LINE);
    });

    it("stops where the rules refuse a move of it", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      await played.game.playLine([REFUSED, BLUE_LINE]);
      played.frames.frame();

      played.frames.playToRest();
      played.frames.frame();

      expect(played.game.inPlay().moves).toEqual([]);
    });

    it("stops where the player picks up a fuzzball while a move of it plays, the fuzzball shown held", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      await played.game.playLine(LINE);
      played.frames.frame();

      played.frames.tap(at(0));
      played.frames.playToRest();
      played.frames.frame();

      expect({
        moves: played.game.inPlay().moves,
        held: played.game.heldSquare(),
      }).toEqual({ moves: [BLUE_LINE], held: at(0) });
    });

    it("stops where the player's own swap, kept while a move of it plays, is made", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      // A move the board allows once the player's swap is made.
      await played.game.playLine([BLUE_LINE, { from: 2, to: 7 }]);
      played.frames.frame();

      swap(played, { from: 7, to: 8 });
      played.frames.playToRest();
      played.frames.frame();
      played.frames.playToRest();
      played.frames.frame();

      expect(played.game.inPlay().moves).toEqual([
        BLUE_LINE,
        { from: 7, to: 8 },
      ]);
    });

    it("stops where another level is put in play before its next move", async () => {
      const played = await startGame(3, SEEDED_LEVELS);
      await played.game.playLine(LINE);
      played.frames.frame();
      answerQuestions(true);

      await played.game.startLevel(1);
      played.frames.playToRest();
      played.frames.frame();

      expect({
        level: played.game.inPlay().level.number,
        moves: played.game.inPlay().moves,
      }).toEqual({ level: 1, moves: [] });
    });

    it("asks before playing the line over moves made, and plays none where the player says no", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const asked = answerQuestions(false);
      const inPlay = played.game.inPlay();

      const went = await played.game.playLine(LINE);

      expect({
        asked: asked()?.title,
        went,
        same: played.game.inPlay() === inPlay,
      }).toEqual({ asked: "Play the certificate?", went: false, same: true });
    });
  });

  describe("a fuzzball picked up", () => {
    it("shows held on the board", async () => {
      const played = await startGame(3);
      const still = played.game.play();

      played.frames.tap(at(BLUE_LINE.from));

      expect(played.game.play()).not.toBe(still);
    });

    it("is put down by a tap on it", async () => {
      const played = await startGame(3);
      played.frames.tap(at(BLUE_LINE.from));
      const held = played.game.play();

      played.frames.tap(at(BLUE_LINE.from));

      expect(played.game.play()).not.toBe(held);
    });

    it("is the square the grid over the board marks selected", async () => {
      const played = await startGame(3);

      played.frames.tap(at(BLUE_LINE.from));

      expect(played.game.heldSquare()).toEqual(at(BLUE_LINE.from));
    });

    it("is selected no more once put down", async () => {
      const played = await startGame(3);
      played.frames.tap(at(BLUE_LINE.from));

      played.frames.tap(at(BLUE_LINE.from));

      expect(played.game.heldSquare()).toBeNull();
    });

    it("is selected only once the board shows it held, as it rests after a move", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      played.frames.tap(at(0));
      const whilePlaying = played.game.heldSquare();

      played.frames.playToRest();

      expect({ whilePlaying, atRest: played.game.heldSquare() }).toEqual({
        whilePlaying: null,
        atRest: at(0),
      });
    });

    it("waits to show held while a move plays, until the board rests", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const playing = played.game.play();
      played.frames.tap(at(0));

      played.frames.playToRest();

      expect({
        held: played.game.picking().held,
        shown: played.game.play() !== playing,
      }).toEqual({ held: at(0), shown: true });
    });
  });

  describe("the level cleared", () => {
    it("ends the run, no longer in progress", async () => {
      const played = await startGame();

      swap(played, BLUE_LINE);

      expect({
        outcome: played.game.outcome(),
        ended: played.game.ended(),
        inProgress: played.game.inProgress(),
      }).toEqual({ outcome: "cleared", ended: true, inProgress: false });
    });

    it("shows no card until its beat", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(played.game.state().card).toBeNull();
    });

    it("shows the Cleared card at its beat, with its stars and the moves to spare", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(played.game.state().card).toEqual({
        what: "cleared",
        stars: 3,
        spare: 4,
      });
    });

    it("shows the Cleared card with no star lit until the first's beat", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);
      const { end } = played.game.play().timeline;

      played.frames.playPast(end?.cardMs ?? 0);

      expect(played.game.state()).toMatchObject({
        card: { what: "cleared" },
        starsLit: 0,
      });
    });

    it("lights each star earned at its beat, one at a time", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);
      const starsMs = played.game.play().timeline.end?.starsMs ?? [];

      const lit = starsMs.map((atMs) => {
        played.frames.playPast(atMs);
        return played.game.state().starsLit;
      });

      expect(lit).toEqual([1, 2, 3]);
    });

    it("lights every star at once for a move landed at once", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.game.pause();
      played.frames.frame();

      expect(played.game.state()).toMatchObject({
        card: { what: "cleared" },
        starsLit: 3,
      });
    });

    it("lights every star of a level cleared on a board made again", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.game.useView(VIEW_KIT);

      expect(played.game.state().starsLit).toBe(3);
    });

    it("plays the encore and lights the stars earned on the card", async () => {
      const played = await startGame();

      swap(played, BLUE_LINE);

      expect(played.game.play().timeline.end).toMatchObject({
        starsMs: [expect.any(Number), expect.any(Number), expect.any(Number)],
        hurriedFromMs: expect.any(Number) as unknown,
      });
    });

    it("takes no more presses", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.frames.tap(at(0));

      expect(played.game.picking().held).toBeNull();
    });

    it("opens the level after it, as the move is made", async () => {
      const played = await startGame();

      swap(played, BLUE_LINE);

      expect(TestBed.inject(ProgressService).isOpen(2)).toBe(true);
    });

    it("keeps its stars and its moves to spare in its record", async () => {
      const storage = new MemoryStorage();
      const played = await startGame(1, SMALL_LEVELS, storage);

      swap(played, BLUE_LINE);

      expect(recordsIn(storage)).toEqual({
        "1": { nextDeal: 1, stars: 3, spare: 4 },
      });
    });

    it("goes on to the next level at Enter", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.game.command("go");
      await settle();

      expect(played.game.state().level.number).toBe(2);
    });

    it("goes on to the next level at Next level", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      const went = await played.game.nextLevel();

      expect({ went, level: played.game.state().level.number }).toEqual({
        went: true,
        level: 2,
      });
    });

    it("has a next level before the last", async () => {
      const played = await startGame(1, SMALL_LEVELS.slice(0, 2));

      expect(played.game.hasNextLevel()).toBe(true);
    });

    it("has no next level after the last, and goes to none at Next level", async () => {
      const played = await startGame(1, SMALL_LEVELS.slice(0, 1));
      swap(played, BLUE_LINE);

      const went = await played.game.nextLevel();

      expect({ next: played.game.hasNextLevel(), went }).toEqual({
        next: false,
        went: false,
      });
    });

    it("goes on to no level after the last", async () => {
      const played = await startGame(1, SMALL_LEVELS.slice(0, 1));
      swap(played, BLUE_LINE);
      const inPlay = played.game.inPlay();

      played.game.command("go");
      await settle();

      expect(played.game.inPlay()).toBe(inPlay);
    });
  });

  describe("the level run out of moves", () => {
    it("ends the run as over", async () => {
      const played = await startGame(2);

      swap(played, BLUE_LINE);

      expect(played.game.outcome()).toBe("over");
    });

    it("shows the Out of moves card at its beat", async () => {
      const played = await startGame(2);
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(played.game.state().card).toEqual({ what: "over" });
    });

    it("opens no level after it", async () => {
      const played = await startGame(2);

      swap(played, BLUE_LINE);

      expect(TestBed.inject(ProgressService).isOpen(3)).toBe(false);
    });

    it("keeps no stars and no moves to spare in its record", async () => {
      const storage = new MemoryStorage();
      const played = await startGame(2, SMALL_LEVELS, storage);

      swap(played, BLUE_LINE);

      expect(recordsIn(storage)).toEqual({ "2": { nextDeal: 1 } });
    });

    it("lights no star", async () => {
      const played = await startGame(2);
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(played.game.state()).toMatchObject({
        card: { what: "over" },
        starsLit: 0,
      });
    });
  });

  describe("the announcer", () => {
    /** Returns what the announcer says now. */
    function saying(): string {
      return TestBed.inject(AnnouncerService).message();
    }

    it("says a level as it begins", async () => {
      await startGame(3);

      expect(saying()).toBe("Level 3, Show me. 20 blue and 20 red. 6 moves.");
    });

    it("says nothing of a level taken up as the page loads", async () => {
      const { game } = await startGame();
      const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };

      game.takeUp(levelDealt(itemAt(SMALL_LEVELS, 2), 1, rules));

      expect(saying()).toBe("");
    });

    it("says a move as it is made", async () => {
      const played = await startGame(3);

      swap(played, BLUE_LINE);

      expect(saying()).toBe("Bunch of 3, blue. 17 blue left. 5 moves left.");
    });

    it("says a swap refused", async () => {
      const played = await startGame(3);

      swap(played, REFUSED);

      expect(saying()).toBe("That swap makes no bunch.");
    });

    it("says the move that clears a level until the card shows", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(saying()).toBe("Bunch of 3, blue. Blue done.");
    });

    it("says the Cleared card as it shows", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(saying()).toBe("Level 1 cleared. 3 stars. 4 moves to spare.");
    });

    it("says the Out of moves card as it shows", async () => {
      const played = await startGame(2);
      swap(played, BLUE_LINE);

      played.frames.playOut();

      expect(saying()).toBe("Out of moves. 17 blue left.");
    });
  });

  describe("the moves running low", () => {
    it("show low from the start on a level begun with 5 or fewer", async () => {
      const { game } = await startGame();

      expect(game.state().movesLow).toBe(true);
    });

    it("play no sound for a level begun low", async () => {
      const { game } = await startGame();

      expect(game.cues()).toEqual([]);
    });

    it("show low only as the board rests after the move that brings them there", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.frames.frame();

      expect(played.game.state().movesLow).toBe(false);
    });

    it("show low from the board's rest", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.frames.playToRest();

      expect(played.game.state().movesLow).toBe(true);
    });

    it("cue the low sound once, as the board rests", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.frames.playToRest();

      expect(played.game.cues()).toEqual([
        expect.objectContaining({ sound: "low" }),
      ]);
    });
  });

  describe("the shell's own sounds", () => {
    it("play at once, on the scene's clock, as a card's button does", async () => {
      const played = await startGame();
      played.frames.playFor(100);

      played.game.cue("button");

      expect(played.game.cues()).toEqual([
        { atMs: played.frames.nowMs, sound: "button", cents: 0, volume: 1 },
      ]);
    });

    it("play on as the level they start begins", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);
      played.frames.playOut();

      played.game.cue("button");
      await played.game.nextLevel();

      expect(played.game.cues()).toMatchObject([{ sound: "button" }]);
    });

    it("are left behind once played, as another level begins", async () => {
      const played = await startGame();
      played.game.cue("button");
      played.frames.frame();

      await played.game.newGame();

      expect(played.game.cues()).toEqual([]);
    });

    it("start again on a board made again, its clock new", async () => {
      const played = await startGame();
      played.game.cue("button");

      played.game.useView(VIEW_KIT);

      expect(played.game.cues()).toEqual([]);
    });

    it("play nothing before the board hands over the view", () => {
      const game = TestBed.inject(GameService);

      expect(() => {
        game.cue("button");
      }).not.toThrow();
    });
  });

  describe("the hint", () => {
    it("shows once the board has rested a while with no move", async () => {
      const played = await startGame();
      const still = played.game.play();

      played.frames.playFor(7100);

      expect(played.game.play().timeline.sounds).toEqual([
        expect.objectContaining({ sound: "hint" }),
      ]);
      expect(played.game.play()).not.toBe(still);
    });

    it("shows at once when asked", async () => {
      const played = await startGame();

      played.game.hint();

      expect(played.game.play().timeline.sounds).toEqual([
        expect.objectContaining({ sound: "hint" }),
      ]);
    });

    it("shows at H, as the ring hands it over", async () => {
      const played = await startGame();

      played.game.boardCommand({ what: "hint" });

      expect(played.game.play().timeline.sounds).toEqual([
        expect.objectContaining({ sound: "hint" }),
      ]);
    });

    it("puts down the fuzzball held first", async () => {
      const played = await startGame();
      played.frames.tap(at(BLUE_LINE.from));

      played.game.hint();

      expect(played.game.picking().held).toBeNull();
    });

    it("waits while a move plays", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const playing = played.game.play();

      played.game.hint();

      expect(played.game.play()).toBe(playing);
    });

    it("shows a teaching level's own first move with the hand, as soon as its board rests", async () => {
      const { game } = await startGame(3);

      expect(game.hand()).not.toBeNull();
    });

    it("takes the hand away once a move is made", async () => {
      const played = await startGame(3);

      swap(played, BLUE_LINE);

      expect(played.game.hand()).toBeNull();
    });

    it("shows no hand on a level that teaches nothing", async () => {
      const { game } = await startGame();

      game.hint();

      expect(game.hand()).toBeNull();
    });
  });

  describe("looking away", () => {
    it("lands the move in play at once", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);

      played.game.pause();

      expect(played.game.play().landed).toBe(true);
    });

    it("comes back to the board at rest, every beat passed", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      played.game.pause();

      played.frames.frame();

      expect(played.game.state()).toMatchObject({
        movesLow: true,
        goals: [{ left: played.game.inPlay().game.goalsLeft[0] }, {}],
      });
    });

    it("puts down the fuzzball held", async () => {
      const played = await startGame(3);
      played.frames.tap(at(BLUE_LINE.from));

      played.game.pause();

      expect(played.game.picking().held).toBeNull();
    });

    it("forgets the swap kept", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      swap(played, aLegalMove(played.game));

      played.game.pause();
      played.frames.frame();

      expect(played.game.inPlay().moves).toEqual([BLUE_LINE]);
    });

    it("pauses nothing, so nothing goes on", async () => {
      const played = await startGame(3);
      played.game.pause();
      const landed = played.game.play();

      played.game.resume();

      expect(played.game.play()).toBe(landed);
    });
  });

  describe("Restart", () => {
    it("plays the same deal again, no move made", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      answerQuestions(true);

      await played.game.restart();

      expect(played.game.inPlay()).toMatchObject({ deal: 1, moves: [] });
    });

    it("asks first once a move is made", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const asked = answerQuestions(false);

      const restarted = await played.game.restart();

      expect({ restarted, asked: asked() }).toEqual({
        restarted: false,
        asked: {
          title: "Restart this level?",
          message: "You'll lose the moves you've made.",
          confirmLabel: "Restart",
          tone: "danger",
        },
      });
    });

    it("asks nothing with no move made", async () => {
      const { game } = await startGame(3);
      const asked = answerQuestions(false);

      await game.restart();

      expect(asked()).toBeNull();
    });

    it("counts a level begun, for the board to take the focus", async () => {
      const { game } = await startGame(3);
      const runs = game.runs();

      await game.restart();

      expect(game.runs()).toBe(runs + 1);
    });
  });

  describe("the deal", () => {
    it("is the next of the level's for Try again and Play again", async () => {
      const played = await startGame(2);
      swap(played, BLUE_LINE);

      await played.game.newGame();

      expect(played.game.inPlay()).toMatchObject({ deal: 2, moves: [] });
    });

    it("is the next of the level's coming back to it", async () => {
      const played = await startGame();
      swap(played, BLUE_LINE);
      await played.game.startLevel(2);

      await played.game.startLevel(1);

      expect(played.game.inPlay().deal).toBe(2);
    });

    it("is the same again for a deal no move was made on", async () => {
      const { game } = await startGame();
      await game.startLevel(2);

      await game.startLevel(1);

      expect(game.inPlay().deal).toBe(1);
    });

    it("is kept, Try again declined, once a move is made", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      answerQuestions(false);

      const begun = await played.game.newGame();

      expect({ begun, moves: played.game.inPlay().moves }).toEqual({
        begun: false,
        moves: [BLUE_LINE],
      });
    });

    it("is used up once, though Restart plays it again", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      answerQuestions(true);
      await played.game.restart();
      swap(played, BLUE_LINE);

      expect(
        TestBed.inject(RecordsService).nextDeal(itemAt(SMALL_LEVELS, 2).data),
      ).toBe(2);
    });

    it("is left for another level's only once asked, with a move made", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      answerQuestions(false);

      const started = await played.game.startLevel(1);

      expect({ started, level: played.game.state().level.number }).toEqual({
        started: false,
        level: 3,
      });
    });

    it("is left for another level's once the player says to play that level", async () => {
      const played = await startGame(3);
      swap(played, BLUE_LINE);
      const asked = answerQuestions(true);

      await played.game.startLevel(1);

      expect(asked()).toMatchObject({
        title: "Play level 1?",
        message: "You'll lose the moves you've made.",
        confirmLabel: "Play level 1",
      });
    });
  });

  it("never puts the card away, as each card's buttons go on from it", async () => {
    const { game } = await startGame();

    expect(game.resultClosed()).toBe(false);
  });
});
