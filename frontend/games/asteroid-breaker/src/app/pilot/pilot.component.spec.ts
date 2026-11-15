import { TestBed } from "@angular/core/testing";
import type { FuzzballFace } from "@fz/style/fuzzball";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { render } from "@testing-library/angular";
import { poseIn } from "../../testing/pilots";
import { pilotInk } from "../../view/colors/palette";
import { PilotComponent } from "./pilot.component";

/** The fourth pilot's color, green, whose ink differs between the modes. */
const GREEN = 3;

/** How a spec poses the pilot it renders. */
interface Posed {
  readonly face?: FuzzballFace;
  readonly lift?: number;
}

/** Renders a pilot in a palette, posed as a spec says, and returns its element. */
async function renderPilot(
  pilot: number,
  theme: ThemeId,
  posed: Posed = {},
): Promise<Element> {
  const { container, fixture } = await render(PilotComponent, {
    inputs: { pilot, ...posed },
  });
  TestBed.inject(ThemeService).select(theme);
  TestBed.tick();
  fixture.detectChanges();
  return container;
}

describe("PilotComponent", () => {
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  it("draws a pilot in its light ink in a light palette", async () => {
    const pilot = await renderPilot(GREEN, "classic");

    expect(pilot).toHaveStyle({ color: pilotInk(GREEN, "light") });
  });

  it("draws a pilot in its dark ink in a dark palette", async () => {
    const pilot = await renderPilot(GREEN, "midnight");

    expect(pilot).toHaveStyle({ color: pilotInk(GREEN, "dark") });
  });

  it("draws the pilot as a fuzzball", async () => {
    const pilot = await renderPilot(GREEN, "classic");

    expect(pilot.querySelector("fz-fuzzball")).toBeInTheDocument();
  });

  it("draws the pilot at rest, its fur flat, unless told otherwise", async () => {
    const pilot = await renderPilot(GREEN, "classic");

    expect(poseIn(pilot)).toEqual({ face: "rest", lift: 0 });
  });

  it("draws the pilot with the face and the lift it is given", async () => {
    const pilot = await renderPilot(GREEN, "classic", {
      face: "happy",
      lift: 2,
    });

    expect(poseIn(pilot)).toEqual({ face: "happy", lift: 2 });
  });

  it("is hidden from assistive technology", async () => {
    const pilot = await renderPilot(GREEN, "classic");

    expect(pilot).toHaveAttribute("aria-hidden", "true");
  });
});
