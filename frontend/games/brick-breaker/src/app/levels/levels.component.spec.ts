import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { LevelEntry } from "../../rules/levels";
import {
  SPEC_LEVEL,
  SPEC_LEVELS,
  TWO_SETS,
  clearToNext,
  provideSpecLevels,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { ProgressService } from "../stats/progress.service";
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

/** Opens the Lives level, as clearing the level before it would. */
function openLives(): void {
  TestBed.inject(ProgressService).recordCleared("few");
}

/** Returns the names of a set's levels, as the dialog lists them under its name. */
function levelsIn(set: string): string[] {
  return within(screen.getByRole("region", { name: set }))
    .getAllByRole("button")
    .map((level) => level.textContent);
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
      ["1 Blasts", "2 Again Locked"],
      ["3 Last Locked"],
    ]);
  });

  it("lists every level of a set", async () => {
    await renderLevels();

    expect(levelsIn("Specs")).toEqual([
      "1 Blasts",
      "2 Wide Locked",
      "3 Steel Locked",
      "4 Few Locked",
      "5 Lives Locked",
      "6 Laser Locked",
      "7 Catch Locked",
      "8 Last Locked",
    ]);
  });

  it("locks a level not yet open, which can't be chosen", async () => {
    const { user, game, closed } = await renderLevels();
    const steel = screen.getByRole("button", { name: "3 Steel Locked" });

    await user.click(steel);

    expect(steel).toHaveAttribute("aria-disabled", "true");
    expect(game.runs()).toBe(0);
    expect(closed).not.toHaveBeenCalled();
  });

  it("shows a level cleared with its best at the speed in play", async () => {
    const { detectChanges } = await renderLevels();

    TestBed.inject(ProgressService).recordCleared("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "normal", 4100);
    detectChanges();

    expect(levelsIn("Specs").slice(0, 2)).toEqual([
      "1 Blasts Best 4100",
      "2 Wide",
    ]);
  });

  it("ticks a level cleared", async () => {
    const { detectChanges } = await renderLevels();

    TestBed.inject(ProgressService).recordCleared("blasts");
    detectChanges();

    // The tick is hidden from assistive technology, which "Cleared" tells.
    expect(
      screen
        .getByRole("button", { name: "1 Blasts Cleared" })
        .querySelector('fz-icon[name="tick"]'),
    ).not.toBeNull();
  });

  it("shows each level's best at the speed in play", async () => {
    const { game, detectChanges } = await renderLevels();
    TestBed.inject(ProgressService).recordCleared("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "normal", 4100);
    TestBed.inject(StatsService).recordLevel("blasts", "fast", 3000);

    await game.changeSpeed("fast");
    detectChanges();

    expect(levelsIn("Specs")[0]).toBe("1 Blasts Best 3000");
  });

  it("says a level was cleared where it has no best at the speed in play", async () => {
    const { detectChanges } = await renderLevels();

    TestBed.inject(ProgressService).recordCleared("blasts");
    TestBed.inject(StatsService).recordLevel("blasts", "fast", 3000);
    detectChanges();

    expect(levelsIn("Specs")[0]).toBe("1 Blasts Cleared");
  });

  it("marks the level of the run on the board", async () => {
    const { game, detectChanges } = await renderLevels();

    clearToNext(game);
    detectChanges();

    expect(screen.getByRole("button", { current: true })).toHaveAccessibleName(
      "2 Wide",
    );
  });

  it("starts a run at the level chosen, and closes", async () => {
    const { user, game, closed, detectChanges } = await renderLevels();
    openLives();
    detectChanges();

    await user.click(screen.getByRole("button", { name: "5 Lives" }));

    expect(game.level().number).toBe(SPEC_LEVEL.lives);
    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open when the player backs out of throwing away a level in play", async () => {
    const { user, game, closed, detectChanges } = await renderLevels();
    openLives();
    detectChanges();
    await game.startAt(SPEC_LEVEL.steel);
    game.launch();
    await user.click(screen.getByRole("button", { name: "5 Lives" }));

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
