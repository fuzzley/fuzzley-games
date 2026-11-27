import { itemAt } from "@fz/core/records";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { ELEMENT_RULES, WIND_RULE } from "../../rules/elements/element_rules";
import { levelDealt } from "../../rules/run/saved_game";
import type { Pictures } from "../../scene/pictures";
import { PICTURES } from "../../testing/pictures";
import { SMALL_LEVELS } from "../../testing/small_levels";
import type { Card, RunState } from "../../view/run_state";
import { gridOf, runStateOf } from "../play/shown";
import { type CardChoice, LevelCardComponent } from "./level_card.component";

/** Describes what the shell shows at a level's end, as a spec sets it. */
interface Ending {
  readonly card: Card | null;
  readonly starsLit?: number;
  /** What each goal still asks for. */
  readonly goalsLeft?: readonly number[];
}

/** Returns what the shell shows of the third of the small levels, which asks for 20 blue and 20 red, at its end as given. */
function stateAt({
  card,
  starsLit = 0,
  goalsLeft = [20, 20],
}: Ending): RunState {
  const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
  const inPlay = levelDealt(itemAt(SMALL_LEVELS, 2), 1, rules);
  const beats = { goalsLeft, movesLow: false, card, starsLit };
  return runStateOf(inPlay, gridOf(inPlay.game), beats);
}

/** Describes how a card is rendered. */
interface Rendering {
  readonly pictures?: Pictures | null;
  readonly nextLevel?: boolean;
}

/** Renders the card over the level's end, and returns what its buttons ask for. */
async function renderCard(
  ending: Ending,
  { pictures = PICTURES, nextLevel = true }: Rendering = {},
): Promise<CardChoice[]> {
  const chosen: CardChoice[] = [];
  await render(LevelCardComponent, {
    inputs: { state: stateAt(ending), pictures, nextLevel },
    on: { choose: (choice: CardChoice) => chosen.push(choice) },
  });
  return chosen;
}

/** The Cleared card of a level cleared with 3 stars and 4 moves to spare. */
const CLEARED: Card = { what: "cleared", stars: 3, spare: 4 };

/** Returns the card, by its name. */
function cardNamed(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

/** Returns the names of the card's buttons, in order. */
function buttons(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent.trim());
}

describe("LevelCardComponent", () => {
  it("shows nothing while the level plays", async () => {
    await renderCard({ card: null });

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  describe("Cleared", () => {
    it("is named for the level it cleared", async () => {
      await renderCard({ card: CLEARED });

      expect(cardNamed("Level 3 cleared!")).toBeInTheDocument();
    });

    it("says the stars earned, lit or not yet, and the moves to spare", async () => {
      await renderCard({ card: { what: "cleared", stars: 2, spare: 4 } });

      expect(cardNamed("Level 3 cleared!")).toHaveTextContent(
        /2 of 3 stars\s*4 moves to spare\./,
      );
    });

    it("says a single move to spare as one", async () => {
      await renderCard({ card: { what: "cleared", stars: 1, spare: 1 } });

      expect(screen.getByText("1 move to spare.")).toBeInTheDocument();
    });

    it("lights as many stars as have come to their beats, the rest outlined", async () => {
      await renderCard({ card: CLEARED, starsLit: 2 });

      expect(
        [...document.querySelectorAll(".stars fz-icon")].map((star) =>
          star.getAttribute("name"),
        ),
      ).toEqual(["star", "star", "star-outline"]);
    });

    it("offers Next level, then Play again", async () => {
      await renderCard({ card: CLEARED });

      expect(buttons()).toEqual(["Next level", "Play again"]);
    });

    it("offers Choose a level in Next level's place after the last level", async () => {
      await renderCard({ card: CLEARED }, { nextLevel: false });

      expect(buttons()).toEqual(["Choose a level", "Play again"]);
    });

    it.each([
      ["Next level", "next-level"],
      ["Play again", "play-again"],
    ] as const)("asks at %s", async (name, choice) => {
      const chosen = await renderCard({ card: CLEARED });

      await userEvent.click(screen.getByRole("button", { name }));

      expect(chosen).toEqual([choice]);
    });
  });

  describe("Out of moves", () => {
    it("is named for how the level ended", async () => {
      await renderCard({ card: { what: "over" } });

      expect(cardNamed("Out of moves")).toBeInTheDocument();
    });

    it("says what each goal still open needs, by name", async () => {
      await renderCard({ card: { what: "over" }, goalsLeft: [2, 5] });

      expect(
        within(screen.getByRole("list"))
          .getAllByRole("listitem")
          .map((goal) => goal.textContent.replace(/\s+/g, " ").trim()),
      ).toEqual(["blue 2 left", "red 5 left"]);
    });

    it("leaves out a goal met", async () => {
      await renderCard({ card: { what: "over" }, goalsLeft: [0, 5] });

      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("shows each goal's picture once the board has baked it", async () => {
      await renderCard({ card: { what: "over" } });

      expect(
        [...document.querySelectorAll("img.picture")].map((picture) =>
          picture.getAttribute("src"),
        ),
      ).toEqual([PICTURES.kinds.blue, PICTURES.kinds.red]);
    });

    it("holds each picture's place before the board has baked it", async () => {
      await renderCard({ card: { what: "over" } }, { pictures: null });

      expect(document.querySelectorAll("span.picture")).toHaveLength(2);
    });

    it("offers Try again, then Choose a level", async () => {
      await renderCard({ card: { what: "over" } });

      expect(buttons()).toEqual(["Try again", "Choose a level"]);
    });

    it.each([
      ["Try again", "try-again"],
      ["Choose a level", "choose-level"],
    ] as const)("asks at %s", async (name, choice) => {
      const chosen = await renderCard({ card: { what: "over" } });

      await userEvent.click(screen.getByRole("button", { name }));

      expect(chosen).toEqual([choice]);
    });
  });
});
