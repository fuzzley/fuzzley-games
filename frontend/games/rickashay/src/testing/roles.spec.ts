import { colorNumber } from "@fz/phaser/color";
import { THEMES } from "@fz/style/themes";
import { FIELD_ROLES } from "../view/colors/palette";
import { PALETTES } from "./roles";

describe("PALETTES", () => {
  // The game's stylesheet sets no role of its own, so this holds that it
  // compiles and sets every role the field is drawn in, in every palette.
  it.each(THEMES)(
    "reads each of the field's roles in $name from the game's stylesheet, as colors Phaser takes",
    ({ id }) => {
      const colors = PALETTES.rolesIn(id, FIELD_ROLES);

      expect(() => Object.values(colors).map(colorNumber)).not.toThrow();
    },
  );
});
