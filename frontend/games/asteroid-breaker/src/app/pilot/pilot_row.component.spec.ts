import { render, screen } from "@testing-library/angular";
import { inkOf, pilotsIn } from "../../testing/pilots";
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
});
