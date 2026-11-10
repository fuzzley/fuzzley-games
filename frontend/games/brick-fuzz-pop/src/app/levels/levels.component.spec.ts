import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import {
  LEVELS,
  type LevelEntry,
  type LevelSetData,
  levelsOf,
} from "../../rules/levels/levels";
import { type LevelMark, LevelsComponent } from "./levels.component";

/** What a spec renders the dialog with, but what it leaves to the defaults. */
interface LevelsInputs {
  readonly marks?: Readonly<Record<string, LevelMark>>;
  readonly current?: number | null;
  readonly levels?: readonly LevelEntry[];
}

/** What a spec gets back from rendering the dialog: what it emitted. */
interface RenderedLevels {
  readonly chosen: ReturnType<typeof vi.fn>;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** A level open and never cleared. */
const OPEN: LevelMark = { open: true, stars: 0, best: null };

/** Returns a set of levels as its file holds them, each named for its id. */
function setOf(id: string, levelIds: readonly string[]): LevelSetData {
  return {
    id,
    name: `The ${id}`,
    levels: levelIds.map((levelId) => ({
      id: levelId,
      name: levelId,
      boon: "hot",
      bricks: [],
    })),
  };
}

/** Two sets of levels, two in the first and one in the second. */
const TWO_SETS = levelsOf([setOf("first", ["a", "b"]), setOf("second", ["c"])]);

/** Renders the dialog, open, with the inputs given, every level locked unless they say. */
async function renderLevels({
  marks = {},
  current = null,
  levels,
}: LevelsInputs = {}): Promise<RenderedLevels> {
  const chosen = vi.fn();
  const closed = vi.fn();
  await render(LevelsComponent, {
    inputs: {
      open: true,
      marks,
      current,
      ...(levels === undefined ? {} : { levels }),
    },
    on: { chosen, closed },
  });
  return { chosen, closed };
}

/** Returns the names of a set's levels, as the dialog lists them under its name. */
function levelsIn(set: string): string[] {
  return within(screen.getByRole("region", { name: set }))
    .getAllByRole("button")
    .map((level) => level.textContent.replace(/\s+/g, " ").trim());
}

/** Returns a level's button, by the start of its name. */
function levelButton(name: RegExp): HTMLElement {
  return screen.getByRole("button", { name });
}

describe("LevelsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(LevelsComponent, { inputs: { open: false, marks: {} } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists each set's levels under its name, by number and name", async () => {
    await renderLevels({
      levels: TWO_SETS,
      marks: { a: OPEN, b: OPEN, c: OPEN },
    });

    expect([levelsIn("The first"), levelsIn("The second")]).toEqual([
      ["1 a", "2 b"],
      ["3 c"],
    ]);
  });

  it("offers the game's own levels unless handed others", async () => {
    const allOpen = Object.fromEntries(
      LEVELS.map(({ data }) => [data.id, OPEN]),
    );
    await renderLevels({ marks: allOpen });

    expect(
      screen
        .getAllByRole("region")
        .flatMap((set) => within(set).getAllByRole("button"))
        .map((level) => level.textContent.replace(/\s+/g, " ").trim()),
    ).toEqual(
      LEVELS.map(({ number, data }) => `${String(number)} ${data.name}`),
    );
  });

  it.each([
    [1, "1 of 3 stars"],
    [2, "2 of 3 stars"],
    [3, "3 of 3 stars"],
  ])(
    "shows a level cleared with %i stars as many, says so, and its best",
    async (stars, words) => {
      await renderLevels({
        levels: TWO_SETS,
        marks: { a: { open: true, stars, best: 1240 } },
      });

      const level = levelButton(/^1 a/);
      expect({
        name: level.textContent.replace(/\s+/g, " ").trim(),
        stars: level.querySelectorAll('fz-icon[name="star"]').length,
      }).toEqual({ name: `1 a ${words} Best 1,240`, stars });
    },
  );

  it("shows a cleared level's stars alone where it has no best", async () => {
    await renderLevels({
      levels: TWO_SETS,
      marks: { a: { open: true, stars: 1, best: null } },
    });

    expect(levelsIn("The first")).toEqual(["1 a 1 of 3 stars", "2 b Locked"]);
  });

  it("shows no stars or best on a level open and not yet cleared", async () => {
    await renderLevels({
      levels: TWO_SETS,
      marks: { a: { open: true, stars: 0, best: 800 } },
    });

    const level = levelButton(/^1 a/);
    expect({
      name: level.textContent.replace(/\s+/g, " ").trim(),
      icons: level.querySelectorAll("fz-icon").length,
    }).toEqual({ name: "1 a", icons: 0 });
  });

  it("starts a run at an open level as it is chosen", async () => {
    const { chosen } = await renderLevels({
      levels: TWO_SETS,
      marks: { a: OPEN, b: OPEN },
    });

    await userEvent.click(levelButton(/^2 b/));

    expect(chosen.mock.calls).toEqual([[2]]);
  });

  it("shows a locked level, which can't be chosen", async () => {
    const { chosen } = await renderLevels({
      levels: TWO_SETS,
      marks: { a: OPEN, b: { open: false, stars: 0, best: null } },
    });

    const locked = levelButton(/^2 b/);
    await userEvent.click(locked);

    expect({
      disabled: locked.getAttribute("aria-disabled"),
      chosen: chosen.mock.calls,
    }).toEqual({ disabled: "true", chosen: [] });
  });

  it("marks the level of the run on the board, and no other", async () => {
    await renderLevels({
      levels: TWO_SETS,
      marks: { a: OPEN, b: OPEN },
      current: 2,
    });

    expect(
      screen
        .getAllByRole("button", { current: true })
        .map((level) => level.textContent.replace(/\s+/g, " ").trim()),
    ).toEqual(["2 b"]);
  });

  it("marks no level where no run is on the board", async () => {
    await renderLevels({ levels: TWO_SETS, marks: { a: OPEN } });

    expect(screen.queryAllByRole("button", { current: true })).toHaveLength(0);
  });

  it("asks to close from its close button", async () => {
    const { closed } = await renderLevels();

    await userEvent.click(screen.getByRole("button", { name: "Close levels" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", async () => {
    const { closed } = await renderLevels();

    await userEvent.keyboard("{Escape}");

    expect(closed).toHaveBeenCalledOnce();
  });
});
