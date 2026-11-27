import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BugReportService } from "@fz/game-ui/bug_report";
import {
  installCompressionStreams,
  installFakeViewport,
  provideReportPicture,
} from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { setPageVisibility } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { squareOf } from "../rules/board/cells";
import { BoardFrames } from "../testing/board_frames";
import { BLUE_LINE, SMALL_LEVELS } from "../testing/small_levels";
import { AppComponent } from "./app.component";
import { provideFuzzFluxBugReports } from "./bug_report/fuzz_flux_bug_reports";
import { GameService } from "./play/game.service";
import { VIEW_KIT } from "./play/view_kit";
import { GAME_LEVELS } from "./tokens";

/**
 * Renders the game on a fake canvas, the game on the small levels, with
 * the bug reports main.ts provides and any providers given, and returns a
 * way to let it settle.
 */
async function renderApp(
  ...providers: Provider[]
): Promise<() => Promise<void>> {
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
      provideFuzzFluxBugReports(),
      ...providers,
    ],
  });
  await fixture.whenStable();
  return () => fixture.whenStable();
}

/**
 * Stands in for the links a page shows a picture from, which jsdom lacks,
 * until the test finishes.
 */
function standInPictureLinks(): void {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (): string => "blob:http://localhost/picture",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (): void => undefined,
  });
  onTestFinished(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });
}

describe("AppComponent", () => {
  it("names the game in the heading of the page's main landmark", async () => {
    await renderApp();

    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        level: 1,
        name: "Fuzz Flux",
      }),
    ).toBeInTheDocument();
  });

  it("hands the board the focus as the page loads", async () => {
    await renderApp();

    expect(screen.getByRole("application")).toHaveFocus();
  });

  it("lands the move in play as the player looks away", async () => {
    await renderApp();
    const game = TestBed.inject(GameService);
    game.useView(VIEW_KIT);
    new BoardFrames(game).tap(
      squareOf(BLUE_LINE.from, 5),
      squareOf(BLUE_LINE.to, 5),
    );

    setPageVisibility("hidden");

    expect(game.play().landed).toBe(true);
  });

  it("says what the game announces in a live region", async () => {
    const settle = await renderApp();

    TestBed.inject(AnnouncerService).say("Level 1");
    await settle();

    expect(screen.getByText("Level 1")).toHaveAttribute("aria-live", "polite");
  });

  it("asks before something is lost, and hands the answer back", async () => {
    const settle = await renderApp();
    const asking = TestBed.inject(ConfirmService).ask({
      title: "Restart the level?",
      message: "You lose the moves you've made.",
      confirmLabel: "Restart",
    });
    await settle();

    await userEvent.click(
      within(
        screen.getByRole("alertdialog", { name: "Restart the level?" }),
      ).getByRole("button", { name: "Restart" }),
    );

    expect(await asking).toBe(true);
  });

  describe("a bug report", () => {
    installCompressionStreams();

    it("opens filed as Fuzz Flux's", async () => {
      await renderApp();

      await TestBed.inject(BugReportService).start();
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      const link = within(report).getByRole("link", { name: /^Open GitHub/ });
      expect(
        new URL(link.getAttribute("href") ?? "").searchParams.get("title"),
      ).toBe("[Fuzz Flux] ");
    });

    it("says to save the picture first on a touch screen", async () => {
      installFakeViewport(390, 844).setCoarsePointer(true);
      standInPictureLinks();
      const picture = new Blob(["png"], { type: "image/png" });
      await renderApp(provideReportPicture(picture));

      await TestBed.inject(BugReportService).start();
      const report = await screen.findByRole("dialog", {
        name: "Report a bug",
      });

      expect(report).toHaveAccessibleDescription(
        "Tap Save picture, then Open GitHub, and add the picture under Screenshot.",
      );
    });
  });
});
