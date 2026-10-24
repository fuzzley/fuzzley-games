import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "postcss";
import { compile } from "sass";

const LAYERS = ["fz.tokens", "fz.reset", "fz.base", "fz.fragments"];

/** Returns the CSS one of the library's stylesheets compiles to. */
function compiled(file: string): string {
  const src = path.dirname(fileURLToPath(import.meta.url));
  return compile(path.join(src, file)).css;
}

describe("global.scss", () => {
  const [order, ...rest] = parse(compiled("global.scss")).nodes;

  it("orders the layers before anything else", () => {
    expect(order?.toString()).toBe(`@layer ${LAYERS.join(", ")}`);
  });

  it("puts every rule in one of those layers, so an app's own rules win", () => {
    const outside = rest
      .map((node) =>
        node.type === "atrule" && node.name === "layer"
          ? node.params
          : node.toString(),
      )
      .filter((layer) => !LAYERS.includes(layer));

    expect(outside).toEqual([]);
  });
});

describe("the toolkit", () => {
  it("emits no CSS, so a stylesheet can load it without repeating rules", () => {
    expect(compiled("_index.scss")).toBe("");
  });
});
