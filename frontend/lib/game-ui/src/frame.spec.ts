import path from "node:path";
import { compileStylesheet } from "@fz/style/testing";
import { type Container, parse } from "postcss";

/** A rule a stylesheet compiles to: its selector and its declarations. */
interface CompiledRule {
  readonly selector: string;
  readonly declarations: Readonly<Record<string, string>>;
}

/** A cascade layer a stylesheet adds rules to, and the rules it adds. */
interface CompiledLayer {
  readonly layer: string;
  readonly rules: readonly CompiledRule[];
}

/** Returns the CSS a stylesheet compiles to, by its path from `src/`. */
function compiled(stylesheet: string): string {
  return compileStylesheet(path.join(import.meta.dirname, stylesheet));
}

/** Returns the rules directly inside a container, in order. */
function rulesIn(container: Container): readonly CompiledRule[] {
  const rules: CompiledRule[] = [];
  container.each((node) => {
    if (node.type !== "rule") return;
    rules.push({
      selector: node.selector,
      declarations: Object.fromEntries(
        node.nodes.flatMap((child) =>
          child.type === "decl" ? [[child.prop, child.value]] : [],
        ),
      ),
    });
  });
  return rules;
}

/**
 * Returns what CSS holds at its top, in order: each cascade layer it adds
 * rules to, with its rules, and anything else as it is written.
 */
function topOf(css: string): readonly (CompiledLayer | string)[] {
  return parse(css).nodes.map((node) =>
    node.type === "atrule" && node.name === "layer"
      ? { layer: node.params, rules: rulesIn(node) }
      : node.toString(),
  );
}

describe("the games' global stylesheet", () => {
  const styleGlobal = compiled("fixtures/style_global.scss");
  const gameGlobal = compiled("fixtures/game_global.scss");
  const added = topOf(gameGlobal.slice(styleGlobal.length));

  it("loads @fz/style's first, so the site's tokens and layers come before it", () => {
    expect(gameGlobal.startsWith(styleGlobal)).toBe(true);
  });

  it("then publishes the bar's size, keeps the page still and rings a busy round button, in layers alone", () => {
    expect(added).toEqual([
      {
        layer: "fz.tokens",
        rules: [
          {
            selector: ":root",
            declarations: {
              "--fz-bar-height": "73px",
              "--fz-rail-width": "64px",
            },
          },
        ],
      },
      {
        layer: "fz.base",
        rules: [
          {
            selector: ":root",
            declarations: { "overscroll-behavior": "none" },
          },
        ],
      },
      {
        layer: "fz.fragments",
        rules: [
          {
            selector: ".fz-button-circle[aria-busy=true]",
            declarations: { position: "relative" },
          },
          {
            selector: ".fz-button-circle[aria-busy=true]::after",
            declarations: {
              position: "absolute",
              inset: "-3px",
              border: "2px solid transparent",
              "border-radius": "50%",
              "border-top-color": "var(--fz-accent)",
              content: '""',
              "pointer-events": "none",
              animation: "fz-busy-turn 0.9s linear infinite",
            },
          },
        ],
      },
    ]);
  });

  it("turns a busy round button's ring a whole turn at a time", () => {
    const turns: Record<string, string>[] = [];
    parse(gameGlobal.slice(styleGlobal.length)).walkAtRules(
      "keyframes",
      (keyframes) => {
        if (keyframes.params !== "fz-busy-turn") return;
        turns.push(
          ...rulesIn(keyframes).map((rule) => ({
            [rule.selector]: Object.values(rule.declarations).join(";"),
          })),
        );
      },
    );

    expect(turns).toEqual([{ to: "rotate(1turn)" }]);
  });

  it("adds only to layers @fz/style orders, so a game's own rules win", () => {
    const [order] = parse(styleGlobal).nodes;
    const ordered = order?.type === "atrule" ? order.params.split(", ") : [];

    expect(ordered).toEqual(
      expect.arrayContaining(
        added.map((node) => (typeof node === "string" ? node : node.layer)),
      ),
    );
  });
});

describe("the games' toolkit", () => {
  it("emits no CSS, so a component can load it without repeating rules", () => {
    expect(compiled("_toolkit.scss")).toBe("");
  });

  it("brings @fz/style's mixins, the breakpoints and the bar's mixins", () => {
    const selectors: string[] = [];

    parse(compiled("fixtures/toolkit.scss")).walkRules(({ selector }) => {
      selectors.push(selector);
    });

    expect(selectors).toEqual([".hidden", ".narrow", ".title"]);
  });
});

describe("game-frame", () => {
  it("fills the window with the app and stands the stage beside the bar", () => {
    expect(rulesIn(parse(compiled("fixtures/frame.scss")))).toEqual([
      {
        selector: ":host",
        declarations: {
          position: "fixed",
          inset: "0",
          display: "block",
          overflow: "hidden",
        },
      },
      {
        selector: ":host(.compact)",
        declarations: {
          "--fz-bar-height": "60px",
          "--fz-rail-width": "64px",
        },
      },
      {
        selector: ".stage",
        declarations: {
          position: "absolute",
          inset: "var(--fz-bar-height) 0 0",
          container: "stage/size",
        },
      },
      {
        selector: ":host([data-bar=bottom]) .stage",
        declarations: { inset: "0 0 var(--fz-bar-height)" },
      },
      {
        selector: ":host([data-bar=end]) .stage",
        declarations: { inset: "0 var(--fz-rail-width) 0 0" },
      },
    ]);
  });
});
