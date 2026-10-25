import { render, screen, waitFor, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../testing/game";
import { AppComponent } from "./app.component";

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

    expect(announcer()).toHaveTextContent("Mine. 2 lives left.");
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

  it("asks before New Game loses the game under way", async () => {
    const user = await renderApp(["*..", "...", "..*"]);

    await user.click(screen.getByRole("button", { name: "New Game" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Start a new game?" }),
    ).toBeInTheDocument();
  });

  it("shows how the game ended", async () => {
    const user = await renderApp(["*1_", "121", ".1*"]);

    await user.click(square(6));

    expect(
      await screen.findByRole("alertdialog", { name: "Field cleared!" }),
    ).toBeInTheDocument();
  });

  it("gives the board the focus after New Game from the card", async () => {
    const user = await renderApp(["*1_", "121", ".1*"]);
    await user.click(square(6));
    const card = await screen.findByRole("alertdialog");

    await user.click(within(card).getByRole("button", { name: "New Game" }));

    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
    });
  });
});
