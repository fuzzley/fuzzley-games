import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { squareOf } from "../../rules/board/cells";
import { BoardFrames } from "../../testing/board_frames";
import { BLUE_LINE, SMALL_LEVELS } from "../../testing/small_levels";
import { GameService } from "../play/game.service";
import { VIEW_KIT } from "../play/view_kit";
import { GAME_LEVELS } from "../tokens";
import { ChooseLevelComponent } from "./choose_level.component";

/** Returns a store holding the progress and the records a visit before kept. */
function storedPlay(
  cleared: readonly string[],
  levels: unknown,
): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(
    "fuzz-flux-progress",
    JSON.stringify({ version: 1, cleared }),
  );
  storage.setItem("fuzz-flux-records", JSON.stringify({ version: 1, levels }));
  return storage;
}

/** Renders Choose a level open over the small levels, the play a visit before kept in a store, and returns how often it asked to close. */
async function renderLevels(
  storage = new MemoryStorage(),
): Promise<{ closed: ReturnType<typeof vi.fn> }> {
  const closed = vi.fn();
  await render(ChooseLevelComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [
      provideMemoryStorage(storage),
      { provide: GAME_LEVELS, useValue: SMALL_LEVELS },
    ],
  });
  return { closed };
}

/** Returns what a level's button says, by its number. */
function levelSays(number: number): string {
  return screen
    .getByRole("button", { name: new RegExp(`^${String(number)} `) })
    .textContent.replace(/\s+/g, " ")
    .trim();
}

describe("ChooseLevelComponent", () => {
  it("says how a level unlocks, and what a level's best is", async () => {
    await renderLevels();

    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("paragraph")
        .map((paragraph) => paragraph.textContent),
    ).toEqual([
      "Clear a level to unlock the next one. Best is the most moves you've had to spare.",
    ]);
  });

  it("lists each set's levels under its name", async () => {
    await renderLevels();

    expect(screen.getByRole("region", { name: "Small" })).toBeInTheDocument();
  });

  it("opens the first level, every level cleared and the one after each", async () => {
    await renderLevels(storedPlay(["2"], {}));

    expect([1, 2, 3, 4].map(levelSays)).toEqual([
      "1 Quick clear",
      "2 Last move",
      "3 Show me",
      "4 Puff Locked",
    ]);
  });

  it("shows a level cleared with its most stars, and its most moves to spare as its best", async () => {
    await renderLevels(storedPlay(["1"], { "1": { stars: 2, spare: 3 } }));

    expect(levelSays(1)).toBe("1 Quick clear 2 of 3 stars Best 3");
  });

  it("marks the level in play", async () => {
    await renderLevels();

    expect(screen.getByRole("button", { current: true }).textContent).toContain(
      "Quick clear",
    );
  });

  it("plays the level chosen and closes", async () => {
    const { closed } = await renderLevels(storedPlay(["1"], {}));

    await userEvent.click(screen.getByRole("button", { name: /^2 / }));

    expect({
      level: TestBed.inject(GameService).state().level.number,
      closed: closed.mock.calls.length,
    }).toEqual({ level: 2, closed: 1 });
  });

  it("stays open, the level in play kept, where the player keeps it", async () => {
    const { closed } = await renderLevels(storedPlay(["1"], {}));
    const game = TestBed.inject(GameService);
    game.useView(VIEW_KIT);
    await game.startLevel(3);
    new BoardFrames(game).tap(
      squareOf(BLUE_LINE.from, 5),
      squareOf(BLUE_LINE.to, 5),
    );
    vi.spyOn(TestBed.inject(ConfirmService), "ask").mockResolvedValue(false);

    await userEvent.click(screen.getByRole("button", { name: /^2 / }));

    expect({
      level: game.state().level.number,
      closed: closed.mock.calls.length,
    }).toEqual({ level: 3, closed: 0 });
  });
});
