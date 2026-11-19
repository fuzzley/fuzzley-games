import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { LevelEntry } from "../../rules/levels/levels";
import {
  SPEC_LEVEL,
  SPEC_LEVELS,
  TWO_SETS,
  clearToNext,
  provideSpecLevels,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { STAR } from "../../rules/run/stars";
import { ProgressService } from "../stats/progress.service";
import { StarsService } from "../stats/stars.service";
import { StatsService } from "../stats/stats.service";
import { LevelsComponent } from "./levels.component";

/** What a spec gets back from rendering the dialog. */
interface RenderedLevels {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly closed: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the dialog, open, over the specs' levels or those given. */
async function renderLevels(
  levels: readonly LevelEntry[] = SPEC_LEVELS,
): Promise<RenderedLevels> {
  const closed = vi.fn();
  const { fixture } = await render(LevelsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: provideSpecLevels(levels),
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    closed,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Keeps a level cleared, as a play that clears it does, with the stars it won: its first alone, unless given. */
function clearLevel(id: string, won: number = STAR.clear): void {
  TestBed.inject(ProgressService).recordCleared(id);
  TestBed.inject(StarsService).recordWon(id, won);
}

/** Opens the Lives level, as clearing the level before it would. */
function openLives(): void {
  clearLevel("few");
}

/** Returns the names of a set's levels, as the dialog lists them under its name. */
function levelsIn(set: string): string[] {
  return within(screen.getByRole("region", { name: set }))
    .getAllByRole("button")
    .map((level) => level.textContent);
}

/** Returns the count of the stars a set's levels hold, beside its name. */
function starsCountOf(set: string): string | undefined {
  return screen.getByRole("heading", { name: set }).nextElementSibling
    ?.textContent;
}

describe("LevelsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(LevelsComponent, {
      inputs: { open: false },
      providers: provideSpecLevels(),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists each set's levels under its name, by number and name", async () => {
    await renderLevels(TWO_SETS);

    expect([levelsIn("First"), levelsIn("Second")]).toEqual([
      ["1 Blasts 0 of 3 stars", "2 Again 0 of 3 stars Locked"],
      ["3 Last 0 of 3 stars Locked"],
    ]);
  });

  it("lists every level of a set", async () => {
    await renderLevels();

    expect(levelsIn("Specs")).toEqual([
      "1 Blasts 0 of 3 stars",
      "2 Wide 0 of 3 stars Locked",
      "3 Steel 0 of 3 stars Locked",
      "4 Few 0 of 3 stars Locked",
      "5 Lives 0 of 3 stars Locked",
      "6 Laser 0 of 3 stars Locked",
      "7 Catch 0 of 3 stars Locked",
      "8 Dare 0 of 3 stars Locked",
      "9 Last 0 of 3 stars Locked",
    ]);
  });

  it("locks a level not yet open, which can't be chosen", async () => {
    const { user, game, closed } = await renderLevels();
    const steel = screen.getByRole("button", {
      name: "3 Steel 0 of 3 stars Locked",
    });

    await user.click(steel);

    expect(steel).toHaveAttribute("aria-disabled", "true");
    expect(game.runs()).toBe(0);
    expect(closed).not.toHaveBeenCalled();
  });

  it("shows a level cleared with its best at the speed in play", async () => {
    const { detectChanges } = await renderLevels();

    clearLevel("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "normal", 4100);
    detectChanges();

    expect(levelsIn("Specs").slice(0, 2)).toEqual([
      "1 Blasts 1 of 3 stars Best 4,100",
      "2 Wide 0 of 3 stars",
    ]);
  });

  it("ticks a level cleared", async () => {
    const { detectChanges } = await renderLevels();

    clearLevel("blasts");
    detectChanges();

    // The tick is hidden from assistive technology, which "Cleared" tells.
    expect(
      screen
        .getByRole("button", { name: "1 Blasts 1 of 3 stars Cleared" })
        .querySelector('fz-icon[name="tick"]'),
    ).not.toBeNull();
  });

  it("shows each level's best at the speed in play", async () => {
    const { game, detectChanges } = await renderLevels();
    clearLevel("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "normal", 4100);
    TestBed.inject(StatsService).recordLevel("blasts", "fast", 3000);

    await game.changeSpeed("fast");
    detectChanges();

    expect(levelsIn("Specs")[0]).toBe("1 Blasts 1 of 3 stars Best 3,000");
  });

  it("says a level was cleared where it has no best at the speed in play", async () => {
    const { detectChanges } = await renderLevels();

    clearLevel("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "fast", 3000);
    detectChanges();

    expect(levelsIn("Specs")[0]).toBe("1 Blasts 1 of 3 stars Cleared");
  });

  it("draws a level's three stars, filled where held and outlined where not, and says how many it holds", async () => {
    const { detectChanges } = await renderLevels();

    clearLevel("blasts", STAR.clear | STAR.streak);
    detectChanges();

    const blasts = screen.getByRole("button", {
      name: "1 Blasts 2 of 3 stars Cleared",
    });
    expect(
      [...blasts.querySelectorAll(".stars svg")].map((star) =>
        star.classList.contains("filled"),
      ),
    ).toEqual([true, false, true]);
  });

  it("counts the stars each set's levels hold, by its name", async () => {
    const { detectChanges } = await renderLevels(TWO_SETS);

    clearLevel("blasts", STAR.clear | STAR.clean);
    detectChanges();

    expect([starsCountOf("First"), starsCountOf("Second")]).toEqual([
      "2 of 6 stars",
      "0 of 3 stars",
    ]);
  });

  it("says where choosing a level starts, and what clearing it unlocks", async () => {
    await renderLevels();

    expect(screen.getByText(/^Choose a level/)).toHaveTextContent(
      "Choose a level to start a new game there. Clearing a level unlocks the next one. If you've cleared a level at this speed, it shows your best score.",
    );
  });

  it("says what stars are for, and how many every level holds", async () => {
    const { detectChanges } = await renderLevels();

    clearLevel("blasts", STAR.clear | STAR.clean | STAR.streak);
    clearLevel("wide");
    detectChanges();

    expect(screen.getByText(/^Each level has 3 stars/)).toHaveTextContent(
      "Each level has 3 stars: 1 for clearing it, 1 for not losing a life, and 1 for reaching the streak shown before the level starts. Stars don't unlock anything. You have 4.",
    );
  });

  it("marks the level of the run on the board", async () => {
    const { game, detectChanges } = await renderLevels();

    clearToNext(game);
    detectChanges();

    expect(screen.getByRole("button", { current: true })).toHaveAccessibleName(
      "2 Wide 0 of 3 stars",
    );
  });

  it("starts a run at the level chosen, and closes", async () => {
    const { user, game, closed, detectChanges } = await renderLevels();
    openLives();
    detectChanges();

    await user.click(
      screen.getByRole("button", { name: "5 Lives 0 of 3 stars" }),
    );

    expect(game.level().number).toBe(SPEC_LEVEL.lives);
    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open when the player backs out of throwing away a level in play", async () => {
    const { user, game, closed, detectChanges } = await renderLevels();
    openLives();
    detectChanges();
    await game.startAt(SPEC_LEVEL.steel);
    game.launch();
    await user.click(
      screen.getByRole("button", { name: "5 Lives 0 of 3 stars" }),
    );

    TestBed.inject(ConfirmService).cancel();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(game.level().number).toBe(SPEC_LEVEL.steel);
    expect(closed).not.toHaveBeenCalled();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderLevels();

    await user.click(screen.getByRole("button", { name: "Close levels" }));

    expect(closed).toHaveBeenCalledOnce();
  });
});
