import { render, screen, within } from "@testing-library/angular";
import type { StarId } from "../../rules/run/stars";
import { heardIn } from "../../testing/heard";
import { StarsComponent } from "./stars.component";

/** Says what the stars show: those held, the mark, those just won and the play's best streak. */
interface StarsOptions {
  readonly held?: readonly StarId[];
  readonly mark?: number;
  readonly won?: readonly StarId[];
  readonly bestStreak?: number | null;
}

/** Renders the stars and returns each, as the list holds it. */
async function renderStars({
  held = [],
  mark = 15,
  won,
  bestStreak,
}: StarsOptions = {}): Promise<HTMLElement[]> {
  await render(StarsComponent, {
    inputs: {
      held,
      mark,
      ...(won === undefined ? {} : { won }),
      ...(bestStreak === undefined ? {} : { bestStreak }),
    },
  });
  return within(screen.getByRole("list", { name: "Stars" })).getAllByRole(
    "listitem",
  );
}

/** Returns whether each star is drawn filled, as one held is, rather than an outline. */
function filled(stars: readonly HTMLElement[]): boolean[] {
  return stars.map(
    (star) => star.querySelector("svg")?.classList.contains("filled") ?? false,
  );
}

describe("StarsComponent", () => {
  it("names each of the three stars by what it asks, the third the mark", async () => {
    const stars = await renderStars({ mark: 20 });

    expect(stars.map(heardIn)).toEqual([
      "Clear the level, not won yet",
      "Lose no life, not won yet",
      "Reach a streak of 20, not won yet",
    ]);
  });

  it("says which stars are won", async () => {
    const stars = await renderStars({ held: ["clear", "streak"] });

    expect(stars.map(heardIn)).toEqual([
      "Clear the level, won",
      "Lose no life, not won yet",
      "Reach a streak of 15, won",
    ]);
  });

  it("fills each star won, and outlines one not won, hidden from assistive technology", async () => {
    const stars = await renderStars({ held: ["clear", "streak"] });

    expect({
      filled: filled(stars),
      hidden: stars.map((star) =>
        star.querySelector("fz-icon")?.getAttribute("aria-hidden"),
      ),
    }).toEqual({
      filled: [true, false, true],
      hidden: ["true", "true", "true"],
    });
  });

  it("marks a star just won new, and says so", async () => {
    const stars = await renderStars({
      held: ["clear", "clean"],
      won: ["clean"],
    });

    expect({
      heard: stars.map(heardIn),
      marked: stars.map((star) => within(star).queryByText("New") !== null),
    }).toEqual({
      heard: [
        "Clear the level, won",
        "Lose no life, won just now",
        "Reach a streak of 15, not won yet",
      ],
      marked: [false, true, false],
    });
  });

  it("gives the play's best streak beside the streak's star where it isn't won", async () => {
    const stars = await renderStars({ held: ["clear"], bestStreak: 11 });

    expect({
      heard: stars.map(heardIn)[2],
      shown: within(stars[2]!).queryByText("best 11") !== null,
    }).toEqual({
      heard: "Reach a streak of 15, not won yet, best 11",
      shown: true,
    });
  });

  it("gives no best streak beside the streak's star once it is won", async () => {
    const stars = await renderStars({
      held: ["clear", "streak"],
      bestStreak: 16,
    });

    expect(within(stars[2]!).queryByText(/best/)).not.toBeInTheDocument();
  });
});
