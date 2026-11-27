import { LevelsComponent } from "@fz/game-ui/levels";
import { render, screen, within } from "@testing-library/angular";
import { LEVELS_INTRO } from "./levels_intro";

describe("LEVELS_INTRO", () => {
  it("has the Levels dialog say that a level chosen starts a new game there, and a level cleared unlocks the next", async () => {
    await render(LevelsComponent, {
      inputs: {
        open: true,
        intro: LEVELS_INTRO,
        marks: {},
        levels: [],
        mostStars: 3,
        figure: "Best",
      },
    });

    expect(
      within(screen.getByRole("dialog"))
        .getAllByRole("paragraph")
        .map((paragraph) => paragraph.textContent),
    ).toEqual([
      "Choose a level to start a new game there. Clear a level to unlock the next one.",
    ]);
  });
});
