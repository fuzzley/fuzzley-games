import { FUZZBALL } from "@fz/style/fuzzball";
import { render } from "@testing-library/angular";
import { FuzzballComponent } from "./fuzzball.component";

describe("FuzzballComponent", () => {
  async function renderFuzzball(): Promise<HTMLElement> {
    const { container } = await render(FuzzballComponent);
    return container;
  }

  it("draws the body filled in the text's color", async () => {
    const fuzzball = await renderFuzzball();
    const body = fuzzball.querySelector(".body");

    expect({
      r: body?.getAttribute("r"),
      fill: body?.getAttribute("fill"),
    }).toEqual({ r: String(FUZZBALL.body.r), fill: "currentcolor" });
  });

  it("draws the fur as strokes in the text's color", async () => {
    const fuzzball = await renderFuzzball();
    const fur = fuzzball.querySelector(".fur");

    expect({
      d: fur?.getAttribute("d"),
      fill: fur?.getAttribute("fill"),
      stroke: fur?.getAttribute("stroke"),
    }).toEqual({ d: FUZZBALL.fur.d, fill: "none", stroke: "currentcolor" });
  });

  it("draws its two eyes dark, each with its glint", async () => {
    const fuzzball = await renderFuzzball();

    expect({
      eyes: Array.from(fuzzball.querySelectorAll("ellipse"), (eye) =>
        eye.getAttribute("fill"),
      ),
      glints: fuzzball.querySelectorAll(".glint").length,
    }).toEqual({ eyes: [FUZZBALL.ink, FUZZBALL.ink], glints: 2 });
  });

  it("is hidden from assistive technology", async () => {
    const fuzzball = await renderFuzzball();

    expect(fuzzball).toHaveAttribute("aria-hidden", "true");
  });
});
