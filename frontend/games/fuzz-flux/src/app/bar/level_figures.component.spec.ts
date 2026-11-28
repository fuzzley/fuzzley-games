import { itemAt } from "@fz/core/records";
import { render, screen } from "@testing-library/angular";
import { ELEMENT_RULES, WIND_RULE } from "../../rules/elements/element_rules";
import { levelDealt } from "../../rules/run/saved_game";
import type { Pictures } from "../../scene/pictures";
import { PICTURES } from "../../testing/pictures";
import { SMALL_LEVELS } from "../../testing/small_levels";
import type { RunState } from "../../view/run_state";
import { gridOf, runStateOf } from "../play/shown";
import { LevelFiguresComponent } from "./level_figures.component";

/** Returns what the shell shows of the first of the small levels as it begins, with what a spec changes of it. */
function stateOf(changed: Partial<RunState> = {}): RunState {
  const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
  const inPlay = levelDealt(itemAt(SMALL_LEVELS, 0), 1, rules);
  const { game } = inPlay;
  const beats = {
    goalsLeft: game.goalsLeft,
    movesLow: false,
    card: null,
    starsLit: 0,
    wind: null,
  };
  return { ...runStateOf(inPlay, gridOf(game), beats), ...changed };
}

/** Returns the angle the wind's arrow is turned to, as its style says it. */
function arrowTurn(): string | undefined {
  return document
    .querySelector<HTMLElement>(".way fz-icon")
    ?.style.getPropertyValue("rotate");
}

/** Renders a level's figures, with the pieces' pictures unless told none. */
async function renderFigures(
  state: RunState,
  pictures: Pictures | null = PICTURES,
): Promise<LevelFiguresComponent> {
  const { fixture } = await render(LevelFiguresComponent, {
    inputs: { state, pictures },
  });
  return fixture.componentInstance;
}

describe("LevelFiguresComponent", () => {
  describe("the wind", () => {
    it("shows the way it blows and its moves to turn", async () => {
      await renderFigures(stateOf({ wind: { blows: "right", turnsIn: 3 } }));

      const way = screen.getByText("Wind").nextElementSibling;
      expect([way?.textContent, way?.nextElementSibling?.textContent]).toEqual([
        "right",
        "turns in 3",
      ]);
    });

    it("turns its arrow, which points down, the way it blows", async () => {
      await renderFigures(stateOf({ wind: { blows: "right", turnsIn: 3 } }));

      expect(document.querySelector(".way fz-icon")).toHaveStyle({
        rotate: "-90deg",
      });
    });

    it("turns its arrow the short way round as the wind turns, a quarter at a time", async () => {
      const { fixture } = await render(LevelFiguresComponent, {
        inputs: {
          state: stateOf({ wind: { blows: "left", turnsIn: 1 } }),
          pictures: PICTURES,
        },
      });
      const turns: (string | undefined)[] = [];

      for (const blows of ["down", "right", "up", "left"] as const) {
        fixture.componentRef.setInput(
          "state",
          stateOf({ wind: { blows, turnsIn: 3 } }),
        );
        fixture.detectChanges();
        turns.push(arrowTurn());
      }

      expect(turns).toEqual(["0deg", "-90deg", "-180deg", "-270deg"]);
    });

    it("shows no moves to turn for a wind that never does", async () => {
      await renderFigures(stateOf({ wind: { blows: "up", turnsIn: null } }));

      expect(screen.queryByText(/turns in/)).not.toBeInTheDocument();
    });

    it("shows nothing on a level with none", async () => {
      await renderFigures(stateOf());

      expect(screen.queryByText("Wind")).not.toBeInTheDocument();
    });
  });

  describe("a goal", () => {
    it("shows its picture, its name and what it still asks for", async () => {
      await renderFigures(stateOf());

      const name = screen.getByText("blue");
      expect(name.previousElementSibling?.querySelector("img")).toHaveAttribute(
        "src",
        PICTURES.kinds.blue,
      );
      expect(name.parentElement?.nextElementSibling).toHaveTextContent("3");
    });

    it("keeps its picture's room before the board has baked it", async () => {
      await renderFigures(stateOf(), null);

      expect(
        screen.getByText("blue").previousElementSibling?.querySelector("img"),
      ).toBeNull();
    });

    it("shows a check, said as done, once met", async () => {
      const state = stateOf();
      const [shown] = state.goals;

      await renderFigures({
        ...state,
        goals: shown ? [{ ...shown, left: 0, met: true }] : [],
      });

      expect(
        screen.getByText("blue").parentElement?.nextElementSibling,
      ).toHaveTextContent("done");
    });

    it("hands its picture over for the board's copies to fly to", async () => {
      const figures = await renderFigures(stateOf());

      expect(figures.goalPictures()).toHaveLength(1);
    });
  });

  describe("the moves left", () => {
    it("say their word, the term, then their count", async () => {
      await renderFigures(stateOf({ movesLeft: 14, movesLow: false }));

      expect(screen.getByText("moves").nextElementSibling).toHaveTextContent(
        "14",
      );
    });

    it("say one move as one", async () => {
      await renderFigures(stateOf({ movesLeft: 1 }));

      expect(screen.getByText("move")).toBeInTheDocument();
    });

    it("show in the warning color once low", async () => {
      await renderFigures(stateOf({ movesLeft: 5, movesLow: true }));

      expect(screen.getByText("moves").parentElement).toHaveClass("low");
    });
  });
});
