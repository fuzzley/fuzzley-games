import type { Field } from "../../rules/field/field";
import type { Rock } from "../../rules/rocks/rocks";
import { stepsIn } from "../../rules/stepper";
import {
  COMET_MARGIN,
  MOST_SPARKS,
  PICKUP_BLINK_MS,
  ROCK_RADIUS,
} from "../../rules/tuning";
import {
  type Board,
  DARK,
  layersOf,
  metricsOf,
  onCanvas,
  overASecond,
  shown,
  startBoard,
  stillness,
  withShip,
} from "../../testing/belt_board";
import {
  KEEPER,
  fieldFrom,
  placeComet,
  placePickup,
  placeRock,
  placeShot,
  shipOf,
} from "../../testing/field_picture";
import {
  type Halo,
  MOST_ROCK_HALOS,
  SHOTS,
  flameHalo,
  haloAlpha,
  rockHalos,
  roundHalo,
} from "../../view/art/energy";
import { ENGINES } from "../../view/art/pod_art";
import {
  CHEVRON_HALOS,
  COMET_HALOS,
  pickupLook,
  restingLook,
} from "../../view/art/things";
import type { Copies } from "./copies";
import { HALO_DISC } from "./halo_painter";

/** Returns the halos shown, each as where its images show, by the order they were shown in. */
function shownHalos(
  board: Board,
): readonly (readonly ({ readonly x: number; readonly y: number } | null)[])[] {
  return board.scene.kit.halos.halos
    .filter((copies) => copies.images.some((image) => image.visible))
    .map(shown);
}

/** Returns the copies of the first halo, failing if it has none. */
function firstHalo(board: Board): Copies {
  const [halo] = board.scene.kit.halos.halos;
  if (!halo) throw new Error("The painter made no halo.");
  return halo;
}

/** Returns how a halo's image is drawn: its tint, its turn, its scale across and down, and its alpha. */
function looksOf(copies: Copies): readonly number[] {
  const [image] = copies.images;
  return image
    ? [
        image.tintTopLeft,
        image.rotation,
        image.scaleX,
        image.scaleY,
        image.alpha,
      ]
    : [];
}

/** Returns where a halo about a rock lies on the field, by the rock's place and turn. */
function haloPlace(
  rock: Rock,
  halo: { readonly ahead: number; readonly turn: number },
): { readonly x: number; readonly y: number } {
  const way = rock.angle + halo.turn;
  return {
    x: rock.x + Math.cos(way) * halo.ahead,
    y: rock.y + Math.sin(way) * halo.ahead,
  };
}

/** Returns a rock's first halo, failing if it gives off none. */
function firstHaloOf(rock: Rock): Halo {
  const [halo] = rockHalos(rock);
  if (!halo) throw new Error(`A ${rock.kind} rock gives off no halo.`);
  return halo;
}

/** A halo longer along its way than across it, ahead of its thing and turned from it, as a shot's is. */
const LONG_HALO: Halo = {
  along: 3,
  across: 1,
  ahead: 1,
  turn: 0.5,
  strength: 1,
};

describe("the halos", () => {
  it("lie in their own layer, over the place and the field, under the tags and the rocks", async () => {
    const board = await startBoard();

    const layer = layersOf(board.scene).get("halos");

    expect(firstHalo(board).images.every((image) => layer?.exists(image))).toBe(
      true,
    );
  });

  it("draw a crystal's halo where its gems glow, turned with it, as far as they glow, in its ink, as strongly as the palette lets them show", async () => {
    const board = await startBoard();
    const rock = placeRock(board.shell.field, "large", 30, 20, "crystal");
    rock.angle = 0.4;
    const halo = firstHaloOf(rock);
    const metrics = metricsOf(board.shell);
    const at = haloPlace(rock, halo);
    const scale = (2 * halo.along * metrics.unit) / HALO_DISC.size;

    board.run.advance(16);

    const palette = board.shell.colors;
    expect([shownHalos(board), looksOf(firstHalo(board))]).toEqual([
      [[onCanvas(metrics, at.x, at.y), null, null, null]],
      [
        palette.rockGlows.gem,
        expect.closeTo(rock.angle + halo.turn, 9),
        scale,
        scale,
        haloAlpha(halo.strength, palette),
      ],
    ]);
  });

  it("draw a volatile rock's two halos about its middle, in its core's glow", async () => {
    const board = await startBoard((shell) => {
      shell.colors = DARK;
    });
    placeRock(board.shell.field, "medium", 30, 20, "volatile");
    const metrics = metricsOf(board.shell);

    board.run.advance(16);

    expect({
      shown: shownHalos(board),
      tints: board.scene.kit.halos.halos
        .slice(0, 2)
        .map((copies) => copies.images[0]?.tintTopLeft),
    }).toEqual({
      shown: [
        [onCanvas(metrics, 30, 20), null, null, null],
        [onCanvas(metrics, 30, 20), null, null, null],
      ],
      tints: [DARK.rockGlows.core, DARK.rockGlows.core],
    });
  });

  it("draw a rock's halos on both sides of an edge they reach across", async () => {
    const board = await startBoard();
    placeRock(board.shell.field, "medium", 1, 20, "volatile");
    const metrics = metricsOf(board.shell);
    const { width } = board.shell.field.torus;

    board.run.advance(16);

    expect(shownHalos(board)[0]).toEqual([
      onCanvas(metrics, 1, 20),
      onCanvas(metrics, 1 + width, 20),
      null,
      null,
    ]);
  });

  it("draw none for a rock that gives off no light", async () => {
    const board = await startBoard();
    placeRock(board.shell.field, "large", 30, 20, "stone");

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("hide a rock's halos once it breaks", async () => {
    const board = await startBoard();
    const rock = placeRock(board.shell.field, "medium", 30, 20, "volatile");
    board.run.advance(16);
    rock.live = false;

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("make room for all a field's rocks, shots, pickups and comets and the pod's flame could give off, its sparks, and the muzzle's and a blast's flashes, as the field starts", async () => {
    const board = await startBoard();
    board.shell.field = fieldFrom(KEEPER, { cap: 60 });

    board.run.advance(16);

    const { shots, pickups, comets } = board.shell.field;
    expect(board.scene.kit.halos.halos).toHaveLength(
      60 * MOST_ROCK_HALOS +
        shots.slots.length +
        pickups.length +
        2 * comets.slots.length +
        ENGINES.length +
        MOST_SPARKS +
        // The muzzle's flash's, and a blast's flash's: the field flashes
        // one at a time.
        1 +
        1,
    );
  });

  it("draw a shot's halo a little ahead of it along its travel, in the accent, as long, as wide and as strong as its weapon's", async () => {
    const board = await startBoard();
    placeShot(board.shell.field, "lance", 30, 20, -Math.PI / 2);
    const { halo } = SHOTS.lance;
    const metrics = metricsOf(board.shell);
    const scale = (2 * metrics.unit) / HALO_DISC.size;

    board.run.advance(16);

    const palette = board.shell.colors;
    expect([shownHalos(board), looksOf(firstHalo(board))]).toEqual([
      [[onCanvas(metrics, 30, 20 - halo.ahead), null, null, null]],
      [
        palette.accent,
        expect.closeTo(-Math.PI / 2, 9),
        halo.along * scale,
        halo.across * scale,
        haloAlpha(halo.strength, palette),
      ],
    ]);
  });

  it("hide a shot's halo once it lands", async () => {
    const board = await startBoard();
    const shot = placeShot(board.shell.field, "gun", 30, 20);
    board.run.advance(16);
    shot.lifeSteps = 0;

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("draw a pickup's halo about it, round, in the accent, as wide and as strong as its orb's look, still where motion isn't welcome", async () => {
    const board = await startBoard(stillness);
    placePickup(board.shell.field, "magnet", 30, 20);
    const metrics = metricsOf(board.shell);
    const look = restingLook();
    const scale = (2 * look.haloReach * metrics.unit) / HALO_DISC.size;

    board.run.advance(16);

    const palette = board.shell.colors;
    expect([shownHalos(board), looksOf(firstHalo(board))]).toEqual([
      [[onCanvas(metrics, 30, 20), null, null, null]],
      [palette.accent, 0, scale, scale, haloAlpha(look.haloStrength, palette)],
    ]);
  });

  it("draw a pickup's halo breathing with its orb where motion is welcome, at its own slot's phase", async () => {
    const board = await startBoard();
    placePickup(board.shell.field, "spread", 20, 20);
    const floating = placePickup(board.shell.field, "magnet", 40, 20);
    const slot = board.shell.field.pickups.indexOf(floating);
    const at = board.scene.time.now + 16;
    const look = pickupLook(floating, slot, at / 1000, true, restingLook());
    const metrics = metricsOf(board.shell);

    board.run.advance(16);

    const [image] = board.scene.kit.halos.halos[1]?.images ?? [];
    expect([image?.scaleX, image?.alpha]).toEqual([
      expect.closeTo((2 * look.haloReach * metrics.unit) / HALO_DISC.size, 9),
      expect.closeTo(haloAlpha(look.haloStrength, board.shell.colors), 9),
    ]);
  });

  it("draw a pickup's halo only while its orb shows bright, through its last seconds' blinks", async () => {
    const board = await startBoard();
    const floating = placePickup(board.shell.field, "spread", 30, 20);
    floating.lifeSteps = stepsIn(PICKUP_BLINK_MS);

    const seen = overASecond(board.run, () => shownHalos(board).length);

    expect(seen).toEqual(new Set([0, 1]));
  });

  it("hide a pickup's halo once it is caught or fades", async () => {
    const board = await startBoard();
    const floating = placePickup(board.shell.field, "spread", 30, 20);
    board.run.advance(16);
    floating.live = false;

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("draw a comet's head's halo ahead of its middle and its tail's long behind it, along its way, in the danger color", async () => {
    const board = await startBoard();
    placeComet(board.shell.field, 30, 20, Math.PI / 2);
    const metrics = metricsOf(board.shell);
    const { head, tail } = COMET_HALOS;

    board.run.advance(16);

    expect({
      shown: shownHalos(board),
      tints: board.scene.kit.halos.halos
        .slice(0, 2)
        .map((copies) => copies.images[0]?.tintTopLeft),
    }).toEqual({
      shown: [
        [onCanvas(metrics, 30, 20 + head.ahead), null, null, null],
        [onCanvas(metrics, 30, 20 + tail.ahead), null, null, null],
      ],
      tints: [board.shell.colors.comet, board.shell.colors.comet],
    });
  });

  it("draw a comet's tail's halo as strongly as its tail shows, off the field", async () => {
    const board = await startBoard();
    placeComet(board.shell.field, -COMET_MARGIN / 2, 20);
    const palette = board.shell.colors;

    board.run.advance(16);

    const [, tail] = board.scene.kit.halos.halos;
    expect(tail?.images[0]?.alpha).toBeCloseTo(
      haloAlpha(COMET_HALOS.tail.strength / 2, palette),
      9,
    );
  });

  it("draw a warning's lit chevron's halo where the chevron lies, and none while its chevrons are held still", async () => {
    const lit = await startBoard();
    placeComet(lit.shell.field, -COMET_MARGIN, 20).warnSteps = 100;
    const still = await startBoard(stillness);
    placeComet(still.shell.field, -COMET_MARGIN, 20).warnSteps = 100;

    lit.run.advance(16);
    still.run.advance(16);

    expect([shownHalos(lit), shownHalos(still)]).toEqual([
      [
        [
          onCanvas(metricsOf(lit.shell), CHEVRON_HALOS[0].ahead, 20),
          null,
          null,
          null,
        ],
      ],
      [],
    ]);
  });

  it("draw the pod's flame's halo behind each engine, in the flame's color, as long as the thrust makes the flame", async () => {
    const board = await startBoard((each) => {
      withShip(each);
      stillness(each);
    });
    const ship = shipOf(board.shell.field);
    ship.held.thrust = 0.5;
    const metrics = metricsOf(board.shell);
    const palette = board.shell.colors;
    const halos = ENGINES.map((engine) =>
      flameHalo(engine, 0.5, palette, {
        along: 0,
        across: 0,
        ahead: 0,
        turn: 0,
        strength: 0,
      }),
    );

    board.run.advance(16);

    expect({
      shown: shownHalos(board).map((copies) => copies[0]),
      tints: board.scene.kit.halos.halos
        .slice(0, ENGINES.length)
        .map((copies) => copies.images[0]?.tintTopLeft),
    }).toEqual({
      shown: halos.map((halo) =>
        onCanvas(
          metrics,
          ship.x + Math.cos(ship.angle + halo.turn) * halo.ahead,
          ship.y + Math.sin(ship.angle + halo.turn) * halo.ahead,
        ),
      ),
      tints: ENGINES.map(() => palette.flame),
    });
  });

  it.each([
    [
      "with no thrust",
      (field: Field): void => {
        shipOf(field).held.thrust = 0;
      },
    ],
    [
      "once the wave is cleared",
      (field: Field): void => {
        field.cleared = true;
      },
    ],
    [
      "with no pilot at the controls",
      (field: Field): void => {
        field.crew = { ...field.crew, pilot: null };
      },
    ],
  ])("draw no flame's halo %s", async (_, arrange) => {
    const board = await startBoard(withShip);
    shipOf(board.shell.field).held.thrust = 1;
    arrange(board.shell.field);

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("draw a rock's halos where the rock is drawn between its last place and its next", async () => {
    const board = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const rock = placeRock(board.shell.field, "medium", 30, 20, "volatile");
    rock.lastX = 28;

    board.run.advance(16);

    expect(shownHalos(board)[0]?.[0]).toEqual(
      onCanvas(metricsOf(board.shell), 29, 20),
    );
  });

  it("draw a rock's halos the short way across the wrap from its last place, at the edge it crossed", async () => {
    const board = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const rock = placeRock(board.shell.field, "medium", 1, 20, "volatile");
    rock.lastX = board.shell.field.torus.width - 1;

    board.run.advance(16);

    expect(shownHalos(board)[0]?.[0]).toEqual(
      onCanvas(metricsOf(board.shell), 0, 20),
    );
  });

  it("are as wide on the field as twice their reach", async () => {
    const board = await startBoard();
    const rock = placeRock(board.shell.field, "large", 30, 20, "volatile");
    const halo = firstHaloOf(rock);
    const metrics = metricsOf(board.shell);

    board.run.advance(16);

    const [image] = firstHalo(board).images;
    expect((image?.displayWidth ?? 0) / metrics.unit).toBeCloseTo(
      2 * halo.along,
      9,
    );
  });
});

describe("a halo another painter shows", () => {
  /** Starts a board whose halo painter has room for one halo more, and a frame drawn. */
  async function startReserving(): Promise<Board> {
    const board = await startBoard();
    board.scene.kit.halos.reserve(1);
    board.shell.field = fieldFrom(KEEPER);
    board.run.advance(16);
    return board;
  }

  it("is made room for as the next field starts", async () => {
    const board = await startReserving();

    expect(board.scene.kit.halos.halos).toHaveLength(
      board.shell.field.rocks.length * MOST_ROCK_HALOS +
        board.shell.field.shots.slots.length +
        board.shell.field.pickups.length +
        2 * board.shell.field.comets.slots.length +
        ENGINES.length +
        MOST_SPARKS +
        // The muzzle's flash's, a blast's flash's, then this one's.
        1 +
        1 +
        1,
    );
  });

  it("shows over the rocks' halos of the frame it is shown in, where its thing is drawn", async () => {
    const board = await startReserving();
    const rock = placeRock(board.shell.field, "medium", 30, 20, "crystal");
    board.run.advance(16);
    const { field, colors: palette } = board.shell;
    const metrics = metricsOf(board.shell);
    const at = haloPlace(rock, firstHaloOf(rock));

    board.scene.kit.halos.glow(
      roundHalo(ROCK_RADIUS.small, 1),
      palette.accent,
      { x: 10, y: 10, angle: 0 },
      { field, metrics, palette },
    );

    expect(shownHalos(board)).toEqual([
      [onCanvas(metrics, at.x, at.y), null, null, null],
      [onCanvas(metrics, 10, 10), null, null, null],
    ]);
  });

  it("is turned the way its thing points, ahead of it, as long along its way and as wide across it as it says", async () => {
    const board = await startReserving();
    const { field, colors: palette } = board.shell;
    const metrics = metricsOf(board.shell);
    const scale = (2 * metrics.unit) / HALO_DISC.size;
    const way = 0.2 + LONG_HALO.turn;

    board.scene.kit.halos.glow(
      LONG_HALO,
      palette.accent,
      { x: 30, y: 20, angle: 0.2 },
      { field, metrics, palette },
    );

    const [own] = board.scene.kit.halos.halos;
    expect([shownHalos(board), own ? looksOf(own) : []]).toEqual([
      [
        [
          onCanvas(
            metrics,
            30 + Math.cos(way) * LONG_HALO.ahead,
            20 + Math.sin(way) * LONG_HALO.ahead,
          ),
          null,
          null,
          null,
        ],
      ],
      [
        palette.accent,
        expect.closeTo(way, 9),
        LONG_HALO.along * scale,
        LONG_HALO.across * scale,
        haloAlpha(LONG_HALO.strength, palette),
      ],
    ]);
  });

  it.each([
    [LONG_HALO.along - 0.5, true],
    [LONG_HALO.along + 0.5, false],
  ])(
    "%f units from an edge, shows past it as far as it reaches along its way: %s",
    async (x, past) => {
      const board = await startReserving();
      const { field, colors: palette } = board.shell;
      const metrics = metricsOf(board.shell);
      const halo = { ...LONG_HALO, ahead: 0, turn: 0 };

      board.scene.kit.halos.glow(
        halo,
        palette.accent,
        { x, y: 20, angle: 0 },
        { field, metrics, palette },
      );

      expect(shownHalos(board)).toEqual([
        [
          onCanvas(metrics, x, 20),
          past ? onCanvas(metrics, x + field.torus.width, 20) : null,
          null,
          null,
        ],
      ]);
    },
  );

  it("shows once about a thing that crosses rather than wraps, where it lies off the field", async () => {
    const board = await startReserving();
    const { colors: palette } = board.shell;
    const metrics = metricsOf(board.shell);

    board.scene.kit.halos.glowOnce(
      roundHalo(2, 1),
      palette.comet,
      { x: -1, y: 0.5, angle: 0 },
      { metrics, palette },
    );

    expect(shownHalos(board)).toEqual([
      [onCanvas(metrics, -1, 0.5), null, null, null],
    ]);
  });

  it("is hidden on the next frame that shows it not", async () => {
    const board = await startReserving();
    const { field, colors: palette } = board.shell;
    board.scene.kit.halos.glow(
      roundHalo(1, 1),
      palette.accent,
      { x: 10, y: 10, angle: 0 },
      { field, metrics: metricsOf(board.shell), palette },
    );

    board.run.advance(16);

    expect(shownHalos(board)).toEqual([]);
  });

  it("is not shown past the room made for it", async () => {
    const board = await startBoard();
    const { field, colors: palette } = board.shell;
    const metrics = metricsOf(board.shell);
    const context = { field, metrics, palette };
    const halos = board.scene.kit.halos;
    const past = onCanvas(metrics, 20, 10);

    halos.halos.forEach(() => {
      halos.glow(
        roundHalo(1, 1),
        palette.accent,
        { x: 10, y: 10, angle: 0 },
        context,
      );
    });
    halos.glow(
      roundHalo(1, 1),
      palette.accent,
      { x: 20, y: 10, angle: 0 },
      context,
    );

    const shown = shownHalos(board);
    expect({
      count: shown.length,
      past: shown.filter(([at]) => at?.x === past.x && at?.y === past.y),
    }).toEqual({ count: halos.halos.length, past: [] });
  });
});
