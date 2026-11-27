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
// frizzball's against the frizzball, and its pupils against them where it
// has them; a cage's bars against each kind they cross; and dust's specks
// against dust and thick dust. The hint's hand and a wave's mark, which lie
// over the pieces, keep it against the grounds; the page among them is the
// color of the rim each wears, which every piece keeps 3:1 against, so
// either reads over any piece. A tuft of fluff takes its kind's ink, and is
// held as its kind is, or the frizzball's. The effects' white, a ring's, a
// streak's and a flash's light, keeps it against the grounds it spreads
// over. A cage's bar flying off as it opens is its frame's steel, which
// keeps it against the grounds it flies over, as the bars' ink would not.
//
// A kind keeps less against its second fur, about 2:1 in a light palette
// and as little as 1.25:1 in a dark one, as the design's art mixes the fur:
// not even white keeps 3:1 against a dark palette's gold, and a light
// palette's fur dark enough for it reads as an outline, not as a darker
// shade of its kind. A rim in the square's color lies between the two, and
// each keeps 3:1 against the square.
//
// Some pairs keep less, as no ink could keep them at 3:1. A brick's cushion
// against the one beneath: 4 cushions each 3:1 from the next would span
// 27:1, more than black and white, so they step about 1.3:1 in lightness,
// each keeping 3:1 against the square. Dust against a clean square: no fill
// 3:1 off the square would keep every kind 3:1 against it, so dust is told
// by its specks, and thick dust by more and larger ones. And a cage's bars
// against the square between its fuzzball and its frame, as no ink keeps
// 3:1 against both a dark palette's square and every kind: the frame tells
// the cage there.
//
// A brick's darker undersides keep 3:1 only where one draws the pile's
// edge: the bottom cushion's, the floor the pile stands on, against the
// square, dust and thick dust. Each other cushion's meets the square only
// in the thin gap beneath it and at its ears: shading a player needn't
// tell from the square, since the cushion's face, held against it, tells
// the cushion. A dark palette's darkest undersides keep about 2:1
// against thick dust.
//
// Two more keep less, which a player needn't tell apart. A kind against
// its burr: the ring of thorns stands round its fuzzball, off it, as the
// design draws it, so the fuzzball lies on the square. And the sleepyhead's
// nightcap against its body: the cap is told by its outline against the
// square, and the sleepyhead from a fuzzball by its gray-blue, which no
// kind wears, and its shut eyes.
//
// A burr's edges, darker than its thorns as the design draws them, keep
// 3:1 against the grounds in a light palette alone. In a dark one they are
// darker than the squares too, and only outline the thorns between them,
// which keep it.
//
// The nightcap's trim, its band and its pompom, keeps 3:1 against the
// grounds, which the pompom pokes out over. It keeps less against the
// nightcap, about 2:1 in a light palette and 2.7:1 in a dark one, and in a
// dark one against the body as well, about 1.9:1, where the band's ends
// hang over it: no ink keeps 3:1 against both a light palette's cap and
// its square, and the trim only dresses the cap, which its outline against
// the square tells.
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
    const burrEdges: readonly Named[] =
      mode === "light" ? [["burr's edges", palette.burrEdge]] : [];
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
      ["cage's bar flying", palette.cage.frame],
      ["burr", palette.burr],
      ...burrEdges,
      ["sleepyhead", palette.sleepyhead.body],
      ["sleepyhead's nightcap", palette.sleepyhead.nightcap],
      ["sleepyhead's nightcap's trim", palette.nightcapTrim],
      ["frizzball", palette.frizzball.body],
      ["sparks", palette.spark],
      ["focus ring", ring],
      ["hint's hand", palette.marks],
      ["wave's mark", palette.marks],
      ["effects' white", palette.flare],
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
      ...(palette.frizzball.pupils === undefined
        ? []
        : against("frizzball's eyes", palette.frizzball.eyes, [
            ["frizzball's pupils", palette.frizzball.pupils],
          ])),
      ...dusts.flatMap(([dust, color]) =>
        against(dust, color, [["specks", palette.specks]]),
      ),
      ...[["square", palette.square] as const, ...dusts].flatMap(
        ([ground, color]) =>
          against(ground, color, [
            ["brick's floor", palette.cushionUndersides[1]],
          ]),
      ),
    ];
  });
});
