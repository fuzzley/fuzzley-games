import { TestBed } from "@angular/core/testing";
import { levelsOf } from "@fz/core/levels";
import { itemAt } from "@fz/core/records";
import { render, screen, within } from "@testing-library/angular";
import { levelSetOf } from "../../rules/levels/level";
import type { LevelEntry } from "../../rules/levels/levels";
import { GAPPED_LEVELS, SMALL_LEVELS } from "../../testing/small_levels";
import { GameService } from "../play/game.service";
import { GAME_LEVELS } from "../tokens";
import { BoardGridComponent } from "./board_grid.component";

/** A level on a board 5 squares across and 4 down whose top row is all gaps. */
const TOPLESS_LEVELS: readonly LevelEntry[] = levelsOf([
  levelSetOf({
    id: "topless",
    name: "Topless",
    about: "A level for the grid's specs.",
    levels: [
      {
        id: 1,
        set: "topless",
        name: "Topless",
        idea: "A board whose top row is all gaps.",
        kinds: ["blue", "red", "amber", "green"],
        board: ["_____", "rgarg", "garga", "bbabr"],
        deals: [1],
        stars: [0, 2, 4],
        moves: 5,
        goals: [{ type: "gather", kind: "blue", count: 3 }],
      },
    ],
  }),
]);

/** Describes the grid rendered over a game of a set of levels, and what a spec reads of it. */
interface RenderedGrid {
  readonly component: BoardGridComponent;
  readonly game: GameService;
  readonly detectChanges: () => void;
}

/** Renders the grid over a game of the small levels, or of others. */
async function renderGrid(
  levels: readonly LevelEntry[] = SMALL_LEVELS,
): Promise<RenderedGrid> {
  const { fixture, detectChanges } = await render(BoardGridComponent, {
    providers: [{ provide: GAME_LEVELS, useValue: levels }],
  });
  return {
    component: fixture.componentInstance,
    game: TestBed.inject(GameService),
    detectChanges,
  };
}

/** Returns the squares that hold a tab stop. */
function tabStops(): readonly HTMLElement[] {
  return screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0);
}

describe("BoardGridComponent", () => {
  describe("the board", () => {
    it("is named for the level on it, and described by its keys", async () => {
      await renderGrid();

      const grid = screen.getByRole("grid", {
        name: "Fuzz Flux, level 1: Quick clear",
      });
      expect(grid).toHaveAccessibleDescription(
        /^Arrow keys: move the ring, or swap the fuzzball you hold that way\. /,
      );
    });

    it("is named for the next level as it begins", async () => {
      const { game, detectChanges } = await renderGrid();

      await game.startLevel(3);
      detectChanges();

      expect(
        screen.getByRole("grid", { name: "Fuzz Flux, level 3: Show me" }),
      ).toBeInTheDocument();
    });
  });

  describe("the squares", () => {
    it("are a cell each, and a gap none", async () => {
      await renderGrid(GAPPED_LEVELS);

      expect(screen.getAllByRole("gridcell")).toHaveLength(19);
    });

    it("each say where they lie, past a gap", async () => {
      await renderGrid(GAPPED_LEVELS);

      const bottom = itemAt(screen.getAllByRole("row"), 3);
      const first = itemAt(within(bottom).getAllByRole("gridcell"), 0);
      expect({
        row: bottom.getAttribute("aria-rowindex"),
        column: first.getAttribute("aria-colindex"),
      }).toEqual({ row: "4", column: "2" });
    });

    it("leave out a row of gaps, the grid saying how big the board is", async () => {
      await renderGrid(TOPLESS_LEVELS);

      const grid = screen.getByRole("grid");
      expect({
        rows: grid.getAttribute("aria-rowcount"),
        columns: grid.getAttribute("aria-colcount"),
        first: itemAt(screen.getAllByRole("row"), 0).getAttribute(
          "aria-rowindex",
        ),
      }).toEqual({ rows: "4", columns: "5", first: "2" });
    });
  });

  describe("the tab stop", () => {
    it("is one, on the board's first square", async () => {
      await renderGrid(GAPPED_LEVELS);

      expect(tabStops()).toEqual([screen.getAllByRole("gridcell")[0]]);
    });

    it("takes the focus", async () => {
      const { component } = await renderGrid();

      component.focus();

      expect(tabStops()[0]).toHaveFocus();
    });
  });
});
