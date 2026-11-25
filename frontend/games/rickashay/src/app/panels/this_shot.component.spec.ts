import { figureValue, figures } from "@fz/ui/testing";
import { render, screen } from "@testing-library/angular";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import type { FlightSoFar } from "../../view/run_state";
import { type SpringPictures, ThisShotComponent } from "./this_shot.component";

/** A spring unlit and lit, as a scene hands pictures over, each holding nothing but its name. */
const SPRINGS: SpringPictures = {
  off: `data:image/png;base64,${btoa("off")}`,
  on: `data:image/png;base64,${btoa("on")}`,
};

/** A shot 16 strikes in, 23 turns, holding 1 floor bounce. */
const SO_FAR: FlightSoFar = { rally: 16, held: 1, turns: 23, points: 400 };

/** A shot 52 strikes in, holding all 3 floor bounces it can. */
const FULL: FlightSoFar = { rally: 52, held: 3, turns: 70, points: 2400 };

/** Says what differs from a shot {@link SO_FAR} in, on the rules' own numbers, its springs not drawn yet. */
interface LinesOptions {
  readonly soFar?: FlightSoFar;
  readonly rules?: FlightRules;
  readonly springs?: SpringPictures | null;
}

/** Renders This shot, returning the element its lines are in. */
async function renderLines({
  soFar = SO_FAR,
  rules = FLIGHT_RULES,
  springs = null,
}: LinesOptions = {}): Promise<HTMLElement> {
  const { container } = await render(ThisShotComponent, {
    inputs: { soFar, rules, springs },
  });
  return container;
}

/** Returns how far the bar toward the next floor bounce is filled, as its custom property has it. */
function barFill(lines: HTMLElement): string | null {
  const fill = figureValue("Next floor bounce", lines).querySelector(
    "[aria-hidden='true'] > *",
  );
  return fill instanceof HTMLElement
    ? fill.style.getPropertyValue("--to-next")
    : null;
}

/** Returns the springs shown, each by its picture's URL, in order. */
function springsShown(lines: HTMLElement): readonly string[] {
  return Array.from(lines.querySelectorAll("img"), (spring) => spring.src);
}

/** Returns how many springs' places the lines hold empty, before the scene has drawn them. */
function springsHeld(lines: HTMLElement): number {
  return lines.querySelectorAll(".springs > .spring").length;
}

describe("ThisShotComponent", () => {
  it("heads its lines This shot", async () => {
    await renderLines();

    expect(
      screen.getByRole("heading", { level: 2, name: "This shot" }),
    ).toBeInTheDocument();
  });

  it("says the shot's rally, its floor bounces against the most it holds, the rally the next comes at, and its turns", async () => {
    const lines = await renderLines();

    expect(figures(lines)).toEqual([
      ["Rally", "16"],
      ["Floor bounces", "1 of 3"],
      ["Next floor bounce", "Rally 25"],
      ["Turns", "23"],
    ]);
  });

  it("counts the floor bounces on the rules it is handed", async () => {
    const lines = await renderLines({
      rules: { ...FLIGHT_RULES, firstBounce: 6, bounceStep: 2, mostBounces: 4 },
    });

    expect(figures(lines).slice(1, 3)).toEqual([
      ["Floor bounces", "1 of 4"],
      ["Next floor bounce", "Rally 24"],
    ]);
  });

  it("draws a spring for each floor bounce the shot can hold, those it has lit, hidden from assistive technology", async () => {
    const lines = await renderLines({ springs: SPRINGS });

    expect({
      shown: springsShown(lines),
      held: springsHeld(lines),
      presentation: screen.queryAllByRole("presentation"),
    }).toEqual({
      shown: [SPRINGS.on, SPRINGS.off, SPRINGS.off],
      held: 0,
      presentation: [],
    });
  });

  it("draws no springs before the scene has drawn them, but holds each one's place", async () => {
    const lines = await renderLines();

    expect({
      shown: springsShown(lines),
      held: springsHeld(lines),
    }).toEqual({ shown: [], held: 3 });
  });

  it("fills the bar as far as the rally has come from the last floor bounce toward the next", async () => {
    const lines = await renderLines();

    // From 10 to 25, a rally of 16 has come 6 of 15.
    expect(barFill(lines)).toBe(String(6 / 15));
  });

  it("says no floor bounce comes while the shot holds all it can, its bar empty", async () => {
    const lines = await renderLines({ soFar: FULL });

    expect({
      next: figures(lines)[2],
      fill: barFill(lines),
    }).toEqual({
      next: ["Next floor bounce", "Not while you have 3"],
      fill: "0",
    });
  });
});
