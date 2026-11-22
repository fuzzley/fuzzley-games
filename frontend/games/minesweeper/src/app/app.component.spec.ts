import { TestBed } from "@angular/core/testing";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { pictureOf } from "../testing/field_picture";
import { pauseAtEnd, playOn } from "../testing/game";
import { AppComponent } from "./app.component";
import { MinesweeperReports } from "./bug_report/minesweeper_reports";
import { GameService } from "./play/game.service";

/** Renders the game over a field drawn as a picture. */
async function renderApp(picture: readonly string[]): Promise<UserEvent> {
  const { fixture } = await render(AppComponent);
  playOn(picture);
  await fixture.whenStable();
  return userEvent.setup();
}

/** Returns the square shown at an index. */
function square(index: number): HTMLElement {
  const found = screen.getAllByRole("gridcell")[index];
  if (!found) throw new Error(`No square ${index}`);
  return found;
}

/** Returns the region that says what each move did. */
function announcer(): HTMLElement {
  const region = document.querySelector<HTMLElement>("[aria-live='polite']");
  if (!region) throw new Error("No live region");
  return region;
}

describe("AppComponent", () => {
  installCompressionStreams();

  // As main.ts provides it.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BUG_REPORT_SOURCE, useExisting: MinesweeperReports },
      ],
    });
  });

  it("names the page with one heading", async () => {
    await render(AppComponent);

    expect(
      screen.getByRole("heading", { level: 1, name: "Minesweeper" }),
    ).toBeInTheDocument();
  });

  it("links home to Fuzzley Games", async () => {
    await render(AppComponent);

    expect(screen.getByRole("link", { name: /Fuzzley Games/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("puts the board in the page's main landmark", async () => {
    await render(AppComponent);

    expect(screen.getByRole("main")).toContainElement(screen.getByRole("grid"));
  });

  it("says what a move did", async () => {
    const user = await renderApp(["*..", "...", "..*"]);

    await user.click(square(0));

    expect(announcer()).toHaveTextContent("Boom. 2 lives left.");
  });

  it("opens How to play from the bar, and goes back to the bar on closing", async () => {
    const user = await renderApp(["*..", "...", "..*"]);
    const help = screen.getByRole("button", { name: "How to play" });
    await user.click(help);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(help).toHaveFocus();
  });

  it("opens the settings from the bar", async () => {
    const user = await renderApp(["*..", "...", "..*"]);

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("asks before New game loses the game under way", async () => {
    const user = await renderApp(["*..", "...", "..*"]);

    await user.click(screen.getByRole("button", { name: "New game" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Start a new game?" }),
    ).toBeInTheDocument();
  });

  it("shows how the game ended", async () => {
    pauseAtEnd(0);
    const user = await renderApp(["*1_", "121", ".1*"]);

    await user.click(square(6));

    expect(
      await screen.findByRole("alertdialog", { name: "Field cleared!" }),
    ).toBeInTheDocument();
  });

  it("leaves the board to look at for a moment before the card", async () => {
    pauseAtEnd(60_000);
    const user = await renderApp(["*1_", "121", ".1*"]);

    await user.click(square(6));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("opens the card at once on a click on the board in the pause", async () => {
    pauseAtEnd(60_000);
    const user = await renderApp(["*1_", "121", ".1*"]);
    await user.click(square(6));

    await user.click(square(0));

    expect(
      await screen.findByRole("alertdialog", { name: "Field cleared!" }),
    ).toBeInTheDocument();
  });

  it("gives the board the focus after New game from the card", async () => {
    pauseAtEnd(0);
    const user = await renderApp(["*1_", "121", ".1*"]);
    await user.click(square(6));
    const card = await screen.findByRole("alertdialog");

    await user.click(within(card).getByRole("button", { name: "New game" }));

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });

  it("opens a bug report from the settings", async () => {
    const user = await renderApp(["*..", "...", "..*"]);
    await user.click(screen.getByRole("button", { name: "Settings" }));

    await user.click(screen.getByRole("button", { name: "Report a bug" }));

    expect(
      await screen.findByRole("dialog", { name: "Report a bug" }),
    ).toBeInTheDocument();
  });

  it("leaves the game as it was on closing the bug report", async () => {
    const user = await renderApp(["*1_", ".21", "..*"]);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Report a bug" }));
    const report = await screen.findByRole("dialog", { name: "Report a bug" });

    await user.click(
      within(report).getByRole("button", { name: "Close bug report" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    const game = TestBed.inject(GameService);
    expect(pictureOf(game.field())).toEqual(["*1_", ".21", "..*"]);
    expect(game.inProgress()).toBe(true);
  });
});
