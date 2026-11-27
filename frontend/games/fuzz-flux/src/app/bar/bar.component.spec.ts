import { itemAt } from "@fz/core/records";
import { installFakeViewport, openBarMenu } from "@fz/game-ui/testing";
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
  const beats = {
    goalsLeft: game.goalsLeft,
    movesLow: false,
    card: null,
    starsLit: 0,
  };
  return runStateOf(inPlay, gridOf(game), beats);
}

/** Renders the bar over the third of the small levels, beside the board's panels where `panelled` says, the sound on unless `soundOn` says otherwise and How to play loading where `helpLoading` says, and returns what it asks for. */
async function renderBar(
  panelled = false,
  soundOn = true,
  helpLoading = false,
): Promise<string[]> {
  const asked: string[] = [];
  await render(BarComponent, {
    inputs: {
      state: stateOfLevel3(),
      pictures: PICTURES,
      panelled,
      soundOn,
      helpLoading,
    },
    on: {
      hint: () => asked.push("hint"),
      restart: () => asked.push("restart"),
      toggleSound: () => asked.push("toggleSound"),
      chooseLevel: () => asked.push("chooseLevel"),
      openHelp: () => asked.push("openHelp"),
      openSettings: () => asked.push("openSettings"),
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

    expect(screen.getByText("Level 3").closest("p")).not.toHaveClass(
      "fz-visually-hidden",
    );
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

  it.each([
    ["the sound", "Sound", "toggleSound"],
    ["Choose a level", "Choose a level", "chooseLevel"],
    ["How to play", "How to play", "openHelp"],
    ["the settings", "Settings", "openSettings"],
  ])("asks for %s", async (_, name, output) => {
    const asked = await renderBar();

    await userEvent.click(screen.getByRole("button", { name }));

    expect(asked).toEqual([output]);
  });

  it.each([
    [true, "true"],
    [false, "false"],
  ])(
    "shows Sound pressed while the sound is on: %s",
    async (soundOn, pressed) => {
      await renderBar(false, soundOn);

      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
        "aria-pressed",
        pressed,
      );
    },
  );

  it.each([
    [true, "true"],
    [false, null],
  ])("shows How to play busy while it loads: %s", async (helpLoading, busy) => {
    await renderBar(false, true, helpLoading);

    expect(
      screen
        .getByRole("button", { name: "How to play" })
        .getAttribute("aria-busy"),
    ).toBe(busy);
  });

  it("keeps Sound, Choose a level, How to play and Settings beside the panels", async () => {
    await renderBar(true);

    expect(screen.getAllByRole("button").map((button) => button.title)).toEqual(
      ["Sound", "Choose a level", "How to play", "Settings"],
    );
  });

  describe("on a compact screen", () => {
    beforeEach(() => {
      installFakeViewport(390, 844);
    });

    it("leaves the level's number and name to a screen reader", async () => {
      await renderBar();

      expect(screen.getByText("Level 3").closest("p")).toHaveClass(
        "fz-visually-hidden",
      );
    });

    it("keeps Hint in the bar and moves Restart into the menu", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Hint" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Restart" }),
      ).not.toBeInTheDocument();
    });

    it("moves Restart, Sound, Choose a level, How to play and Settings into the menu", async () => {
      await renderBar();

      const items = await openBarMenu(userEvent.setup());

      expect(items).toEqual([
        "Restart",
        "Turn sound off",
        "Choose a level",
        "How to play",
        "Settings",
      ]);
    });

    it("shows the menu busy while How to play loads", async () => {
      await renderBar(false, true, true);

      expect(
        screen.getByRole("button", { name: "More actions" }),
      ).toHaveAttribute("aria-busy", "true");
    });

    it("offers to turn the sound back on from the menu", async () => {
      await renderBar(false, false);

      const items = await openBarMenu(userEvent.setup());

      expect(items).toContain("Turn sound on");
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      installFakeViewport(340, 700);
      await renderBar();

      const items = await openBarMenu(userEvent.setup());

      expect(items[0]).toBe("Fuzzley Games");
    });

    it.each([
      ["to restart", "Restart", "restart"],
      ["the sound", "Turn sound off", "toggleSound"],
      ["Choose a level", "Choose a level", "chooseLevel"],
      ["How to play", "How to play", "openHelp"],
      ["the settings", "Settings", "openSettings"],
    ])("asks for %s from the menu", async (_, name, output) => {
      const asked = await renderBar();
      const user = userEvent.setup();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name }));

      expect(asked).toEqual([output]);
    });
  });
});
