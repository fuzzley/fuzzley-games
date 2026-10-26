import path from "node:path";
import { parse } from "postcss";
import { compileStylesheet } from "./testing/index.ts";

const LAYERS = ["fz.tokens", "fz.reset", "fz.base", "fz.fragments"];

/** Returns the CSS one of the library's stylesheets compiles to. */
function compiled(file: string): string {
  return compileStylesheet(path.join(import.meta.dirname, file));
}

describe("global.scss", () => {
  const [order, ...rest] = parse(compiled("global.scss")).nodes;

  it("orders the layers before anything else", () => {
    expect(order?.toString()).toBe(`@layer ${LAYERS.join(", ")}`);
  });

  it("puts every rule in one of those layers, so an app's own rules win", () => {
    // A font face declares a font, not a style, so it has nothing to win.
    const outside = rest
      .filter((node) => node.type !== "comment")
      .filter((node) => !(node.type === "atrule" && node.name === "font-face"))
      .map((node) =>
        node.type === "atrule" && node.name === "layer"
          ? node.params
          : node.toString(),
      )
      .filter((layer) => !LAYERS.includes(layer));

    expect(outside).toEqual([]);
  });

  it("declares the font --fz-font names first", () => {
    const families = new Set<string>();

    parse(compiled("global.scss")).walkAtRules("font-face", (face) => {
      face.walkDecls("font-family", ({ value }) => {
        families.add(value.replace(/['"]/g, ""));
      });
    });

    expect([...families]).toEqual(["Figtree Variable"]);
  });

  it("styles only classes named with fz, so none collides with an app's", () => {
    const unprefixed = new Set<string>();

    parse(compiled("global.scss")).walkRules(({ selector }) => {
      // The lookbehind skips the point in a keyframe's `12.5%`.
      for (const [, name = ""] of selector.matchAll(/(?<![\w%])\.([\w-]+)/g)) {
        if (!name.startsWith("fz-")) unprefixed.add(name);
      }
    });

    expect([...unprefixed]).toEqual([]);
  });
});

describe("the tokens alone", () => {
  it("style no element, so a page with a reset of its own can load them", () => {
    const styles = new Set<string>();

    parse(compiled("tokens/_index.scss")).walkDecls(({ prop, parent }) => {
      const inFontFace = parent?.type === "atrule";
      if (!inFontFace && !prop.startsWith("--") && prop !== "color-scheme") {
        styles.add(prop);
      }
    });

    expect([...styles]).toEqual([]);
  });
});

describe("the toolkit", () => {
  it("emits no CSS, so a stylesheet can load it without repeating rules", () => {
    expect(compiled("_index.scss")).toBe("");
  });
});
