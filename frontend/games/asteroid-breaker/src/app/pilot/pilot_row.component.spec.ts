import { render, screen } from "@testing-library/angular";
import { inkOf, pilotsIn, poseIn } from "../../testing/pilots";

/** Returns each pilot an element draws, in order, as its color and its face. */
function posesIn(element: Element): [string, string][] {
  return Array.from(
    element.querySelectorAll<HTMLElement>("app-pilot"),
    (pilot) => [pilot.style.color, poseIn(pilot).face],
  );
}
import { PilotRowComponent } from "./pilot_row.component";

describe("PilotRowComponent", () => {
  it("draws each pilot in its color, in order", async () => {
    const { container } = await render(PilotRowComponent, {
      inputs: { pilots: [3, 0, 3] },
    });

    expect(pilotsIn(container)).toEqual([inkOf(3), inkOf(0), inkOf(3)]);
  });

  it("shows what it is given beside the pilots", async () => {
    await render(
      `<app-pilot-row [pilots]="[1]">1 fuzzball waiting</app-pilot-row>`,
      { imports: [PilotRowComponent] },
    );

    expect(screen.getByText("1 fuzzball waiting")).toBeVisible();
  });

  it("draws the crew knocked loose after the pilots, wide eyed", async () => {
    const { container } = await render(PilotRowComponent, {
      inputs: { pilots: [1], loose: [4, 2] },
    });

    expect(posesIn(container)).toEqual([
      [inkOf(1), "rest"],
      [inkOf(4), "eep"],
      [inkOf(2), "eep"],
    ]);
  });
});
