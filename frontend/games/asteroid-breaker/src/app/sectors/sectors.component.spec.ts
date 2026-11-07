import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { FIRST_SHIPS } from "../../rules/tuning";
import type { WaveEntry } from "../../rules/waves/waves";
import {
  FRAME_MS,
  SECTOR_WAVES,
  SPEC_WAVES,
  clearToNext,
  provideSpecWaves,
  shoot,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { SectorsComponent } from "./sectors.component";

/** What a spec gets back from rendering the dialog. */
interface RenderedSectors {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly closed: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the dialog, open, over the specs' two sectors or the waves given. */
async function renderSectors(
  waves: readonly WaveEntry[] = SECTOR_WAVES,
): Promise<RenderedSectors> {
  const closed = vi.fn();
  const { fixture } = await render(SectorsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: provideSpecWaves(waves),
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

/** Returns each sector's button as the dialog names it. */
function sectorNames(): string[] {
  return within(screen.getByRole("list"))
    .getAllByRole("button")
    .map((button) => button.textContent);
}

/** Opens the far sector, as reaching it would. */
function reachFar(): void {
  TestBed.inject(ProgressService).recordReached("far");
}

describe("SectorsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SectorsComponent, {
      inputs: { open: false },
      providers: provideSpecWaves(SECTOR_WAVES),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists each sector by its name and waves, locked until reached", async () => {
    await renderSectors();

    expect(sectorNames()).toEqual([
      "Near Wave 1",
      "Far Waves 2 to 3 Locked",
      "Endless From wave 4 Locked",
    ]);
  });

  it("says the waves of a sector of more than one", async () => {
    await renderSectors(SPEC_WAVES);

    expect(sectorNames()).toEqual([
      "Specs Waves 1 to 3",
      "Endless From wave 4 Locked",
    ]);
  });

  it("locks a sector not yet reached, which can't be chosen", async () => {
    const { user, game, closed } = await renderSectors();
    const far = screen.getByRole("button", { name: "Far Waves 2 to 3 Locked" });

    await user.click(far);

    expect(far).toHaveAttribute("aria-disabled", "true");
    expect(game.runs()).toBe(0);
    expect(closed).not.toHaveBeenCalled();
  });

  it("shows each sector's best at the speed in play", async () => {
    const { game, detectChanges } = await renderSectors();
    reachFar();
    const stats = TestBed.inject(StatsService);
    stats.recordEnd({ speed: "normal", score: 4100, wave: 2, sector: "near" });
    stats.recordEnd({ speed: "fast", score: 3000, wave: 2, sector: "far" });

    await game.changeSpeed("fast");
    detectChanges();

    expect(sectorNames()).toEqual([
      "Near Wave 1",
      "Far Waves 2 to 3 Best 3,000",
      "Endless From wave 4 Locked",
    ]);
  });

  it("marks the sector of the wave on the board", async () => {
    const { game, detectChanges } = await renderSectors();

    clearToNext(game);
    detectChanges();

    expect(screen.getByRole("button", { current: true })).toHaveAccessibleName(
      "Far Waves 2 to 3",
    );
  });

  it("starts a run at the first wave of the sector chosen, and closes", async () => {
    const { user, game, closed, detectChanges } = await renderSectors();
    reachFar();
    detectChanges();

    await user.click(screen.getByRole("button", { name: "Far Waves 2 to 3" }));

    expect(game.wave().number).toBe(2);
    expect(closed).toHaveBeenCalledOnce();
  });

  it("starts a run in Endless once a run has reached it, at its first wave", async () => {
    const { user, game, detectChanges } = await renderSectors();
    TestBed.inject(ProgressService).recordReached("endless");
    detectChanges();

    await user.click(
      screen.getByRole("button", { name: "Endless From wave 4" }),
    );

    expect({ wave: game.wave().number, ships: game.ships() }).toEqual({
      wave: 4,
      ships: FIRST_SHIPS,
    });
  });

  it("stays open when the player backs out of throwing away a run under way", async () => {
    const { user, game, closed, detectChanges } = await renderSectors();
    reachFar();
    detectChanges();
    game.tick(FRAME_MS, shoot(game));
    await user.click(screen.getByRole("button", { name: "Far Waves 2 to 3" }));

    TestBed.inject(ConfirmService).cancel();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(game.wave().number).toBe(1);
    expect(closed).not.toHaveBeenCalled();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSectors();

    await user.click(screen.getByRole("button", { name: "Close sectors" }));

    expect(closed).toHaveBeenCalledOnce();
  });
});
