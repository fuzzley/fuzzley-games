import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileString } from "sass";

/** Returns the compressed CSS of a rule whose body calls the toolkit. */
function compiled(body: string): string {
  const src = path.dirname(fileURLToPath(import.meta.url));
  return compileString(`@use "index" as fz;\n.it { ${body} }`, {
    loadPaths: [src],
    style: "compressed",
  }).css;
}

describe("the toolkit's mixins", () => {
  it("transition each property they name at the shared speed", () => {
    expect(compiled("@include fz.transition(background, transform);")).toBe(
      ".it{transition:background var(--fz-duration-base) var(--fz-ease-standard),transform var(--fz-duration-base) var(--fz-ease-standard)}",
    );
  });

  it("transition at another speed when asked", () => {
    expect(
      compiled(
        "@include fz.transition(width, $duration: 1s, $easing: linear);",
      ),
    ).toBe(".it{transition:width 1s linear}");
  });

  it("frost glass for Safari too", () => {
    expect(compiled("@include fz.glass(12px);")).toBe(
      ".it{backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}",
    );
  });

  it("give a control the shared tap target", () => {
    expect(compiled("@include fz.tap-target;")).toBe(
      ".it{min-width:var(--fz-tap-target);min-height:var(--fz-tap-target)}",
    );
  });

  it("centre a box's children", () => {
    expect(compiled("@include fz.flex-center;")).toBe(
      ".it{display:flex;align-items:center;justify-content:center}",
    );
  });

  it("make an icon button quiet until hovered", () => {
    expect(compiled("@include fz.icon-button;")).toContain(
      ".it:hover{background:var(--fz-wash-3);color:var(--fz-text)}",
    );
  });

  it("round an icon button as asked", () => {
    expect(compiled("@include fz.icon-button(50%);")).toContain(
      "border-radius:50%",
    );
  });
});
