import { TestBed } from "@angular/core/testing";
import { itemAt } from "@fz/core/records";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import { installFakeViewport } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { squareOf } from "../../rules/board/cells";
import { reportedGameOf } from "../../rules/run/reported_game";
import { levelDealt, movePlayed } from "../../rules/run/saved_game";
import { BoardFrames } from "../../testing/board_frames";
import { BLUE_LINE, SMALL_LEVELS } from "../../testing/small_levels";
import { GameService } from "../play/game.service";
import { VIEW_KIT } from "../play/view_kit";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { RecordsService } from "../stats/records.service";
import { GAME_LEVELS, GAME_RULES } from "../tokens";
import {
  FuzzFluxBugReports,
  provideFuzzFluxBugReports,
} from "./fuzz_flux_bug_reports";

/** Describes the reports and what a spec plays them by. */
interface Reports {
  readonly reports: FuzzFluxBugReports;
  readonly game: GameService;
}

/** Returns the source the bug reports are handed, the game on the small levels, the board's view handed it. */
function reportsOf(): Reports {
  TestBed.configureTestingModule({
    providers: [
      provideFuzzFluxBugReports(),
      provideMemoryStorage(new MemoryStorage()),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
    ],
  });
  const game = TestBed.inject(GameService);
  game.useView(VIEW_KIT);
  return { reports: TestBed.inject(FuzzFluxBugReports), game };
}

/** Makes the line of blue's move on the board by two taps, as a player would. */
function playBlueLine(game: GameService): void {
  new BoardFrames(game).tap(
    squareOf(BLUE_LINE.from, 5),
    squareOf(BLUE_LINE.to, 5),
  );
}

describe("FuzzFluxBugReports", () => {
  it("is the source the bug reports are handed", () => {
    const { reports } = reportsOf();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(reports);
  });

  it("files a report under the game's name, its state under ff1", () => {
    const { reports } = reportsOf();

    expect({ title: reports.title, tag: reports.tag }).toEqual({
      title: "Fuzz Flux",
      tag: "ff1",
    });
  });

  it("names the level in play", async () => {
    const { reports, game } = reportsOf();

    await game.startLevel(3);

    expect(reports.game()).toBe("Fuzz Flux · Level 3: Show me");
  });

  it("lists the settings the game plays by, Less motion the device's setting until it is set", () => {
    installFakeViewport(390, 844).setReducedMotion(true);
    const { reports } = reportsOf();

    expect(reports.settings()).toEqual([
      "Speed: Normal",
      "Less motion: On (device setting)",
      "Play sounds: On",
    ]);
  });

  it("lists the settings the player has set", () => {
    installFakeViewport(390, 844).setReducedMotion(true);
    const { reports } = reportsOf();

    TestBed.inject(SettingsService).update({
      speed: "fast",
      lessMotion: false,
      sound: false,
    });

    expect(reports.settings()).toEqual([
      "Speed: Fast",
      "Less motion: Off",
      "Play sounds: Off",
    ]);
  });

  it("takes the level in play, its deal and the moves made, and sums it up", async () => {
    const { reports, game } = reportsOf();
    await game.startLevel(3);
    playBlueLine(game);

    const { summary, value } = reports.capture();

    expect({ summary, value }).toEqual({
      summary:
        "Level 3: Show me · deal 1 · 1 move made · 5 moves left · In play",
      value: { level: "3", deal: 1, moves: [[12, 13]] },
    });
  });

  it("puts a reported game back on the board, as the level, the deal and the moves left it", async () => {
    const { reports, game } = reportsOf();
    const rules = TestBed.inject(GAME_RULES);
    const dealt = levelDealt(itemAt(SMALL_LEVELS, 2), 2, rules);
    const reported = movePlayed(dealt, BLUE_LINE, rules).inPlay;

    const loaded = await reports.load(reportedGameOf(reported));

    expect({ loaded, inPlay: game.inPlay() }).toEqual({
      loaded: true,
      inPlay: reported,
    });
  });

  it("puts a level its moves ended back at its end, its card shown", async () => {
    const { reports, game } = reportsOf();

    await reports.load({ level: "1", deal: 2, moves: [[12, 13]] });

    expect(game.state().card?.what).toBe("cleared");
  });

  it("asks first once a move is made on the level in progress, and keeps it where the player says no", async () => {
    const { reports, game } = reportsOf();
    await game.startLevel(3);
    playBlueLine(game);
    const inProgress = game.inPlay();
    const confirm = TestBed.inject(ConfirmService);

    const loading = reports.load({ level: "1", deal: 2, moves: [] });
    const asked = confirm.prompt().title;
    confirm.cancel();

    expect({ asked, loaded: await loading, inPlay: game.inPlay() }).toEqual({
      asked: "Load this game?",
      loaded: false,
      inPlay: inProgress,
    });
  });

  it("loads once the player says yes", async () => {
    const { reports, game } = reportsOf();
    await game.startLevel(3);
    playBlueLine(game);

    const loading = reports.load({ level: "1", deal: 2, moves: [] });
    TestBed.inject(ConfirmService).accept();

    expect({
      loaded: await loading,
      level: game.inPlay().level.number,
    }).toEqual({ loaded: true, level: 1 });
  });

  it("keeps no record of a cleared level it puts back", async () => {
    const { reports } = reportsOf();

    await reports.load({ level: "1", deal: 2, moves: [[12, 13]] });

    expect({
      records: TestBed.inject(RecordsService).levels(),
      cleared: [...TestBed.inject(ProgressService).cleared()],
    }).toEqual({ records: {}, cleared: [] });
  });

  it("refuses a state this build can't read, saying why, before it asks anything", async () => {
    const { reports, game } = reportsOf();
    await game.startLevel(3);
    playBlueLine(game);

    await expect(
      reports.load({ level: "99", deal: 1, moves: [] }),
    ).rejects.toThrow("This build can't read level in the game state.");
    expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
  });
});
