import { render, screen } from "@testing-library/angular";
import { LevelTitleComponent } from "./level_title.component";

/** The level the specs name. */
const LEVEL = { number: 16, name: "Checkerboard" };

describe("LevelTitleComponent", () => {
  it("shows the level's number and its name", async () => {
    await render(LevelTitleComponent, { inputs: { level: LEVEL } });

    expect(screen.getByText("Level 16")).toBeInTheDocument();
    expect(screen.getByText("Checkerboard")).not.toHaveClass(
      "fz-visually-hidden",
    );
  });

  it("leaves the name heard but not seen beside the number alone", async () => {
    await render(LevelTitleComponent, {
      inputs: { level: LEVEL, numberAlone: true },
    });

    expect(screen.getByText("Checkerboard")).toHaveClass("fz-visually-hidden");
  });
});
