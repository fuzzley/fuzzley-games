import { TestBed } from "@angular/core/testing";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  BUG_REPORT_CONFIG,
  BugReportService,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen } from "@testing-library/angular";
import { BOARD_SIZE } from "../../rules/arena";
import { reportRun } from "../../rules/reported_run";
import type { Outcome, Run } from "../../rules/run";
import { stepMs } from "../../rules/speed";
import { endedGame, provideFixedSeed } from "../../testing/play";
import { pictureOf, runFrom } from "../../testing/run_picture";
import { BoardComponent } from "../board/board.component";
import { GameService } from "../play/game.service";
import { ResultComponent } from "../result/result.component";
import {
  DEFAULT_SETTINGS,
  type Settings,
  SettingsService,
} from "../settings/settings.service";
import { SnakeBugReports, provideSnakeBugReports } from "./snake_bug_reports";
import { readSnakeState } from "./snake_state";

/**
 * Returns a run won on the full board, the largest state there can be: the
 * snake fills it, back and forth down the rows from its head at the top left.
 */
function wonOnTheFullBoard(): Run {
  const last = BOARD_SIZE - 1;
  const rows = Array.from({ length: BOARD_SIZE }, (_, y) => {
    if (y === 0) return `@${"<".repeat(last)}`;
    return y % 2 === 1 ? `${">".repeat(last)}^` : `^${"<".repeat(last)}`;
  });
  return { ...runFrom(rows, { outcome: "won", steps: 4000 }), last: "won" };
}

/** Says what the page shows of the game. */
interface Shown {
  /** Where the run stands, as the board tells assistive technology. */
  readonly outcome: string | null;
  /** The snake and the apple on the board, as `pictureOf()` draws them. */
  readonly picture: readonly string[];
  /** What the board says, its card's words among it. */
  readonly board: string;
  /** What the card over an ended run says, or null while it is shut. */
  readonly result: string | null;
  readonly settings: Settings;
}

/** Returns Snake's reports, over the game as a spec has left it. */
function reports(): SnakeBugReports {
  return TestBed.inject(SnakeBugReports);
}

/** Resolves to what a question's asker made of it, once the player says yes. */
function sayingYes<T>(asking: Promise<T>): Promise<T> {
  TestBed.inject(ConfirmService).accept();
  return asking;
}

describe("SnakeBugReports", () => {
  installCompressionStreams();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFixedSeed()] });
  });

  it("files reports as Snake's, under its tag", () => {
    expect({ title: reports().title, tag: reports().tag }).toEqual({
      title: "Snake",
      tag: "sn1",
    });
  });

  it("names the game and the run's speed", async () => {
    await TestBed.inject(GameService).changeSpeed("fast");

    expect(reports().game()).toBe("Snake · Fast");
  });

  it("words each setting as the settings do", () => {
    TestBed.inject(SettingsService).update({
      movement: "step",
      arrows: "always",
      sound: false,
    });

    expect(reports().settings()).toEqual([
      "Speed: Normal",
      "Movement: Step",
      "On-screen arrows: Always",
      "Sound: Off",
    ]);
  });

  describe("a state loaded", () => {
    /** Renders the board and the card over an ended run, on a fake canvas. */
    async function renderGame(): Promise<() => Promise<Shown>> {
      const view = await render("<app-board /><app-result />", {
        imports: [BoardComponent, ResultComponent],
        providers: [provideFakePhaserCanvas()],
      });
      // The board is drawn, so a run can start.
      await view.fixture.whenStable();
      return async () => {
        view.detectChanges();
        await view.fixture.whenStable();
        const board = screen.getByRole("application");
        return {
          outcome: board.getAttribute("data-outcome"),
          picture: pictureOf(TestBed.inject(GameService).frame().run),
          board: board.textContent,
          result: screen.queryByRole("alertdialog")?.textContent ?? null,
          settings: TestBed.inject(SettingsService).settings(),
        };
      };
    }

    /**
     * Takes the state as a report does, packs it and reads it back, then
     * starts another run, at other settings, as the one who loads it may
     * have.
     */
    async function reportAndPlayOn(): Promise<unknown> {
      const packed = await packState("sn1", reports().capture().value);
      const game = TestBed.inject(GameService);
      await sayingYes(game.newGame());
      game.turn("up");
      TestBed.inject(SettingsService).update(DEFAULT_SETTINGS);
      return unpackState("sn1", packed);
    }

    /** Plays a run to its first apple, and pauses it. */
    function pausedAtAnApple(): void {
      const game = TestBed.inject(GameService);
      game.turn("right");
      for (let i = 0; i < 8; i++) game.tick(stepMs("normal", 0));
      game.pause();
    }

    /** Plays a run to its end, and lets the card over it open. */
    function endedWithItsCard(): void {
      endedGame().tick(16);
    }

    /** Plays a run that sets a new best to its end, and puts its card away. */
    function endedAndPutAway(): void {
      endedGame("right").tick(16);
      TestBed.inject(GameService).closeResult();
    }

    /** Takes up a run won on the full board, and puts its card away. */
    function wonAndPutAway(): void {
      const game = TestBed.inject(GameService);
      game.takeUp(wonOnTheFullBoard());
      game.closeResult();
    }

    it.each<[string, () => void, Outcome]>([
      ["a run waiting for its first direction", () => undefined, "ready"],
      ["a run paused", pausedAtAnApple, "paused"],
      ["a run ended, its card still to come", () => endedGame(), "over"],
      ["a run ended, its card showing", endedWithItsCard, "over"],
      [
        "a run ended with a new best, its card put away",
        endedAndPutAway,
        "over",
      ],
      ["a run won, its card put away", wonAndPutAway, "won"],
    ])("shows %s as it was reported", async (_, play, outcome) => {
      const shown = await renderGame();
      TestBed.inject(SettingsService).update({
        speed: "slow",
        movement: "step",
        arrows: "always",
        sound: false,
      });
      play();
      const reported = await shown();
      const state = await reportAndPlayOn();

      await sayingYes(reports().load(state));

      const loaded = await shown();
      expect(loaded).toEqual(reported);
      expect(loaded.outcome).toBe(outcome);
    });

    it("loads the whole game-state field of a report", async () => {
      TestBed.configureTestingModule({
        providers: [provideSnakeBugReports()],
      });
      endedGame();
      const packed = await packState("sn1", reports().capture().value);
      await TestBed.inject(GameService).newGame();

      const loaded = await TestBed.inject(BugReportService).load(
        `Score 0 · 9 steps · ran into the wall\n\n\`\`\`\n${packed}\n\`\`\`\n`,
      );

      expect(loaded).toBe(true);
      expect(TestBed.inject(GameService).outcome()).toBe("over");
    });

    it("leaves the run under way and the settings where the player says no", async () => {
      pausedAtAnApple();
      const state = await reportAndPlayOn();
      TestBed.inject(SettingsService).update({ sound: false });
      const before = TestBed.inject(GameService).run();

      const loading = reports().load(state);
      TestBed.inject(ConfirmService).cancel();

      expect(await loading).toBe(false);
      expect(TestBed.inject(GameService).run()).toBe(before);
      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
    });

    it("refuses a state that doesn't fit, naming its part, before asking", async () => {
      const game = TestBed.inject(GameService);
      game.turn("up");

      const loading = reports().load({
        run: reportRun(game.run()),
        stage: null,
        settings: DEFAULT_SETTINGS,
      });

      await expect(loading).rejects.toThrow(
        "The game state's stage doesn't fit this build.",
      );
      expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    });
  });

  describe("the state", () => {
    it("takes the run under way as it stands, with the settings", () => {
      const game = TestBed.inject(GameService);
      game.turn("up");
      game.tick(stepMs("normal", 0));
      game.tick(stepMs("normal", 0));

      expect(reports().capture()).toEqual({
        summary: "Score 0 · 2 steps · in play",
        value: {
          run: reportRun(game.run()),
          stage: { newBest: false, card: "coming" },
          settings: DEFAULT_SETTINGS,
        },
      });
    });

    it("takes an ended run with its crash, its new best and its card put away", () => {
      const game = endedGame("right");
      game.closeResult();

      expect(reports().capture().value).toMatchObject({
        run: { outcome: "over", crash: "wall", last: "crashed", eaten: 1 },
        stage: { newBest: true, card: "closed" },
      });
    });

    it("takes the card over an ended run as showing, once it shows", () => {
      const game = endedGame();
      game.tick(16);

      expect(reports().capture().value).toMatchObject({
        stage: { newBest: false, card: "open" },
      });
    });

    it("sums up the run", () => {
      endedGame();

      expect(reports().capture().summary).toBe(
        "Score 0 · 9 steps · ran into the wall",
      );
    });

    it("reads back as it was packed, its run under a new id", async () => {
      const game = endedGame("right");
      game.closeResult();
      const { value } = reports().capture();

      const read = readSnakeState(
        await unpackState("sn1", await packState("sn1", value)),
        7,
      );

      expect(read).toEqual({
        run: { ...game.run(), id: 7 },
        stage: { newBest: true, card: "closed" },
        settings: DEFAULT_SETTINGS,
      });
    });

    it("fits the largest, a run won on the full board, in the link whole", async () => {
      TestBed.configureTestingModule({
        providers: [
          provideSnakeBugReports(),
          {
            provide: BUILD_INFO,
            useValue: {
              commit: "0123456789abcdef0123456789abcdef01234567",
              buildTime: "2026-11-22T12:00:00Z",
            },
          },
        ],
      });
      TestBed.inject(GameService).takeUp(wonOnTheFullBoard());
      const state = reports().capture();

      const link = await TestBed.inject(BugReportService).issueUrl(state);
      const field = new URL(link).searchParams.get("game-state") ?? "";

      expect(link.length).toBeLessThanOrEqual(
        TestBed.inject(BUG_REPORT_CONFIG).maxUrlChars,
      );
      expect(await unpackState("sn1", field)).toEqual(state.value);
    });
  });
});
