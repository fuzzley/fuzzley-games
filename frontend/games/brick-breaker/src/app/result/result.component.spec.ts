import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { FIRST_LIVES } from "../../rules/tuning";
import type { LevelEntry } from "../../rules/levels";
import {
  FRAME_MS,
  SPEC_LEVEL,
  SPEC_LEVELS,
  STILL,
  TWO_SETS,
  clearToNext,
  loseBall,
  playToClear,
  provideSpecLevels,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { ResultComponent } from "./result.component";

/** What a spec gets back from rendering the card. */
interface RenderedResult {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly chooseLevel: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the card over the specs' levels, or those given, with a run started at a level. */
async function renderAt(
  level: number,
  levels: readonly LevelEntry[] = SPEC_LEVELS,
): Promise<RenderedResult> {
  const chooseLevel = vi.fn();
  const { fixture } = await render(ResultComponent, {
    providers: provideSpecLevels(levels),
    on: { chooseLevel },
  });
  const game = TestBed.inject(GameService);
  await game.startAt(level);
  return {
    user: userEvent.setup(),
    game,
    chooseLevel,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Renders the card over a run lost on its second level, the card open. */
async function renderLost(): Promise<RenderedResult> {
  const rendered = await renderAt(SPEC_LEVEL.blasts);
  clearToNext(rendered.game);
  for (let life = 0; life < FIRST_LIVES; life++) loseBall(rendered.game);
  rendered.game.tick(FRAME_MS, STILL);
  rendered.detectChanges();
  return rendered;
}

/** Renders the card over a run started on the second level and won on the third, the last, the card open. */
async function renderWon(): Promise<RenderedResult> {
  const rendered = await renderAt(2, TWO_SETS);
  clearToNext(rendered.game);
  playToClear(rendered.game);
  rendered.game.tick(FRAME_MS, STILL);
  rendered.detectChanges();
  return rendered;
}

/** Returns the card's figures, each as its term and its value. */
function figures(): [string, string][] {
  return screen
    .getAllByRole("term")
    .map((term) => [
      term.textContent.trim(),
      term.nextElementSibling?.textContent.trim() ?? "",
    ]);
}

describe("ResultComponent", () => {
  it("stays shut while a run goes on", async () => {
    await renderAt(SPEC_LEVEL.steel);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("says a lost run is over, where and at what speed", async () => {
    await renderLost();

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toHaveAccessibleDescription("Out of lives on level 2, at Normal speed");
  });

  it("shows the score, the best, the level reached and the levels cleared", async () => {
    await renderLost();

    expect(figures()).toEqual([
      ["Score", "4400"],
      ["Best", "4400"],
      ["Level", "2"],
      ["Cleared", "1"],
    ]);
  });

  it("calls a score above the best a new best", async () => {
    await renderLost();

    expect(screen.getByText("New best")).toBeVisible();
  });

  it("calls no score a new best", async () => {
    const rendered = await renderAt(SPEC_LEVEL.steel);
    for (let life = 0; life < FIRST_LIVES; life++) loseBall(rendered.game);
    rendered.game.tick(FRAME_MS, STILL);

    rendered.detectChanges();

    expect(screen.queryByText("New best")).not.toBeInTheDocument();
  });

  it("tries the level a run was lost on again", async () => {
    const { user, game } = await renderLost();

    await user.click(
      screen.getByRole("button", { name: "Try again from level 2" }),
    );

    expect(game.run()).toMatchObject({ level: 2, outcome: "ready" });
    expect(game.resultOpen()).toBe(false);
  });

  it("calls a won run what it is", async () => {
    await renderWon();

    expect(
      screen.getByRole("alertdialog", { name: "Every level cleared!" }),
    ).toHaveAccessibleDescription("From level 2 to the last, at Normal speed");
    expect(figures()).toEqual([
      ["Score", "8200"],
      ["Best", "8200"],
      ["Level", "3"],
      ["Cleared", "2"],
    ]);
  });

  it("starts a new game after a won run, at the level it started at", async () => {
    const { user, game } = await renderWon();

    await user.click(screen.getByRole("button", { name: "New game" }));

    expect(game.run()).toMatchObject({ level: 2, outcome: "ready" });
  });

  it("puts the card away and asks for the levels", async () => {
    const { user, game, chooseLevel } = await renderLost();

    await user.click(screen.getByRole("button", { name: "Choose a level" }));

    expect(game.resultClosed()).toBe(true);
    expect(chooseLevel).toHaveBeenCalledOnce();
  });

  it("puts the card away at Close, leaving the board to look at", async () => {
    const { user, game } = await renderLost();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(game.resultClosed()).toBe(true);
  });
});
