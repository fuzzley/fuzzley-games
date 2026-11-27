import { TestBed } from "@angular/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { squareOf } from "../../rules/board/cells";
import { BoardFrames } from "../../testing/board_frames";
import { BLUE_LINE, SEEDED_LEVELS } from "../../testing/small_levels";
import { TUNING_SLIDERS } from "../../view/debug/tuning_menu";
import { FEEL } from "../../view/timeline/feel";
import { provideFuzzFluxBugReports } from "../bug_report/fuzz_flux_bug_reports";
import { GameService } from "../play/game.service";
import { VIEW_KIT } from "../play/view_kit";
import { ProgressService } from "../stats/progress.service";
import { GAME_LEVELS } from "../tokens";
import { DebugMenuComponent } from "./debug_menu.component";
import { DebugService } from "./debug.service";

/** Renders the debug menu, the game on the third of the small levels, dealt on seeds unlike their numbers and opened by the second cleared, and returns how often it said it played something. */
async function renderMenu(): Promise<{ played: ReturnType<typeof vi.fn> }> {
  const played = vi.fn();
  const { fixture } = await render(DebugMenuComponent, {
    on: { played },
    providers: [
      { provide: GAME_LEVELS, useValue: SEEDED_LEVELS },
      { provide: DEBUG_MENU, useValue: true },
      provideMemoryStorage(new MemoryStorage()),
      provideFuzzFluxBugReports(),
    ],
  });
  const game = TestBed.inject(GameService);
  game.useView(VIEW_KIT);
  TestBed.inject(ProgressService).recordCleared("2");
  await game.startLevel(3);
  await fixture.whenStable();
  return { played };
}

/** Returns the slider of a number of the feel. */
function slider(id: string): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>("slider", { name: id });
}

describe("DebugMenuComponent", () => {
  it("offers a slider for each number of the feel, at the design's", async () => {
    await renderMenu();

    expect({
      sliders: screen.getAllByRole("slider").length,
      swap: slider("swapMs").valueAsNumber,
    }).toEqual({ sliders: TUNING_SLIDERS.length, swap: FEEL.swapMs });
  });

  it("tunes a number as its slider moves, and says the level keeps no records", async () => {
    await renderMenu();

    fireEvent.input(slider("swapMs"), { target: { value: "200" } });

    expect({
      tuned: TestBed.inject(DebugService).tuning.tuning().swapMs,
      status: screen.getByText("This level keeps no records"),
    }).toEqual({ tuned: 200, status: expect.toBeVisible() as unknown });
  });

  it("puts every number back at Reset the numbers", async () => {
    await renderMenu();
    fireEvent.input(slider("swapMs"), { target: { value: "200" } });

    await userEvent.click(
      screen.getByRole("button", { name: "Reset the numbers" }),
    );

    expect(TestBed.inject(DebugService).tuning.tuning()).toEqual(FEEL);
  });

  it("writes the numbers moved as the lines of FEEL they would replace", async () => {
    await renderMenu();

    fireEvent.input(slider("swapMs"), { target: { value: "200" } });

    expect(
      screen.getByText(/^\/\/ src\/view\/timeline\/feel\.ts/),
    ).toHaveTextContent("swapMs: 200,");
  });

  it("offers each of the level's deals by its number and its seed, the one in play chosen", async () => {
    await renderMenu();
    await TestBed.inject(GameService).playDeal(2);
    TestBed.tick();

    const list = screen.getByRole("combobox", { name: "Deal" });

    expect({
      deals: within(list)
        .getAllByRole("option")
        .map((option) => option.textContent.trim()),
      chosen: (list as HTMLSelectElement).value,
    }).toEqual({
      deals: ["Deal 1, seed 7", "Deal 2, seed 11", "Deal 3, seed 13"],
      chosen: "2",
    });
  });

  it("says what Play the deal plays, and that it keeps no records", async () => {
    await renderMenu();

    expect(
      screen.getByRole("button", { name: "Play the deal" }),
    ).toHaveAccessibleDescription(
      "Plays level 3 again with the deal you pick. It keeps no records, even if you press Restart.",
    );
  });

  it("plays the deal chosen, off the record, and says so to the drawer", async () => {
    const { played } = await renderMenu();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Deal" }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "Play the deal" }));

    await vi.waitFor(() => {
      expect(played).toHaveBeenCalledOnce();
    });
    expect({
      deal: TestBed.inject(GameService).inPlay().deal,
      offRecord: TestBed.inject(DebugService).offRecord(),
    }).toEqual({ deal: 13, offRecord: true });
  });

  it("keeps the drawer open where the player keeps the moves made", async () => {
    const { played } = await renderMenu();
    const game = TestBed.inject(GameService);
    new BoardFrames(game).tap(
      squareOf(BLUE_LINE.from, 5),
      squareOf(BLUE_LINE.to, 5),
    );
    const confirm = TestBed.inject(ConfirmService);

    await userEvent.click(
      screen.getByRole("button", { name: "Play the deal" }),
    );
    confirm.cancel();
    await vi.waitFor(() => {
      expect(confirm.isOpen()).toBe(false);
    });

    expect({
      played: played.mock.calls.length,
      moves: game.inPlay().moves,
    }).toEqual({
      played: 0,
      moves: [BLUE_LINE],
    });
  });

  it("offers to load a reported game, saying it keeps no records", async () => {
    await renderMenu();

    expect(
      screen.getByRole("textbox", { name: "Load game state" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /^If you load a game from a report, it keeps no records/,
      ),
    ).toBeInTheDocument();
  });
});
