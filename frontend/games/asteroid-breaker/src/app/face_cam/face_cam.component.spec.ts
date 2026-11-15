import { TestBed } from "@angular/core/testing";
import { cssHex } from "@fz/phaser/color";
import { FUZZBALL_FACES, type FuzzballFace } from "@fz/style/fuzzball";
import { paintRoles } from "@fz/style/testing";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { render } from "@testing-library/angular";
import type { Pilot } from "../../rules/ship/pilots";
import { inkOf, pilotsIn, poseIn } from "../../testing/pilots";
import { ROLES } from "../../testing/roles";
import { podTones } from "../../view/art/pod_art";
import { beltPalette } from "../../view/colors/palette";
import { FIELD_ROLES } from "../board/field_roles";
import { FaceCamComponent } from "./face_cam.component";

/** The fourth pilot's color, green. */
const GREEN = 3;

/** What the face cam is given. */
interface FaceCamInputs {
  readonly pilot: Pilot | null;
  readonly face?: FuzzballFace;
  readonly lift?: number;
}

/** Renders the face cam, and returns its element. */
async function renderFaceCam(inputs: FaceCamInputs): Promise<Element> {
  const { container } = await render(FaceCamComponent, { inputs });
  return container;
}

/** Renders the face cam with a pilot in a palette, and returns the colors its canopy is drawn in. */
async function canopyIn(theme: ThemeId): Promise<Record<string, string>> {
  const { container, fixture } = await render(FaceCamComponent, {
    inputs: { pilot: GREEN },
  });
  TestBed.inject(ThemeService).select(theme);
  TestBed.tick();
  fixture.detectChanges();
  if (!(container instanceof HTMLElement)) throw new Error("No face cam.");
  const { style } = container;
  return {
    glass: style.getPropertyValue("--glass"),
    rim: style.getPropertyValue("--rim"),
    rimLit: style.getPropertyValue("--rim-lit"),
  };
}

/** Returns the pod's canopy's colors in the specs' roles in a palette's mode, as the field draws them. */
function podCanopy(mode: "light" | "dark"): Record<string, string> {
  const { glass, rim, rimLit } = podTones(beltPalette(ROLES, mode));
  return { glass: cssHex(glass), rim: cssHex(rim), rimLit: cssHex(rimLit) };
}

describe("FaceCamComponent", () => {
  beforeEach(() => {
    paintRoles(FIELD_ROLES, ROLES);
  });

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  it("draws the canopy in the pod's colors in a light palette", async () => {
    expect(await canopyIn("classic")).toEqual(podCanopy("light"));
  });

  it("draws the canopy in the pod's colors in a dark palette", async () => {
    expect(await canopyIn("midnight")).toEqual(podCanopy("dark"));
  });

  it("draws the pilot at the controls in its ink", async () => {
    const cam = await renderFaceCam({ pilot: GREEN });

    expect(pilotsIn(cam)).toEqual([inkOf(GREEN)]);
  });

  it("draws the pilot at rest, its fur flat, unless told otherwise", async () => {
    const cam = await renderFaceCam({ pilot: GREEN });

    expect(poseIn(cam)).toEqual({ face: "rest", lift: 0 });
  });

  it.each(FUZZBALL_FACES)("draws the pilot's face %s", async (face) => {
    const cam = await renderFaceCam({ pilot: GREEN, face });

    expect(poseIn(cam).face).toBe(face);
  });

  it.each([0, 1, 2, 3])(
    "lifts the pilot's fur to static's step %i",
    async (lift) => {
      const cam = await renderFaceCam({ pilot: GREEN, lift });

      expect(poseIn(cam).lift).toBe(lift);
    },
  );

  it("leaves the glass empty once no one is at the controls", async () => {
    const cam = await renderFaceCam({ pilot: null });

    expect(pilotsIn(cam)).toEqual([]);
  });

  it("is hidden from assistive technology", async () => {
    const cam = await renderFaceCam({ pilot: GREEN });

    expect(cam).toHaveAttribute("aria-hidden", "true");
  });
});
