import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BugReportService } from "@fz/game-ui/bug_report";
import {
  installCompressionStreams,
  installFakeViewport,
  provideReportPicture,
} from "@fz/game-ui/testing";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { AppComponent } from "./app.component";
import { provideFuzzFluxBugReports } from "./bug_report/fuzz_flux_bug_reports";

/**
 * Renders the game, with the bug reports main.ts provides and any providers
 * given, and returns a way to let it settle.
 */
async function renderApp(
  ...providers: Provider[]
): Promise<() => Promise<void>> {
  const { fixture } = await render(AppComponent, {
    providers: [provideFuzzFluxBugReports(), ...providers],
  });
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
