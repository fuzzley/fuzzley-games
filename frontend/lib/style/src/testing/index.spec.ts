import path from "node:path";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  luminance,
  over,
  paint,
  paletteRoles,
  rgb,
} from "./index.ts";

const FIXTURES = path.join(import.meta.dirname, "fixtures");
const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
const RED: Rgb = [255, 0, 0];

describe("compileStylesheet", () => {
  it("loads a library's stylesheet by its package name", () => {
    const css = compileStylesheet(path.join(FIXTURES, "library.scss"));

    expect(css).toContain("--fz-accent:");
  });

  it("loads another package, such as the font, through its own exports", () => {
    const css = compileStylesheet(path.join(FIXTURES, "library.scss"));

    expect(css).toContain('font-family: "Figtree Variable"');
  });

  it("fails on a stylesheet the library doesn't export", () => {
    const file = path.join(FIXTURES, "missing.scss");

    expect(() => compileStylesheet(file)).toThrow(/Can't find stylesheet/);
  });
});

describe("paletteRoles", () => {
  const roles = paletteRoles(`
    @layer fz.tokens {
      :root, [data-theme=day] { --fz-text: #111111; --fz-page: #ffffff; color: red; }
      [data-theme="night"] { --fz-text: #eeeeee; --fz-page: #000000; }
      [data-theme] {
        --fz-wash: color-mix(
          in srgb,
          var(--fz-text) 5%,
          transparent
        );
        --fz-page: #808080;
      }
      [data-theme=night] .card { --fz-text: #000000; }
      /* [data-theme=day] { --fz-text: #222222; } */
    }`);

  it("finds every palette by its id", () => {
    expect([...roles.keys()]).toEqual(["day", "night"]);
  });

  it("reads a palette's own roles, and nothing else", () => {
    expect(Object.fromEntries(roles.get("day") ?? [])).toEqual({
      text: "#111111",
      page: "#ffffff",
      wash: "color-mix(in srgb, var(--fz-text) 5%, transparent)",
    });
  });

  it("gives every palette the roles declared on all of them, on one line", () => {
    expect(roles.get("night")?.get("wash")).toBe(
      "color-mix(in srgb, var(--fz-text) 5%, transparent)",
    );
  });

  it("lets a palette's own role win over one declared on all of them", () => {
    expect(roles.get("night")?.get("page")).toBe("#000000");
  });

  it("leaves out what is declared inside a palette rather than on it", () => {
    expect(roles.get("night")?.get("text")).toBe("#eeeeee");
  });
});

describe("rgb", () => {
  it("reads six hex digits", () => {
    expect(rgb("#2f7d4f")).toEqual([47, 125, 79]);
  });

  it("reads three", () => {
    expect(rgb("#f80")).toEqual([255, 136, 0]);
  });

  it("throws on anything but a hex color", () => {
    expect(() => rgb("red")).toThrow("red is no hex color");
  });
});

describe("over", () => {
  it("blends two colors channel by channel", () => {
    expect(over(RED, [0, 0, 255], 0.75)).toEqual([191.25, 0, 63.75]);
  });
});

describe("luminance", () => {
  it("is 1 for white", () => {
    expect(luminance(WHITE)).toBe(1);
  });

  it("is 0 for black", () => {
    expect(luminance(BLACK)).toBe(0);
  });
});

describe("contrast", () => {
  it("measures black on white at 21:1", () => {
    expect(contrast(BLACK, WHITE)).toBe(21);
  });

  it("measures the same either way round", () => {
    expect(contrast(WHITE, BLACK)).toBe(21);
  });

  it("measures a color on itself at 1:1", () => {
    expect(contrast(RED, RED)).toBe(1);
  });
});

describe("paint", () => {
  const roles = new Map([
    ["text", "#ffffff"],
    ["glass", "rgba(0, 0, 255, 0.5)"],
  ]);

  it("paints a hex color", () => {
    expect(paint("#123456", roles)).toEqual([18, 52, 86]);
  });

  it("paints black", () => {
    expect(paint("black", roles)).toEqual(BLACK);
  });

  it("paints a role as its value", () => {
    expect(paint("var(--fz-text)", roles)).toEqual(WHITE);
  });

  it("paints a tint of a role over what is under it", () => {
    const tint = "color-mix(in srgb, var(--fz-text) 25%, transparent)";

    expect(paint(tint, roles, BLACK)).toEqual([63.75, 63.75, 63.75]);
  });

  it("paints a value written over several lines", () => {
    const tint =
      "color-mix(\n  in srgb,\n  var(--fz-text) 25%,\n  transparent\n)";

    expect(paint(tint, roles, BLACK)).toEqual([63.75, 63.75, 63.75]);
  });

  it("paints a translucent rgba() over what is under it", () => {
    expect(paint("rgba(0, 0, 255, 0.5)", roles, RED)).toEqual([
      127.5, 0, 127.5,
    ]);
  });

  it("paints a translucent role over what is under it", () => {
    expect(paint("var(--fz-glass)", roles, RED)).toEqual([127.5, 0, 127.5]);
  });

  it("throws on a translucent value with nothing under it", () => {
    expect(() => paint("var(--fz-glass)", roles)).toThrow(
      "rgba(0, 0, 255, 0.5) is translucent, so it needs what is under it",
    );
  });

  it("throws on a role the palette doesn't set", () => {
    expect(() => paint("var(--fz-accent)", roles)).toThrow(
      "No --fz-accent to paint",
    );
  });

  it("throws on a value it can't paint", () => {
    expect(() => paint("hsl(0 0% 0%)", roles)).toThrow(
      "hsl(0 0% 0%) is no hex color",
    );
  });
});
