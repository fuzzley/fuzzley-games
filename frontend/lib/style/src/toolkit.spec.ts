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

  it("size a dialog's card as asked, within the window", () => {
    expect(compiled("@include fz.dialog-card(400px);")).toContain(
      "width:400px;max-width:calc(100vw - var(--fz-space-8))",
    );
  });

  it("lay a dialog's card on the float surface", () => {
    expect(compiled("@include fz.dialog-card(400px);")).toContain(
      "background:var(--fz-float)",
    );
  });

  it("round a dialog's close button less than an icon button", () => {
    expect(compiled("@include fz.close-button;")).toContain(
      "border-radius:var(--fz-radius-sm)",
    );
  });

  it("put a dialog's close button in its card's corner", () => {
    expect(compiled("@include fz.corner-close-button;")).toContain(
      "position:absolute;top:var(--fz-space-3);right:var(--fz-space-3)",
    );
  });

  it("size a help card as asked", () => {
    expect(compiled("@include fz.help-card(600px);")).toContain("width:600px");
  });

  it("draw a help card's keys as keycaps", () => {
    expect(compiled("@include fz.help-card;")).toContain(
      ".it kbd{display:inline-block;padding:0 6px;border:1px solid var(--fz-edge-3);border-bottom-width:2px",
    );
  });

  it("lift each of a result card's values over its term", () => {
    expect(compiled("@include fz.result-card;")).toContain(
      ".it .figure{display:flex;flex-direction:column-reverse",
    );
  });

  it("center a result card", () => {
    expect(compiled("@include fz.result-card;")).toContain("text-align:center");
  });

  it("size a dialog's close button's icon", () => {
    expect(compiled("@include fz.close-button;")).toContain(
      ".it{--fz-icon-size: 20px}",
    );
  });

  it("set a setting's name in muted capitals", () => {
    expect(compiled("@include fz.field-label;")).toBe(
      ".it{display:block;margin-bottom:var(--fz-space-3);color:var(--fz-muted);font-size:var(--fz-font-sm);font-weight:700;letter-spacing:.05em;text-transform:uppercase}",
    );
  });

  it("pin a settings drawer to its dialog's end, the window's height", () => {
    expect(compiled("@include fz.settings-drawer;")).toMatch(
      /^\.it\{[^}]*height:100dvh;margin-left:auto;/,
    );
  });

  it("draw a settings drawer's choices as tiles", () => {
    expect(compiled("@include fz.settings-drawer;")).toContain(
      ".it .choice[aria-checked=true]{border-color:var(--fz-accent)",
    );
  });

  it("set a check's description under its label, beside the box", () => {
    expect(compiled("@include fz.settings-drawer;")).toContain(
      ".it .check .setting-desc{grid-column:2;margin:0}",
    );
  });

  it("put a checked choice tile in the accent", () => {
    expect(compiled("@include fz.choice-tile;")).toContain(
      ".it[aria-checked=true]{border-color:var(--fz-accent);background:var(--fz-accent-wash);color:var(--fz-text)}",
    );
  });
});
