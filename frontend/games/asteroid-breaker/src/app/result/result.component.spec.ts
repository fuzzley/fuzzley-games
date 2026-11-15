import { TestBed } from "@angular/core/testing";
import { playUntil } from "@fz/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  MemoryStorage,
  figure,
  figures,
  provideMemoryStorage,
} from "@fz/ui/testing";
import { STILL } from "../../rules/ship/ship";
import type { WaveEntry } from "../../rules/waves/waves";
import { inkOf, pilotsIn } from "../../testing/pilots";
import {
  ONE_STRAY_WAVES,
  SECTOR_WAVES,
  SPEC_WAVE,
  STRAY_WAVES,
  bringStraysHome,
  clearToNext,
  endRun,
  provideSpecWaves,
} from "../../testing/play";
import { runRecords } from "../../testing/records";
import { GameService } from "../play/game.service";
import { STATS_KEY, StatsService } from "../stats/stats.service";
import { TUNING } from "../tokens";
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

/**
 * Returns what the card shows of the fuzzballs who flew: the words a screen
 * reader hears for them, and their colors, in order.
 */
function flewIn(): { words: string; pilots: string[] } {
  const label = screen.getByText("The fuzzballs who flew");
  const row = label.parentElement?.querySelector("app-pilot-row");
  if (!row) throw new Error("No fuzzballs who flew drawn.");
  return { words: row.textContent.trim(), pilots: pilotsIn(row) };
}

/** Ends the run in play, and plays until its card opens. */
function endAndOpen({ game, detectChanges }: RenderedResult): void {
  endRun(game);
  playUntil(game, () => STILL, game.resultOpen);
  detectChanges();
}

/**
 * Renders the card over a run lost on its second wave, the card open, with a
 * best kept before it if given.
 */
async function renderLost(bestBefore = 0): Promise<RenderedResult> {
  const rendered = await renderAt(SPEC_WAVE.pebble);
  TestBed.inject(StatsService).record(
    runRecords({ ended: { score: bestBefore, wave: 1, sector: "specs" } }),
  );
  clearToNext(rendered.game);
  endAndOpen(rendered);
  return rendered;
}

/**
 * Keeps a best at Normal speed in the player's browser, as a build before
 * the rules were numbered kept it, so made under earlier rules, for the
 * card to take up.
 */
function keepEarlierBest(best: number): void {
  const storage = new MemoryStorage();
  storage.setItem(
    STATS_KEY,
    JSON.stringify({
      version: 1,
      speeds: { normal: { runs: 1, best, furthest: 2, strays: 0 } },
    }),
  );
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
}

describe("ResultComponent", () => {
  it("stays shut while a run goes on", async () => {
    await renderAt(SPEC_WAVE.pebble);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("says everyone is home, the wave the run ended on and at what speed, the score and the best it set", async () => {
    await renderLost();

    expect(
      screen.getByRole("alertdialog", { name: "Everyone is home." }),
    ).toHaveAccessibleDescription(
      "The run ended on wave 2, Gift, at Normal speed. Score 1,180. A new best!",
    );
  });

  it("shows where the run ended and at what speed under its title", async () => {
    await renderLost();

    expect(
      screen.getByText("The run ended on wave 2, Gift, at Normal speed"),
    ).toBeVisible();
  });

  it("says the score alone of a run that fell short of the best", async () => {
    await renderLost(90_000);

    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
      "The run ended on wave 2, Gift, at Normal speed. Score 1,180.",
    );
  });

  it("keeps what it says as it opens out of the card read through", async () => {
    await renderLost();

    expect(screen.getByText(/Score 1,180/u)).not.toBeVisible();
  });

  it("says a run ended in Endless ended there", async () => {
    const rendered = await renderAt(SPEC_WAVE.last + 1);

    endAndOpen(rendered);

    expect(
      screen.getByRole("alertdialog", { name: "Everyone is home." }),
    ).toHaveAccessibleDescription(
      /^The run ended on wave 4, Endless, at Normal speed\. /u,
    );
  });

  it("says a run from the first wave that went on into Endless cleared all thirty", async () => {
    const rendered = await renderAt(SPEC_WAVE.pebble);
    clearToNext(rendered.game);
    clearToNext(rendered.game);
    clearToNext(rendered.game);

    endAndOpen(rendered);

    expect(screen.getByText("Cleared all thirty")).toBeVisible();
    expect(screen.getByRole("alertdialog")).toHaveAccessibleDescription(
      / Cleared all thirty!$/u,
    );
  });

  it("says nothing of clearing all thirty for a run from a later wave, however many it cleared", async () => {
    const rendered = await renderAt(SPEC_WAVE.gift);
    clearToNext(rendered.game);
    clearToNext(rendered.game);
    clearToNext(rendered.game);

    endAndOpen(rendered);

    expect(screen.queryByText("Cleared all thirty")).not.toBeInTheDocument();
  });

  it("shows the score, the best, the wave reached and the waves cleared", async () => {
    await renderLost();

    expect(figures()).toEqual([
      ["Score", "1,180"],
      ["Best", "1,180"],
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
      best: figure("Best"),
      newBest: screen.queryByText("New best"),
      trophy: document.querySelector('fz-icon[name="trophy"]'),
    }).toEqual({ best: "90,000", newBest: null, trophy: null });
  });

  it("says a best was made under earlier rules, where a run that keeps no records leaves it standing", async () => {
    keepEarlierBest(90_000);
    const rendered = await renderAt(SPEC_WAVE.pebble);
    // A run flown on numbers the debug menu tuned keeps no records.
    TestBed.inject(TUNING).tune("rockSpeed", 1.5);

    endAndOpen(rendered);

    expect({
      best: figure("Best, earlier rules"),
      newBest: screen.queryByText("New best"),
    }).toEqual({ best: "90,000", newBest: null });
  });

  it("calls any score a new best over a best made under earlier rules", async () => {
    keepEarlierBest(90_000);

    await renderLost();

    expect({
      best: figure("Best"),
      newBest: screen.queryByText("New best") !== null,
    }).toEqual({ best: "1,180", newBest: true });
  });

  it("draws every fuzzball who flew, each in its color, in the order they went home, and says how many", async () => {
    await renderLost();

    expect(flewIn()).toEqual({
      words: "3 fuzzballs",
      pilots: [0, 2, 1].map(inkOf),
    });
  });

  // As many strays as it brings home, so ending the run catches no more; the
  // strays, 3 and 4, ride last in tow, so a hit knocks them loose first, and
  // those still floating loose as the run ends go home after its pilot.
  it.each([
    [
      1,
      ONE_STRAY_WAVES,
      "4 fuzzballs, 1 of them a stray brought home",
      [0, 3, 2, 1],
    ],
    [
      2,
      STRAY_WAVES,
      "5 fuzzballs, 2 of them strays brought home",
      [4, 3, 2, 0, 1],
    ],
  ])(
    "draws the %i strays the run brought home among those who flew, and counts them",
    async (strays, waves, words, colors) => {
      const rendered = await renderAt(1, waves);
      bringStraysHome(rendered.game, strays);

      endAndOpen(rendered);

      expect(flewIn()).toEqual({ words, pilots: colors.map(inkOf) });
    },
  );

  it("stays open through a click on the board around it", async () => {
    const { user, game } = await renderLost();

    // A click beside the card targets the <dialog> itself.
    await user.click(screen.getByRole("alertdialog"));

    expect(game.resultOpen()).toBe(true);
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

    expect(
      screen.getByRole("heading", { name: "Everyone is home." }),
    ).toHaveFocus();
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
