import path from "node:path";
import { colorNumber } from "@fz/phaser/color";
import { FUZZBALL } from "@fz/style/fuzzball";
import { stylesheetPalettes } from "@fz/style/testing";
import { against, holdContrast } from "@fz/style/testing/contrast";
import { BRICK_LAYERS } from "../../rules/catalog/elements";
import { KIND_IDS } from "../../rules/catalog/kinds";
import { BOARD_ROLES, boardPalette } from "./palette";

/** A color, named for what it draws. */
type Named = readonly [string, number];

/** The game's palettes, as its global stylesheet sets them. */
const PALETTES = stylesheetPalettes(
  // Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
  path.join(import.meta.dirname, "../../app/styles/global.scss"),
);

/** The eyes every fuzzball and the sleepyhead wear, as the house's fuzzball has them. */
const EYES = colorNumber(FUZZBALL.ink);

// Everything the board draws keeps 3:1, the bar for graphics, against what
// it lies on, in every palette: each kind, each kind's second fur, each of
// a brick's cushions, a cage's frame, a burr, the sleepyhead and its
// nightcap, the frizzball and the sparks, against a square, dust, thick
// dust, and the page round the squares and through the gaps, which a
// special's fur, a burr's thorns and a fuzzball falling past a gap reach.
// So does the ring the grid over the board draws round the square the keys
// are on, in the text, as Minesweeper's and Sudoku's squares are ringed.
// The eyes keep it against each kind and the sleepyhead, and the
// frizzball's against the frizzball; a cage's bars against each kind they
// cross; dust's specks against dust and thick dust; and, in a light
// palette, each kind against its second fur, which it lies on.
//
// Some pairs keep less, as no ink could keep them at 3:1. A kind against
// its second fur in a dark palette: not even white keeps 3:1 against the
// kinds' inks, 1.6:1 against gold, so the fur is told by its outline
// against the square. A brick's cushion against the one beneath: 4
// cushions each 3:1 from the next would span 27:1, more than black and
// white, so they step about 1.3:1 in lightness, each keeping 3:1 against
// the square. Dust against a clean square: no fill 3:1 off the square
// would keep every kind 3:1 against it, so dust is told by its specks, and
// thick dust by more and larger ones. And a cage's bars against the square
// between its fuzzball and its frame, as no ink keeps 3:1 against both a
// dark palette's square and every kind: the frame tells the cage there.
//
// Two more keep less, which a player needn't tell apart. A kind against
// its burr: the ring of thorns stands round its fuzzball, off it, as the
// design draws it, so the fuzzball lies on the square. And the sleepyhead's
// nightcap against its body: the cap is told by its outline against the
// square, and the sleepyhead from a fuzzball by its gray-blue, which no
// kind wears, and its shut eyes.
describe("the board's contrast", () => {
  holdContrast(({ id, mode }) => {
    const palette = boardPalette(PALETTES.rolesIn(id, BOARD_ROLES), mode);
    const ring = colorNumber(PALETTES.role(id, "text"));
    const dusts: readonly Named[] = [
      ["dust", palette.dust[1]],
      ["thick dust", palette.dust[2]],
    ];
    const grounds: readonly Named[] = [
      ["page", palette.page],
      ["square", palette.square],
      ...dusts,
    ];
    const kinds = KIND_IDS.map((kind): Named => [
      `${kind} fuzzball`,
      palette.kinds[kind],
    ]);
    const pieces: readonly Named[] = [
      ...kinds,
      ...KIND_IDS.map((kind): Named => [
        `${kind} special's second fur`,
        palette.secondFurs[kind],
      ]),
      ...BRICK_LAYERS.map((place): Named => [
        `brick's cushion ${String(place)} from the bottom`,
        palette.cushions[place],
      ]),
      ["cage's frame", palette.cage.frame],
      ["burr", palette.burr],
      ["sleepyhead", palette.sleepyhead.body],
      ["sleepyhead's nightcap", palette.sleepyhead.nightcap],
      ["frizzball", palette.frizzball.body],
      ["sparks", palette.spark],
      ["focus ring", ring],
    ];
    return [
      ...grounds.flatMap(([ground, color]) => against(ground, color, pieces)),
      ...kinds.flatMap(([kind, color]) =>
        against(kind, color, [
          ["eyes", EYES],
          ["cage's bars", palette.cage.bars],
        ]),
      ),
      ...against("sleepyhead", palette.sleepyhead.body, [["eyes", EYES]]),
      ...against("frizzball", palette.frizzball.body, [
        ["frizzball's eyes", palette.frizzball.eyes],
      ]),
      ...dusts.flatMap(([dust, color]) =>
        against(dust, color, [["specks", palette.specks]]),
      ),
      ...(mode === "light"
        ? KIND_IDS.flatMap((kind) =>
            against(`${kind} special's second fur`, palette.secondFurs[kind], [
              [`${kind} fuzzball`, palette.kinds[kind]],
            ]),
          )
        : []),
    ];
  });
});
