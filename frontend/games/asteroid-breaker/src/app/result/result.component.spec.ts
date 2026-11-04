import { TestBed } from "@angular/core/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { STILL } from "../../rules/ship";
import type { WaveEntry } from "../../rules/waves";
import { inkOf, pilotsIn } from "../../testing/pilots";
import {
  GAINED_WAVES,
  SECTOR_WAVES,
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  clearToNext,
  endRun,
  playUntil,
  provideSpecWaves,
  toPickup,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { StatsService } from "../stats/stats.service";
import { ResultComponent } from "./result.component";

/** What a spec gets back from rendering the card. */
interface RenderedResult {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly chooseSector: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the card over the specs' waves, or those given, with a run started at a wave. */
async function renderAt(
  wave: number,
  waves?: readonly WaveEntry[],
): Promise<RenderedResult> {
  const chooseSector = vi.fn();
  const { fixture } = await render(ResultComponent, {
    providers: provideSpecWaves(waves),
    on: { chooseSector },
  });
  const game = TestBed.inject(GameService);
  await game.startAt(wave);
  return {
    user: userEvent.setup(),
    game,
    chooseSector,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Ends the run in play, and plays until its card opens. */
function endAndOpen({ game, detectChanges }: RenderedResult): void {
  endRun(game);
  playUntil(game, () => STILL, game.resultOpen);
  detectChanges();
}

/** Renders the card over a run lost on its second wave, the card open, with a best kept before it if given. */
async function renderLost(bestBefore = 0): Promise<RenderedResult> {
  const rendered = await renderAt(SPEC_WAVE.pebble);
  TestBed.inject(StatsService).recordEnd({
    speed: "normal",
    score: bestBefore,
    wave: 1,
    sector: "specs",
  });
  clearToNext(rendered.game);
  endAndOpen(rendered);
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
    await renderAt(SPEC_WAVE.pebble);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("says the run is over, where it was lost and at what speed", async () => {
    await renderLost();

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toHaveAccessibleDescription("Lost on wave 2, at Normal speed");
  });

  it("shows the score, the best, the wave reached and the waves cleared", async () => {
    await renderLost();

    expect(figures()).toEqual([
      ["Score", "1,040"],
      ["Best", "1,040"],
      ["Wave", "2"],
      ["Cleared", "1"],
    ]);
  });

  it("calls a score above the best a new best, with the trophy", async () => {
    await renderLost();

    expect(screen.getByText("New best")).toBeVisible();
    // The trophy is hidden from assistive technology, which "New best" tells.
    expect(document.querySelector('fz-icon[name="trophy"]')).not.toBeNull();
  });

  it("shows the best a run fell short of, and no new best", async () => {
    await renderLost(90_000);

    expect({
      best: figures().find(([term]) => term === "Best")?.[1],
      newBest: screen.queryByText("New best"),
      trophy: document.querySelector('fz-icon[name="trophy"]'),
    }).toEqual({ best: "90,000", newBest: null, trophy: null });
  });

  it.each([
    [1, "1 fuzzball brought home", [3]],
    [2, "2 fuzzballs brought home", [3, 4]],
  ])(
    "draws the %i fuzzballs the run brought home, each in its color, and says how many",
    async (strays, words, colors) => {
      const rendered = await renderAt(1, STRAY_WAVES);
      bringStraysHome(rendered.game, strays);

      endAndOpen(rendered);

      const dialog = screen.getByRole("alertdialog");
      expect({
        words: within(dialog)
          .getByText(/brought home/)
          .textContent.trim(),
        pilots: pilotsIn(dialog),
      }).toEqual({ words, pilots: colors.map(inkOf) });
    },
  );

  it("draws a fuzzball brought home that went on to fly a ship gained", async () => {
    const rendered = await renderAt(1, GAINED_WAVES);
    bringStraysHome(rendered.game, 1);
    playUntil(
      rendered.game,
      toPickup,
      () => rendered.game.crew().home.length === 0,
    );

    endAndOpen(rendered);

    expect(pilotsIn(screen.getByRole("alertdialog"))).toEqual([inkOf(3)]);
  });

  it("stays open through a click on the board around it", async () => {
    const { user, game } = await renderLost();

    // A click beside the card targets the <dialog> itself.
    await user.click(screen.getByRole("alertdialog"));

    expect(game.resultOpen()).toBe(true);
  });

  it("says nothing of fuzzballs where none came home", async () => {
    await renderLost();

    expect(screen.queryByText(/brought home/)).not.toBeInTheDocument();
  });

  it("tries again from the sector the run started in, not the one it was lost in", async () => {
    const rendered = await renderAt(1, SECTOR_WAVES);
    clearToNext(rendered.game);
    endAndOpen(rendered);

    await rendered.user.click(
      screen.getByRole("button", { name: "Try again from Near" }),
    );

    expect({
      wave: rendered.game.run().wave,
      outcome: rendered.game.outcome(),
      open: rendered.game.resultOpen(),
    }).toEqual({ wave: 1, outcome: "ready", open: false });
  });

  it("opens on its title, so a key still held from play presses nothing", async () => {
    await renderLost();

    expect(screen.getByRole("heading", { name: "Game over" })).toHaveFocus();
  });

  it("puts the card away, and asks for the sectors", async () => {
    const { user, game, chooseSector } = await renderLost();

    await user.click(screen.getByRole("button", { name: "Choose a sector" }));

    expect({
      open: game.resultOpen(),
      asked: chooseSector.mock.calls.length,
    }).toEqual({
      open: false,
      asked: 1,
    });
  });

  it("puts the card away to look at the board", async () => {
    const { user, game } = await renderLost();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect({ open: game.resultOpen(), closed: game.resultClosed() }).toEqual({
      open: false,
      closed: true,
    });
  });
});
