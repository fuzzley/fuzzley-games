import { itemAt } from "@fz/core/records";
import { installFakeViewport } from "@fz/game-ui/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { ELEMENT_RULES, WIND_RULE } from "../../rules/elements/element_rules";
import { levelDealt } from "../../rules/run/saved_game";
import { PICTURES } from "../../testing/pictures";
import { SMALL_LEVELS } from "../../testing/small_levels";
import type { RunState } from "../../view/run_state";
import { gridOf, runStateOf } from "../play/shown";
import { BarComponent } from "./bar.component";

/** Returns what the shell shows of the third of the small levels as it begins. */
function stateOfLevel3(): RunState {
  const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
  const inPlay = levelDealt(itemAt(SMALL_LEVELS, 2), 1, rules);
  const { game } = inPlay;
  const beats = { goalsLeft: game.goalsLeft, movesLow: false, card: null };
  return runStateOf(inPlay, gridOf(game), beats);
}

/** Renders the bar over the third of the small levels, beside the board's panels where `panelled` says, and returns what it asks for. */
async function renderBar(panelled = false): Promise<string[]> {
  const asked: string[] = [];
  await render(BarComponent, {
    inputs: { state: stateOfLevel3(), pictures: PICTURES, panelled },
    on: {
      hint: () => asked.push("hint"),
      restart: () => asked.push("restart"),
    },
  });
  return asked;
}

describe("BarComponent", () => {
  it("names the game in the page's one heading", async () => {
    await renderBar();

    expect(
      screen.getByRole("heading", { level: 1, name: "Fuzz Flux" }),
    ).toBeInTheDocument();
  });

  it("shows the level's number and name", async () => {
    await renderBar();

    expect(screen.getByText("Level 3")).toBeInTheDocument();
    expect(screen.getByText("Show me")).toBeInTheDocument();
  });

  it("shows the level's figures", async () => {
    await renderBar();

    expect(screen.getByText("moves")).toBeInTheDocument();
  });

  it("asks for a hint at Hint", async () => {
    const asked = await renderBar();

    await userEvent.click(screen.getByRole("button", { name: "Hint" }));

    expect(asked).toEqual(["hint"]);
  });

  it("keeps the focus where it is as Hint is pressed, so the board keeps it", async () => {
    await renderBar();
    const hint = screen.getByRole("button", { name: "Hint" });

    await userEvent.click(hint);

    expect(hint).not.toHaveFocus();
  });

  it("asks to restart at Restart", async () => {
    const asked = await renderBar();

    await userEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(asked).toEqual(["restart"]);
  });

  it("leaves the level, its figures and its buttons to the panels beside the board", async () => {
    await renderBar(true);

    expect(
      screen.queryByText(/Level 3|moves|Hint|Restart/),
    ).not.toBeInTheDocument();
  });

  it("keeps the heading beside the panels", async () => {
    await renderBar(true);

    expect(
      screen.getByRole("heading", { level: 1, name: "Fuzz Flux" }),
    ).toBeInTheDocument();
  });

  it("stands at the bottom of a phone held upright", async () => {
    installFakeViewport(390, 844);

    await renderBar();

    expect(document.querySelector("fz-game-bar")).toHaveAttribute(
      "data-placement",
      "bottom",
    );
  });
});
