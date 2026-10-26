import { fileURLToPath } from "node:url";
import { THEMES } from "@fz/style/themes";
import {
  compileStylesheet,
  contrast,
  paint,
  paletteRoles,
  rgb,
} from "@fz/style/testing";
import { FELT_KEYS, TABLE_FELTS } from "@/ui/app/model/table_felt";

const GLOBAL = fileURLToPath(
  new URL("../../../../src/ui/app/styles/global.scss", import.meta.url),
);

// In a dark palette the header is glass over the felt, so its labels'
// contrast depends on the felt as well as on the palette.
describe("the header's contrast", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));

  describe.each(THEMES)("in $name", ({ id }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();
    const felts = [
      { name: "its own felt", color: roles.get("felt") ?? "" },
      ...FELT_KEYS.map((key) => TABLE_FELTS[key]),
    ];

    it.each(felts)(
      "keeps a metric's muted label at 4.5:1 or more over $name",
      ({ color }) => {
        const bar = paint("var(--fz-bar-glass)", roles, rgb(color));
        const card = paint("var(--fz-wash-2)", roles, bar);

        const ratio = contrast(paint("var(--fz-muted)", roles), card);

        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});
