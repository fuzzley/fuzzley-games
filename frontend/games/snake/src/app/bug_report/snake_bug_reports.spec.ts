import { TestBed } from "@angular/core/testing";
import { BUILD_INFO } from "@fz/game-ui/build_info";
import {
  BUG_REPORT_CONFIG,
  BUG_REPORT_SOURCE,
  BugReportService,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { BOARD_SIZE } from "../../rules/arena";
import { reportRun } from "../../rules/reported_run";
import type { Run } from "../../rules/run";
import { stepMs } from "../../rules/speed";
import { endedGame, provideFixedSeed } from "../../testing/play";
import { runFrom } from "../../testing/run_picture";
import { GameService } from "../play/game.service";
import {
  DEFAULT_SETTINGS,
  SettingsService,
} from "../settings/settings.service";
import { SnakeBugReports } from "./snake_bug_reports";
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

/** Returns Snake's reports, over the game as a spec has left it. */
function reports(): SnakeBugReports {
  return TestBed.inject(SnakeBugReports);
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
          { provide: BUG_REPORT_SOURCE, useExisting: SnakeBugReports },
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
