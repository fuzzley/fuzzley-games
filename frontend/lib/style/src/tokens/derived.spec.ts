import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "postcss";
import { compileString } from "sass";
import { DEFAULT_THEMES, PALETTE_ROLES, THEMES } from "../themes.ts";

// The surfaces that float over a game, which each palette sets by its mode.
const SURFACES = ["bar-glass", "panel-glass", "float", "well"] as const;

/** One rule of the derived tokens: its selectors and its custom properties. */
interface TokenRule {
  readonly selectors: readonly string[];
  readonly tokens: ReadonlyMap<string, string>;
}

/** Returns the derived tokens' rules, in order. */
function compiledRules(): readonly TokenRule[] {
  const tokens = path.dirname(fileURLToPath(import.meta.url));
  const { css } = compileString('@use "derived";', { loadPaths: [tokens] });
  const rules: TokenRule[] = [];
  parse(css).walkRules((rule) => {
    const found = new Map<string, string>();
    rule.walkDecls(/^--fz-/, (declaration) => {
      found.set(declaration.prop.slice("--fz-".length), declaration.value);
    });
    rules.push({ selectors: rule.selectors, tokens: found });
  });
  return rules;
}

/** Returns a surface's value in a palette, from the rule naming the palette. */
function surface(
  rules: readonly TokenRule[],
  id: string,
  name: string,
): string | undefined {
  return rules
    .filter(({ selectors }) => selectors.includes(`[data-theme=${id}]`))
    .find(({ tokens }) => tokens.has(name))
    ?.tokens.get(name);
}

describe("the surfaces", () => {
  const rules = compiledRules();
  const light = THEMES.filter(({ mode }) => mode === "light");
  const dark = THEMES.filter(({ mode }) => mode === "dark");

  describe.each(SURFACES)("--fz-%s", (name) => {
    it.each(THEMES)("is set in $name", ({ id }) => {
      expect(surface(rules, id, name)).toBeDefined();
    });

    it.each(light)("is a palette role, so solid, in $name", ({ id }) => {
      const role = /^var\(--fz-([\w-]+)\)$/.exec(
        surface(rules, id, name) ?? "",
      );

      expect(PALETTE_ROLES).toContain(role?.[1]);
    });
  });

  it.each(dark)(
    "lets the game show through the bar and the panels in $name",
    ({ id }) => {
      const glass = [
        surface(rules, id, "bar-glass"),
        surface(rules, id, "panel-glass"),
      ];

      expect(glass).toEqual([
        expect.stringContaining("transparent"),
        expect.stringContaining("transparent"),
      ]);
    },
  );

  it("gives a page with no palette yet the default's surfaces", () => {
    const root = rules.find(({ selectors }) => selectors.join() === ":root");

    expect(Object.fromEntries(root?.tokens ?? [])).toEqual(
      Object.fromEntries(
        SURFACES.map((name) => [
          name,
          surface(rules, DEFAULT_THEMES.light, name),
        ]),
      ),
    );
  });

  it("sets the root's surfaces before a palette's, so a palette's own win", () => {
    const first = rules.find(({ tokens }) => tokens.has("float"));

    expect(first?.selectors).toEqual([":root"]);
  });
});
