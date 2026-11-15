import {
  FUZZBALL,
  FUZZBALL_FACES,
  FUZZBALL_LOOK_FAR,
  type FuzzballFace,
  SPARKS_FROM,
  SPARK_LOOK,
  type SvgEyeMark,
  fuzzballDrawing,
} from "@fz/style/fuzzball";
import { render } from "@testing-library/angular";
import { FuzzballComponent } from "./fuzzball.component";

/** The color of a spark's core, as the art kit mixes it. */
const CORE = `light-dark(color-mix(in srgb, currentcolor 60%, var(--fz-text)), color-mix(in srgb, currentcolor 18%, ${FUZZBALL.glint}))`;

/** The attributes that place and size a mark of a face. */
const PLACING = ["cx", "cy", "r", "rx", "ry", "points", "stroke-width"];

describe("FuzzballComponent", () => {
  async function renderFuzzball(
    inputs: { face?: FuzzballFace; lift?: number } = {},
  ): Promise<HTMLElement> {
    const { container } = await render(FuzzballComponent, { inputs });
    return container;
  }

  /** Returns the marks of its face, back to front: each element's name, whether it is a glint, and the attributes that place and size it. */
  function faceOf(fuzzball: HTMLElement): readonly Record<string, string>[] {
    return Array.from(
      fuzzball.querySelectorAll("svg > :not(.body, .fur, .halos, .cores)"),
      (mark) => ({
        kind: mark.localName,
        glint: String(mark.classList.contains("glint")),
        ...Object.fromEntries(
          PLACING.flatMap((name) => {
            const value = mark.getAttribute(name);
            return value === null ? [] : [[name, value]];
          }),
        ),
      }),
    );
  }

  /** Returns a mark of a face as `faceOf()` reads it drawn. */
  function drawnAs({
    kind,
    tone,
    ...placing
  }: SvgEyeMark): Record<string, string> {
    return {
      kind,
      glint: String(tone === "glint"),
      ...Object.fromEntries(
        Object.entries(placing).map(([name, value]) => [
          name === "width" ? "stroke-width" : name,
          String(value),
        ]),
      ),
    };
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

  it("colors its eyes by --fz-fuzzball-eyes where it is set", async () => {
    const fuzzball = await renderFuzzball();

    expect(
      Array.from(fuzzball.querySelectorAll("ellipse"), (eye) =>
        eye.style.getPropertyValue("fill"),
      ),
    ).toEqual([
      `var(--fz-fuzzball-eyes, ${FUZZBALL.ink})`,
      `var(--fz-fuzzball-eyes, ${FUZZBALL.ink})`,
    ]);
  });

  it.each(FUZZBALL_FACES)(
    "draws every mark of the face %s where the art kit draws it, back to front",
    async (face) => {
      const fuzzball = await renderFuzzball({ face });

      expect(faceOf(fuzzball)).toEqual(
        fuzzballDrawing({ face, range: FUZZBALL_LOOK_FAR }).eyes.map(drawnAs),
      );
    },
  );

  it("draws its default face as the mark's own, whatever the range", async () => {
    const fuzzball = await renderFuzzball();

    expect(faceOf(fuzzball)).toEqual(fuzzballDrawing().eyes.map(drawnAs));
  });

  it("draws a face's lines round, in the eyes' color unless --fz-fuzzball-eyes is set", async () => {
    const fuzzball = await renderFuzzball({ face: "happy" });

    expect(
      Array.from(fuzzball.querySelectorAll("polyline"), (line) => ({
        points: line.getAttribute("points"),
        width: line.getAttribute("stroke-width"),
        stroke: line.getAttribute("stroke"),
        paint: line.style.getPropertyValue("stroke"),
        fill: line.getAttribute("fill"),
        ends: line.getAttribute("stroke-linecap"),
        corners: line.getAttribute("stroke-linejoin"),
      })),
    ).toEqual(
      fuzzballDrawing({ face: "happy" }).eyes.map((mark) => ({
        points: mark.kind === "polyline" ? mark.points : "",
        width: mark.kind === "polyline" ? String(mark.width) : "",
        stroke: FUZZBALL.ink,
        paint: `var(--fz-fuzzball-eyes, ${FUZZBALL.ink})`,
        fill: "none",
        ends: "round",
        corners: "round",
      })),
    );
  });

  it("draws a face's glints white, whatever --fz-fuzzball-eyes says", async () => {
    const fuzzball = await renderFuzzball({ face: "set" });

    expect(
      Array.from(fuzzball.querySelectorAll(".glint"), (glint) => ({
        fill: glint.getAttribute("fill"),
        paint: (glint as SVGElement).style.getPropertyValue("fill"),
      })),
    ).toEqual([
      { fill: FUZZBALL.glint, paint: "" },
      { fill: FUZZBALL.glint, paint: "" },
    ]);
  });

  it("draws its fur lifted by static, as wide as @fz/style says", async () => {
    const fuzzball = await renderFuzzball({ lift: 2 });
    const fur = fuzzball.querySelector(".fur");
    const { fur: d, furWidth } = fuzzballDrawing({ lift: 2 });

    expect({
      d: fur?.getAttribute("d"),
      width: fur?.getAttribute("stroke-width"),
    }).toEqual({ d, width: String(furWidth) });
  });

  it.each([
    [SPARKS_FROM - 0.01, 0],
    [SPARKS_FROM, 2],
  ])(
    "draws static's sparks from the step they start at: at %f, %i groups",
    async (lift, groups) => {
      const fuzzball = await renderFuzzball({ lift });

      expect(fuzzball.querySelectorAll(".halos, .cores")).toHaveLength(groups);
    },
  );

  it("draws static's sparks' halos faint as one, in the fuzzball's color", async () => {
    const fuzzball = await renderFuzzball({ lift: 3 });
    const halos = fuzzball.querySelector(".halos");

    expect({
      opacity: halos?.getAttribute("opacity"),
      color: [halos?.getAttribute("fill"), halos?.getAttribute("stroke")],
      round: [
        halos?.getAttribute("stroke-linecap"),
        halos?.getAttribute("stroke-linejoin"),
      ],
      marks: Array.from(halos?.children ?? [], (mark) => [
        mark.localName,
        mark.getAttribute("points"),
        mark.getAttribute("stroke-width"),
        mark.getAttribute("fill"),
      ]),
    }).toEqual({
      opacity: String(SPARK_LOOK.haloAlpha),
      color: ["currentcolor", "currentcolor"],
      round: ["round", "round"],
      // A star's halo is the star filled and a line round its edge.
      marks: fuzzballDrawing({ lift: 3 }).sparks.map(({ kind, points }) =>
        kind === "tick"
          ? ["polyline", points, String(SPARK_LOOK.tickHalo), "none"]
          : ["polygon", points, String(SPARK_LOOK.starHalo), null],
      ),
    });
  });

  it("draws static's sparks' cores over their halos, a tick's line never under its least width", async () => {
    const fuzzball = await renderFuzzball({ lift: 3 });
    const cores = fuzzball.querySelector(".halos + .cores");

    expect({
      round: [
        cores?.getAttribute("stroke-linecap"),
        cores?.getAttribute("stroke-linejoin"),
      ],
      marks: Array.from(cores?.children ?? [], (mark) => [
        mark.localName,
        mark.getAttribute("points"),
        mark.getAttribute("fill"),
        mark.getAttribute("stroke"),
        (mark as SVGElement).style.getPropertyValue("stroke-width"),
        mark.getAttribute("vector-effect"),
      ]),
    }).toEqual({
      round: ["round", "round"],
      marks: fuzzballDrawing({ lift: 3 }).sparks.map(({ kind, points }) =>
        kind === "tick"
          ? [
              "polyline",
              points,
              "none",
              null,
              // Its 0.55 of the view box's 32 units, as hundredths of its
              // width, in CSS pixels, as its stroke doesn't scale.
              "max(0.8px, 1.71875cqi)",
              "non-scaling-stroke",
            ]
          : ["polygon", points, null, "none", "", null],
      ),
    });
  });

  it("mixes static's sparks' cores from the fuzzball's color, toward the text in a light palette and toward white in a dark one", async () => {
    const fuzzball = await renderFuzzball({ lift: 3 });
    const cores = fuzzball.querySelector<SVGElement>(".cores");

    expect([
      cores?.style.getPropertyValue("fill"),
      cores?.style.getPropertyValue("stroke"),
    ]).toEqual([CORE, CORE]);
  });

  it("is hidden from assistive technology", async () => {
    const fuzzball = await renderFuzzball();

    expect(fuzzball).toHaveAttribute("aria-hidden", "true");
  });
});
