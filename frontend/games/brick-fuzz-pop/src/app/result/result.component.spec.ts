import { figure, figures } from "@fz/ui/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { ResultComponent, type RunEnd } from "./result.component";

/** A run lost on the third level after clearing two from the first. */
const LOST: RunEnd = {
  outcome: "over",
  firstLevel: 1,
  level: 3,
  levelName: "Pips",
  score: 4560,
  cleared: 2,
  stars: 5,
};

/** A run from the fourth level that cleared the last. */
const WON: RunEnd = {
  outcome: "won",
  firstLevel: 4,
  level: 9,
  levelName: "Gatehouse",
  score: 31_200,
  cleared: 6,
  stars: 14,
};

/** What a spec gets back from rendering the card: what it emitted. */
interface RenderedResult {
  readonly tryAgain: ReturnType<typeof vi.fn>;
  readonly newGame: ReturnType<typeof vi.fn>;
  readonly chooseLevel: ReturnType<typeof vi.fn>;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the card, open, over a run's end, with the best given or the run's own, a new best. */
async function renderResult(
  end: RunEnd = LOST,
  best = end.score,
): Promise<RenderedResult> {
  const emitted = {
    tryAgain: vi.fn(),
    newGame: vi.fn(),
    chooseLevel: vi.fn(),
    closed: vi.fn(),
  };
  await render(ResultComponent, {
    inputs: { open: true, end, best, newBest: best === end.score },
    on: emitted,
  });
  return emitted;
}

/** Returns the card's buttons' names, in order. */
function buttons(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent.trim());
}

describe("ResultComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(ResultComponent, {
      inputs: { open: false, end: LOST, best: 0, newBest: false },
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("says the run is over, and the level it was lost on by number and name", async () => {
    await renderResult();

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toHaveAccessibleDescription("Lost on level 3, Pips");
  });

  it("says every level was cleared, from where the run started", async () => {
    await renderResult(WON);

    expect(
      screen.getByRole("alertdialog", { name: "Every level cleared!" }),
    ).toHaveAccessibleDescription("From level 4 to the last");
  });

  it("shows the score, the best, the levels cleared and the stars earned", async () => {
    await renderResult(LOST, 9000);

    expect(figures()).toEqual([
      ["Score", "4,560"],
      ["Best", "9,000"],
      ["Cleared", "2"],
      ["Stars", "5"],
    ]);
  });

  it("calls a score that set the best a new best, with the trophy", async () => {
    await renderResult();

    expect({
      newBest: screen.getByText("New best").textContent,
      // The trophy is hidden from assistive technology, which "New best" tells.
      trophy: document.querySelector('fz-icon[name="trophy"]') !== null,
    }).toEqual({ newBest: "New best", trophy: true });
  });

  it("shows the best a lost run fell short of, with no new best or trophy", async () => {
    await renderResult(LOST, 90_000);

    expect({
      best: figure("Best"),
      newBest: screen.queryByText("New best"),
      trophy: document.querySelector('fz-icon[name="trophy"]'),
    }).toEqual({ best: "90,000", newBest: null, trophy: null });
  });

  it("shows the trophy for every level cleared, best or not", async () => {
    await renderResult(WON, 90_000);

    expect(document.querySelector('fz-icon[name="trophy"]')).not.toBeNull();
  });

  it("opens on its title, which no key presses", async () => {
    await renderResult();

    expect(screen.getByRole("heading", { name: "Game over" })).toHaveFocus();
  });

  it("offers to try a lost level again, to choose a level, or to close", async () => {
    await renderResult();

    expect(buttons()).toEqual([
      "Try again from level 3",
      "Choose a level",
      "Close",
    ]);
  });

  it("offers a new game once every level is cleared", async () => {
    await renderResult(WON);

    expect(buttons()[0]).toBe("New game");
  });

  it("asks to try the lost level again", async () => {
    const { tryAgain, newGame } = await renderResult();

    await userEvent.click(
      screen.getByRole("button", { name: "Try again from level 3" }),
    );

    expect([tryAgain.mock.calls.length, newGame.mock.calls.length]).toEqual([
      1, 0,
    ]);
  });

  it("asks for a new game once every level is cleared", async () => {
    const { tryAgain, newGame } = await renderResult(WON);

    await userEvent.click(screen.getByRole("button", { name: "New game" }));

    expect([tryAgain.mock.calls.length, newGame.mock.calls.length]).toEqual([
      0, 1,
    ]);
  });

  it("asks for the levels", async () => {
    const { chooseLevel } = await renderResult();

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect(chooseLevel).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "its Close button",
      () => userEvent.click(screen.getByRole("button", { name: "Close" })),
    ],
    ["Escape", () => userEvent.keyboard("{Escape}")],
  ])("asks to close from %s", async (_, close) => {
    const { closed } = await renderResult();

    await close();

    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open through a click on the board around it", async () => {
    const { closed } = await renderResult();

    // A click beside the card targets the <dialog> itself.
    await userEvent.click(screen.getByRole("alertdialog"));

    expect(closed).not.toHaveBeenCalled();
  });
});
