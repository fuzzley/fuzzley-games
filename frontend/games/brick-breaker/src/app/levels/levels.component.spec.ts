import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { GameService } from "../play/game.service";
import { LevelsComponent } from "./levels.component";

/** What a spec gets back from rendering the dialog. */
interface RenderedLevels {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly closed: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the dialog, open, over the specs' levels. */
async function renderLevels(): Promise<RenderedLevels> {
  const closed = vi.fn();
  const { fixture } = await render(LevelsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: provideSpecLevels(),
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

describe("LevelsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(LevelsComponent, {
      inputs: { open: false },
      providers: provideSpecLevels(),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists each set's levels under its name, by number and name", async () => {
    await renderLevels();

    expect(
      within(screen.getByRole("region", { name: "Specs" }))
        .getAllByRole("button")
        .map((level) => level.textContent),
    ).toEqual([
      "1 Blasts",
      "2 Wide",
      "3 Steel",
      "4 Few",
      "5 Lives",
      "6 Laser",
      "7 Catch",
      "8 Last",
    ]);
  });

  it("marks the level of the run on the board", async () => {
    const { game, detectChanges } = await renderLevels();

    await game.startAt(SPEC_LEVEL.steel);
    detectChanges();

    expect(screen.getByRole("button", { current: true })).toHaveAccessibleName(
      "3 Steel",
    );
  });

  it("starts a run at the level chosen, and closes", async () => {
    const { user, game, closed } = await renderLevels();

    await user.click(screen.getByRole("button", { name: "5 Lives" }));

    expect(game.level().number).toBe(SPEC_LEVEL.lives);
    expect(closed).toHaveBeenCalledOnce();
  });

  it("stays open when the player backs out of throwing away a level in play", async () => {
    const { user, game, closed } = await renderLevels();
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
