import path from "node:path";
import { compileStylesheet } from "@fz/style/testing";
import { type Rule, parse } from "postcss";
import { LABELLED_ACTIONS_MIN_WIDTH_PX } from "./breakpoints";

/** A rule a stylesheet compiles to, with the media query it sits in, if any. */
interface CompiledRule {
  readonly media: string;
  readonly selector: string;
  readonly declarations: ReadonlyMap<string, string>;
}

const MOTION_WELCOME = "(prefers-reduced-motion: no-preference)";

// What `below("desktop")` writes, which takes a hair off the width so a
// window exactly on it matches only `from()`.
const BELOW_DESKTOP = `(max-width: ${LABELLED_ACTIONS_MIN_WIDTH_PX - 0.02}px)`;

/** Returns the rules a fixture in `fixtures/` compiles to, in order. */
function rulesOf(fixture: string): readonly CompiledRule[] {
  const css = compileStylesheet(
    path.join(import.meta.dirname, "fixtures", fixture),
  );
  const rules: CompiledRule[] = [];
  parse(css).each((node) => {
    if (node.type === "rule") rules.push(compiled(node, ""));
    if (node.type === "atrule") {
      node.walkRules((rule) => {
        rules.push(compiled(rule, node.params));
      });
    }
  });
  return rules;
}

/** Returns a rule's selector and declarations, in the media query given. */
function compiled(rule: Rule, media: string): CompiledRule {
  return {
    media,
    selector: rule.selector.replace(/\s+/g, " "),
    declarations: new Map(
      rule.nodes.flatMap((node) =>
        node.type === "decl" ? [[node.prop, node.value] as const] : [],
      ),
    ),
  };
}

/**
 * Returns the declarations of the rule for `selector` in `rules`, inside the
 * media query given, or outside any; none if there is no such rule.
 */
function declared(
  rules: readonly CompiledRule[],
  selector: string,
  media = "",
): ReadonlyMap<string, string> | undefined {
  return rules.find(
    (rule) => rule.selector === selector && rule.media === media,
  )?.declarations;
}

describe("the bar's mixins", () => {
  // Each mixin given only what it must, then each that takes one every option.
  const defaults = rulesOf("bar_defaults.scss");
  const options = rulesOf("bar_options.scss");

  it("write only the rules a bar includes, in the order it includes them", () => {
    expect(
      defaults.map(({ media, selector }) =>
        media ? `${media} ${selector}` : selector,
      ),
    ).toEqual([
      ".title",
      ".metrics",
      ".metric",
      ".metric dt",
      ".metric dt fz-icon",
      ".value",
      ".action",
      ".action[aria-disabled=true]",
      `${MOTION_WELCOME} .settings`,
      `${MOTION_WELCOME} .settings:hover`,
      `${BELOW_DESKTOP} :host`,
      `${BELOW_DESKTOP} .action:not(.fz-button-circle)`,
      `${BELOW_DESKTOP} .btn-text`,
      ":host(.compact) .metric",
      ":host(.compact) .metric dt",
      ":host(.compact) .metric dt fz-icon",
      ":host(.compact) .metric .label",
      ":host(.compact) .metric .value",
      ":host(.paired) .metrics",
      ":host(.paired) .metric",
      ":host(.paired) .metric .value",
      ":host(.rail) .metrics",
      ":host(.rail) .metric",
      ":host(.rail) .metric .value",
    ]);
  });

  describe("bar-title", () => {
    it("holds the title to one line, cut short with an ellipsis", () => {
      expect(declared(defaults, ".title")).toEqual(
        new Map([
          ["min-width", "0"],
          ["margin", "0"],
          ["overflow", "hidden"],
          ["color", "var(--fz-bar-text)"],
          ["font-size", "var(--fz-font-lg)"],
          ["font-weight", "700"],
          ["text-overflow", "ellipsis"],
          ["white-space", "nowrap"],
        ]),
      );
    });
  });

  describe("bar-figures", () => {
    it("draws each figure as a card at least as wide as asked", () => {
      expect(declared(defaults, ".metric")).toEqual(
        new Map([
          ["display", "flex"],
          ["flex-direction", "column"],
          ["align-items", "center"],
          ["justify-content", "center"],
          ["flex", "0 1 auto"],
          ["min-width", "72px"],
          ["padding", "var(--fz-space-1) var(--fz-space-4)"],
          ["border", "1px solid var(--fz-edge-2)"],
          ["border-radius", "var(--fz-radius-md)"],
          ["background", "var(--fz-wash-2)"],
        ]),
      );
    });

    it("sets the cards side by side, with no gap unless asked", () => {
      expect(declared(defaults, ".metrics")).toEqual(
        new Map([
          ["display", "flex"],
          ["min-width", "0"],
          ["margin", "0"],
        ]),
      );
    });

    it("sets the cards as far apart as asked", () => {
      expect(declared(options, ".metrics")?.get("gap")).toBe(
        "var(--fz-space-4)",
      );
    });

    it("shows each label in small capitals over its value", () => {
      expect(declared(defaults, ".metric dt")).toEqual(
        new Map([
          ["display", "flex"],
          ["margin-bottom", "2px"],
          ["color", "var(--fz-muted)"],
          ["font-size", "var(--fz-font-2xs)"],
          ["font-weight", "700"],
          ["letter-spacing", "0.1em"],
          ["text-transform", "uppercase"],
        ]),
      );
    });

    it("hides each label's icon", () => {
      expect(declared(defaults, ".metric dt fz-icon")).toEqual(
        new Map([["display", "none"]]),
      );
    });

    it("sets each value in monospace digits of one width", () => {
      expect(declared(defaults, ".value")).toEqual(
        new Map([
          ["display", "flex"],
          ["align-items", "center"],
          ["margin", "0"],
          ["color", "var(--fz-text)"],
          ["font-family", "var(--fz-font-mono)"],
          ["font-size", "var(--fz-font-lg)"],
          ["font-weight", "700"],
          ["font-variant-numeric", "tabular-nums"],
        ]),
      );
    });

    it("makes each card as wide as the bar asks", () => {
      expect(declared(options, ".metric")?.get("min-width")).toBe("90px");
    });
  });

  describe("bar-figures-inline", () => {
    it("sets each figure's icon beside its value, as far apart as asked", () => {
      expect(declared(defaults, ":host(.compact) .metric")).toEqual(
        new Map([
          ["--fz-icon-size", "15px"],
          ["flex-direction", "row"],
          ["gap", "4px"],
          ["min-width", "0"],
        ]),
      );
    });

    it("sets each icon as far from its value as the bar asks", () => {
      expect(declared(options, ":host(.compact) .metric")?.get("gap")).toBe(
        "5px",
      );
    });

    it("pads each figure as asked", () => {
      expect(declared(options, ":host(.compact) .metric")?.get("padding")).toBe(
        "6px var(--fz-space-2)",
      );
    });

    it("takes the label's margin away, so the icon sits level with its value", () => {
      expect(declared(defaults, ":host(.compact) .metric dt")).toEqual(
        new Map([["margin", "0"]]),
      );
    });

    it("shows the icon in place of the label, which is heard but not seen", () => {
      expect([
        declared(defaults, ":host(.compact) .metric dt fz-icon"),
        declared(defaults, ":host(.compact) .metric .label")?.get("clip-path"),
      ]).toEqual([new Map([["display", "block"]]), "inset(50%)"]);
    });

    it("sets each value smaller", () => {
      expect(declared(defaults, ":host(.compact) .metric .value")).toEqual(
        new Map([["font-size", "var(--fz-font-sm)"]]),
      );
    });
  });

  describe("bar-figures-paired", () => {
    it("sets the figures one over the other, in a card of their own", () => {
      expect(declared(defaults, ":host(.paired) .metrics")).toEqual(
        new Map([
          ["flex-direction", "column"],
          ["gap", "2px"],
          ["padding", "4px var(--fz-space-2)"],
          ["border", "1px solid var(--fz-edge-2)"],
          ["border-radius", "var(--fz-radius-md)"],
          ["background", "var(--fz-wash-2)"],
        ]),
      );
    });

    it("takes each figure's own card away, its icon and value at either end", () => {
      expect(declared(defaults, ":host(.paired) .metric")).toEqual(
        new Map([
          ["justify-content", "space-between"],
          ["padding", "0"],
          ["border", "0"],
          ["background", "none"],
        ]),
      );
    });

    it("sets the two values close, one over the other", () => {
      expect(declared(defaults, ":host(.paired) .metric .value")).toEqual(
        new Map([["line-height", "1"]]),
      );
    });
  });

  describe("bar-figures-stacked", () => {
    it("stacks the figures", () => {
      expect(declared(defaults, ":host(.rail) .metrics")).toEqual(
        new Map([["flex-direction", "column"]]),
      );
    });

    it("sets each figure's icon over its value, in a narrow card", () => {
      expect(declared(defaults, ":host(.rail) .metric")).toEqual(
        new Map([
          ["flex-direction", "column"],
          ["gap", "2px"],
          ["padding", "6px 4px"],
        ]),
      );
    });

    it("sets each value smaller still", () => {
      expect(declared(defaults, ":host(.rail) .metric .value")).toEqual(
        new Map([["font-size", "var(--fz-font-xs)"]]),
      );
    });
  });

  describe("bar-actions", () => {
    it("gives every action a finger's tap", () => {
      expect(declared(defaults, ".action")).toEqual(
        new Map([
          ["min-width", "var(--fz-tap-target)"],
          ["min-height", "var(--fz-tap-target)"],
        ]),
      );
    });

    it("turns the gear under the pointer only where motion is welcome", () => {
      expect([
        declared(defaults, ".settings", MOTION_WELCOME),
        declared(defaults, ".settings:hover", MOTION_WELCOME),
      ]).toEqual([
        new Map([
          [
            "transition",
            "background var(--fz-duration-base) var(--fz-ease-standard), transform var(--fz-duration-base) var(--fz-ease-standard)",
          ],
        ]),
        new Map([["transform", "rotate(45deg)"]]),
      ]);
    });

    it("tightens the bar's gaps below desktop", () => {
      expect(declared(defaults, ":host", BELOW_DESKTOP)).toEqual(
        new Map([
          ["--fz-bar-gap", "var(--fz-space-3)"],
          ["--fz-bar-actions-gap", "var(--fz-space-2)"],
        ]),
      );
    });

    it("rounds a labelled action below desktop, its label heard but not seen", () => {
      expect([
        declared(defaults, ".action:not(.fz-button-circle)", BELOW_DESKTOP),
        declared(defaults, ".btn-text", BELOW_DESKTOP)?.get("clip-path"),
      ]).toEqual([
        new Map([
          ["padding", "var(--fz-space-2)"],
          ["border-radius", "50%"],
        ]),
        "inset(50%)",
      ]);
    });

    it("dims an action marked disabled, keeping it in reach", () => {
      expect(declared(defaults, ".action[aria-disabled=true]")).toEqual(
        new Map([
          ["opacity", "0.4"],
          ["cursor", "default"],
        ]),
      );
    });
  });
});
