import { render, screen } from "@testing-library/angular";
import { inkOf, pilotsIn, posesIn, ringedIn } from "../../testing/pilots";
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

  it("cheers, each pilot happy, and those knocked loose wide eyed still", async () => {
    const { container } = await render(PilotRowComponent, {
      inputs: { pilots: [0, 1], loose: [2], cheering: true },
    });

    expect(posesIn(container)).toEqual([
      [inkOf(0), "happy"],
      [inkOf(1), "happy"],
      [inkOf(2), "eep"],
    ]);
  });

  it("rings the first pilot alone where it is the one at the controls", async () => {
    const { container } = await render(PilotRowComponent, {
      inputs: { pilots: [0, 1, 2], loose: [3], piloting: true },
    });

    expect(ringedIn(container)).toEqual([true, false, false, false]);
  });

  it("rings no pilot unless the first is at the controls", async () => {
    const { container } = await render(PilotRowComponent, {
      inputs: { pilots: [0, 1] },
    });

    expect(ringedIn(container)).toEqual([false, false]);
  });
});
