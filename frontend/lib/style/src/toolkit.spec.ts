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

/**
 * Returns the declarations of the first rule in compressed CSS whose selector
 * is `selector`, or none if no rule's is.
 */
function declarations(css: string, selector: string): string[] {
  for (const [, head, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (head === selector) return (body ?? "").split(";");
  }
  return [];
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
    const card = declarations(
      compiled("@include fz.dialog-card(400px);"),
      ".it",
    );

    expect(card).toEqual(
      expect.arrayContaining([
        "width:400px",
        "max-width:calc(100vw - var(--fz-space-8))",
      ]),
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

  it("head a help card's lists, its bold words in the text's color among its muted ones", () => {
    const text = compiled("@include fz.help-text;");

    expect(text).toContain(
      ".it h3{margin:var(--fz-space-5) 0 var(--fz-space-2)",
    );
    expect(text).toContain(
      ".it p{margin:0 0 var(--fz-space-3);color:var(--fz-muted)",
    );
    expect(text).toContain(".it strong{color:var(--fz-text)}");
  });

  it("lay How to play's controls out in a table across the card", () => {
    const table = declarations(
      compiled("@include fz.help-controls;"),
      ".it table",
    );

    expect(table).toEqual(
      expect.arrayContaining(["width:100%", "border-collapse:collapse"]),
    );
  });

  it("name the controls' columns in muted capitals", () => {
    expect(compiled("@include fz.help-controls;")).toContain(
      ".it thead th{color:var(--fz-muted);font-size:var(--fz-font-2xs);letter-spacing:.1em;text-transform:uppercase}",
    );
  });

  it("draw How to play's keys as keycaps", () => {
    expect(compiled("@include fz.help-controls;")).toContain(
      ".it kbd{display:inline-block;padding:0 6px;border:1px solid var(--fz-edge-3);border-bottom-width:2px",
    );
  });

  it("lift each of a result card's values over its term", () => {
    expect(compiled("@include fz.result-card;")).toContain(
      ".it .figure{display:flex;flex-direction:column-reverse",
    );
  });

  it("center a result card", () => {
    const card = declarations(compiled("@include fz.result-card;"), ".it");

    expect(card).toContain("text-align:center");
  });

  it("make a canvas board's host a size container that holds and clips its parts", () => {
    const host = declarations(
      compiled("@include fz.canvas-board-host;"),
      ".it",
    );

    expect(host).toEqual(
      expect.arrayContaining([
        "position:relative",
        "display:block",
        "container-type:size",
        "overflow:hidden",
      ]),
    );
  });

  it("leave nothing on a canvas board for a finger steering on it to set off", () => {
    const host = declarations(
      compiled("@include fz.canvas-board-host;"),
      ".it",
    );

    expect(host).toEqual(
      expect.arrayContaining([
        "touch-action:none",
        "user-select:none",
        "-webkit-touch-callout:none",
        "-webkit-tap-highlight-color:rgba(0,0,0,0)",
      ]),
    );
  });

  it("leave a canvas board's focus for its ring to show", () => {
    const host = declarations(
      compiled("@include fz.canvas-board-host;"),
      ".it",
    );

    expect(host).toContain("outline:none");
  });

  it("ring a board the focus ring's offset beyond its wall, letting the pointer through", () => {
    const ring = declarations(
      compiled("@include fz.board-focus-ring(var(--wall));"),
      ".it",
    );

    expect(ring).toEqual(
      expect.arrayContaining([
        "border-radius:var(--fz-radius-sm)",
        "outline:var(--fz-focus-ring-width) solid rgba(0,0,0,0)",
        "outline-offset:calc(var(--wall) + var(--fz-focus-ring-offset))",
        "pointer-events:none",
      ]),
    );
  });

  it("show a board's ring only while its host has the focus from the keyboard", () => {
    expect(compiled("@include fz.board-focus-ring(2px);")).toContain(
      ":host(:focus-visible) .it{outline-color:var(--fz-focus-ring-color)}",
    );
  });

  it("center a board's card in a grid over all of the board but its foot", () => {
    expect(compiled("@include fz.board-card-layer(var(--finger));")).toBe(
      ".it{position:absolute;inset:0 0 var(--finger);display:grid;place-items:center;pointer-events:none}",
    );
  });

  it("lay a board's cards over all of the board unless asked", () => {
    const layer = declarations(
      compiled("@include fz.board-card-layer;"),
      ".it",
    );

    expect(layer).toContain("inset:0 0 0");
  });

  it("frost a board's card and center its lines", () => {
    const card = declarations(compiled("@include fz.board-card(24px);"), ".it");

    expect(card).toEqual(
      expect.arrayContaining([
        "backdrop-filter:blur(12px)",
        "display:grid",
        "justify-items:center",
        "text-align:center",
      ]),
    );
  });

  it("narrow a board's card by four of the room around the board", () => {
    const card = declarations(
      compiled("@include fz.board-card(var(--room));"),
      ".it",
    );

    expect(card).toContain("max-width:min(320px,100cqmin - 4*var(--room))");
  });

  it("set a board card's title large", () => {
    expect(compiled("@include fz.board-card(24px);")).toContain(
      ".it .card-title{font-size:var(--fz-font-lg);font-weight:700}",
    );
  });

  it("let the pointer press only a board card's buttons", () => {
    expect(compiled("@include fz.board-card(24px);")).toContain(
      ".it button{margin-top:var(--fz-board-card-gap, var(--fz-space-2));pointer-events:auto}",
    );
  });

  it("space a board's card roomily unless it is set smaller", () => {
    const card = declarations(compiled("@include fz.board-card(24px);"), ".it");

    expect(card).toEqual(
      expect.arrayContaining([
        "gap:var(--fz-board-card-gap, var(--fz-space-2))",
        "padding:var(--fz-board-card-padding, var(--fz-space-5) var(--fz-space-6))",
      ]),
    );
  });

  it("set a board's card smaller for a small board, from the card or around it", () => {
    expect(compiled("@include fz.board-card-small;")).toBe(
      ".it{--fz-board-card-gap: var(--fz-space-1);--fz-board-card-padding: var(--fz-space-3) var(--fz-space-4);font-size:var(--fz-font-sm)}",
    );
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

  it("make a settings drawer's frame the window's height", () => {
    const drawer = declarations(
      compiled("@include fz.settings-drawer-frame;"),
      ".it",
    );

    expect(drawer).toContain("height:100dvh");
  });

  it("pin a settings drawer's frame to the right of its dialog", () => {
    const drawer = declarations(
      compiled("@include fz.settings-drawer-frame;"),
      ".it",
    );

    expect(drawer).toContain("margin-left:auto");
  });

  it("size a settings drawer's frame as asked", () => {
    const drawer = declarations(
      compiled("@include fz.settings-drawer-frame(320px);"),
      ".it",
    );

    expect(drawer).toContain("width:320px");
  });

  it("scroll a settings drawer's content, which moves what is positioned in it", () => {
    const content = declarations(
      compiled("@include fz.settings-drawer-frame;"),
      ".it .drawer-content",
    );

    expect(content).toEqual(
      expect.arrayContaining(["position:relative", "overflow-y:auto"]),
    );
  });

  it("stack a choice list's choices, one under another", () => {
    expect(compiled("@include fz.choice-list;")).toContain(
      ".it .choice-list{display:flex;flex-direction:column;gap:var(--fz-space-2)}",
    );
  });

  it("draw each choice as a tile, its name over its description", () => {
    const list = compiled("@include fz.choice-list;");

    expect(list).toContain(
      ".it .choice[aria-checked=true]{border-color:var(--fz-accent)",
    );
    expect(list).toContain(
      ".it .choice{flex-direction:column;gap:var(--fz-space-1)",
    );
  });

  it("mute a choice's description, so its name stays the loudest", () => {
    expect(compiled("@include fz.choice-list;")).toContain(
      ".it .choice .desc{color:var(--fz-muted)",
    );
  });

  it("name each setting as a field's label, its description muted under it", () => {
    const fields = compiled("@include fz.setting-fields;");

    expect(fields).toContain(
      ".it .setting-label{display:block;margin-bottom:var(--fz-space-3);color:var(--fz-muted)",
    );
    expect(fields).toContain(
      ".it .setting-desc{margin:var(--fz-space-2) 0 0;color:var(--fz-muted)",
    );
  });

  it("make a checkbox's label as tall as a finger needs", () => {
    expect(compiled("@include fz.setting-fields;")).toContain(
      ".it .setting-check label{display:flex;align-items:center;min-height:var(--fz-tap-target)",
    );
  });

  it("set a checkbox's description under its label, beside the box", () => {
    const fields = compiled("@include fz.setting-fields;");

    expect(declarations(fields, ".it .setting-check")).toEqual(
      expect.arrayContaining([
        "display:grid",
        "grid-template-columns:auto 1fr",
      ]),
    );
    expect(fields).toContain(
      ".it .setting-check .setting-desc{grid-column:2;margin:0}",
    );
  });

  it("leave the segmented control to the stylesheets that draw one", () => {
    expect(compiled("@include fz.setting-fields;")).not.toContain(".segment");
  });

  it("set a segmented control's segments side by side in a well", () => {
    const control = compiled("@include fz.segmented;");

    expect(declarations(control, ".it .segmented")).toEqual(
      expect.arrayContaining(["display:flex", "background:var(--fz-well)"]),
    );
    expect(declarations(control, ".it .segment")).toEqual(
      expect.arrayContaining(["flex:1", "min-height:var(--fz-tap-target)"]),
    );
  });

  it("fill the checked segment in the accent", () => {
    expect(compiled("@include fz.segmented;")).toContain(
      ".it .segment[aria-checked=true]{background:var(--fz-accent);color:var(--fz-on-accent)",
    );
  });

  it("leave the settings out of a drawer's frame, to the stylesheet that writes them", () => {
    expect(compiled("@include fz.settings-drawer-frame;")).not.toContain(
      ".setting",
    );
  });

  it("give a whole settings drawer its frame and its settings", () => {
    expect(compiled("@include fz.settings-drawer;")).toBe(
      compiled("@include fz.settings-drawer-frame;") +
        compiled("@include fz.setting-fields;"),
    );
  });

  it("give a whole settings drawer's frame the width asked", () => {
    expect(compiled("@include fz.settings-drawer(320px);")).toBe(
      compiled("@include fz.settings-drawer-frame(320px);") +
        compiled("@include fz.setting-fields;"),
    );
  });

  it("put the tile of the run in play in the accent", () => {
    expect(compiled("@include fz.start-tile;")).toContain(
      ".it[aria-current=true]{border-color:var(--fz-accent);background:var(--fz-accent-wash);color:var(--fz-text)}",
    );
  });

  it("draw a tile not yet open as an outline", () => {
    expect(compiled("@include fz.start-tile;")).toContain(
      ".it[aria-disabled=true]{border-style:dashed;background:none;cursor:default}",
    );
  });

  it("keep a tile not yet open unlit when hovered", () => {
    expect(compiled("@include fz.start-tile;")).toContain(
      ".it[aria-disabled=true]:hover{border-color:var(--fz-edge-2)}",
    );
  });

  it("put a checked choice tile in the accent", () => {
    expect(compiled("@include fz.choice-tile;")).toContain(
      ".it[aria-checked=true]{border-color:var(--fz-accent);background:var(--fz-accent-wash);color:var(--fz-text)}",
    );
  });
});
