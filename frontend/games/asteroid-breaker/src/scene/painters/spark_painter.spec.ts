import type { Spark } from "../../rules/sparks/sparks";
import { stepsIn } from "../../rules/stepper";
import { MOST_SPARKS, SPARK_LIFE_MS } from "../../rules/tuning";
import {
  type Board,
  isShown,
  metricsOf,
  onCanvas,
  overASecond,
  shown,
  startBoard,
  withShip,
  zoomOf,
} from "../../testing/belt_board";
import { placeSpark, shipOf } from "../../testing/field_picture";
import { type WrittenHalo, haloAlpha } from "../../view/art/energy";
import {
  SPARK_CUTS,
  SPARK_FRAMES,
  SPARK_TAIL_LENGTH,
  sparkHalo,
  sparkTurnOf,
} from "../../view/art/sparks";
import type { Copies } from "./copies";
import { HALO_DISC } from "./halo_painter";

/** Returns a number to three places, so places worked out two ways agree. */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/** Returns where each copy of a thing shows on the canvas, to three places, or null where it doesn't. */
function copiesOf(
  copies: Copies | undefined,
): readonly ({ readonly x: number; readonly y: number } | null)[] {
  return shown(copies).map((at) =>
    at ? { x: round(at.x), y: round(at.y) } : null,
  );
}

/** Returns where a place on the field lies on the board's canvas, to three places. */
function canvasAt(
  board: Board,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const at = onCanvas(metricsOf(board.shell), x, y);
  return { x: round(at.x), y: round(at.y) };
}

/** Returns the copies of each halo shown, of the halo painter's own or another's. */
function shownHalos(board: Board): readonly Copies[] {
  return board.scene.kit.halos.halos.filter((copies) =>
    copies.images.some((image) => image.visible),
  );
}

/** Returns the way an angle points, along x and y, to three places. */
function wayOf(angle: number): readonly number[] {
  return [round(Math.cos(angle)) + 0, round(Math.sin(angle)) + 0];
}

/** Returns a record a halo is written into. */
function blankHalo(): WrittenHalo {
  return { along: 0, across: 0, ahead: 0, turn: 0, strength: 0 };
}

/** Lays sparks on a board's field at places, in its first slots, and draws a frame. */
function sparksAt(
  board: Board,
  places: readonly (readonly [number, number])[],
): readonly Spark[] {
  const sparks = places.map(([x, y]) => placeSpark(board.shell.field, x, y));
  board.run.advance(16);
  return sparks;
}

describe("SparkPainter", () => {
  it("makes a spark for each slot the field holds", async () => {
    const board = await startBoard();

    expect(board.scene.kit.sparks.sparks).toHaveLength(MOST_SPARKS);
  });

  it("draws each spark where it lies, every third the larger, each turned its slot's way, as large as the field's zoom, and no other", async () => {
    const board = await startBoard();

    sparksAt(board, [
      [10, 10],
      [20, 12],
      [30, 14],
    ]);

    const { sparks } = board.scene.kit.sparks;
    expect(
      sparks.slice(0, 4).map((spark) => ({
        at: copiesOf(spark)[0],
        frame: spark.images[0]?.frame.name,
        turn: round(spark.images[0]?.rotation ?? 9),
        scale: spark.images[0]?.scaleX,
      })),
    ).toEqual([
      {
        at: canvasAt(board, 10, 10),
        frame: SPARK_FRAMES.medium,
        turn: round(sparkTurnOf(0)),
        scale: zoomOf(board.shell),
      },
      {
        at: canvasAt(board, 20, 12),
        frame: SPARK_FRAMES.medium,
        turn: round(sparkTurnOf(1)),
        scale: zoomOf(board.shell),
      },
      {
        at: canvasAt(board, 30, 14),
        frame: SPARK_FRAMES.large,
        turn: round(sparkTurnOf(2)),
        scale: zoomOf(board.shell),
      },
      {
        at: null,
        frame: SPARK_FRAMES.medium,
        turn: round(sparkTurnOf(3)),
        scale: 1,
      },
    ]);
  });

  it("draws a spark between its last place and its next", async () => {
    const board = await startBoard();
    const [spark] = sparksAt(board, [[10, 10]]);
    if (!spark) throw new Error("No spark.");
    spark.lastX = 8;
    board.shell.alpha = 0.5;

    board.run.advance(16);

    expect(copiesOf(board.scene.kit.sparks.sparks[0])[0]).toEqual(
      canvasAt(board, 9, 10),
    );
  });

  it("draws a spark again past the edge it reaches across", async () => {
    const board = await startBoard();

    sparksAt(board, [[0.1, 10]]);

    const { width } = board.shell.field.torus;
    expect(copiesOf(board.scene.kit.sparks.sparks[0])).toEqual([
      canvasAt(board, 0.1, 10),
      canvasAt(board, 0.1 + width, 10),
      null,
      null,
    ]);
  });

  it("glows round each spark in the accent, as far and as strongly as the view's halo says", async () => {
    const board = await startBoard();
    const metrics = metricsOf(board.shell);

    sparksAt(board, [
      [10, 10],
      [30, 14],
    ]);

    const scale = (2 * metrics.unit) / HALO_DISC.size;
    const { colors: palette } = board.shell;
    const looks = shownHalos(board).map((copies) => {
      const [image] = copies.images;
      return {
        at: copiesOf(copies)[0],
        tint: image?.tintTopLeft,
        scale: round(image?.scaleX ?? 0),
        alpha: image?.alpha,
      };
    });
    const looksFor = (x: number, y: number, size: "medium" | "large") => ({
      at: canvasAt(board, x, y),
      tint: palette.accent,
      scale: round(sparkHalo(size, blankHalo()).along * scale),
      alpha: haloAlpha(0.85, palette),
    });
    expect(looks).toEqual([
      looksFor(10, 10, "medium"),
      // The second spark lies in the second slot, which draws medium.
      looksFor(30, 14, "medium"),
    ]);
  });

  it("streaks a spark the ship draws in toward the pod, its tail behind it, as long and as wide as the view says", async () => {
    const board = await startBoard(withShip);
    const ship = shipOf(board.shell.field);

    // The third slot's spark is the larger, its tail the wider.
    sparksAt(board, [
      [ship.x - 9, ship.y - 9],
      [ship.x - 9, ship.y + 9],
      [ship.x + 3, ship.y],
    ]);

    const tail = board.scene.kit.sparks.tails[2];
    const [image] = tail?.images ?? [];
    const zoom = zoomOf(board.shell);
    expect({
      at: copiesOf(tail)[0],
      way: wayOf(image?.rotation ?? 0),
      along: round(image?.scaleX ?? 0),
      across: round(image?.scaleY ?? 0),
    }).toEqual({
      at: canvasAt(board, ship.x + 3, ship.y),
      way: [-1, 0],
      along: round(zoom * SPARK_TAIL_LENGTH),
      across: round((zoom * SPARK_CUTS.large.reach) / SPARK_CUTS.medium.reach),
    });
  });

  it("streaks a spark toward the pod across the field's edge", async () => {
    const board = await startBoard(withShip);
    const ship = shipOf(board.shell.field);
    ship.x = 1;
    ship.lastX = 1;

    sparksAt(board, [[board.shell.field.torus.width - 2, ship.y]]);

    const [image] = board.scene.kit.sparks.tails[0]?.images ?? [];
    expect(wayOf(image?.rotation ?? 9)).toEqual([1, 0]);
  });

  it("draws no tail behind a spark that hangs out of the ship's reach", async () => {
    const board = await startBoard(withShip);
    const ship = shipOf(board.shell.field);

    sparksAt(board, [[ship.x + 10, ship.y]]);

    expect(isShown(board.scene.kit.sparks.tails[0])).toBe(false);
  });

  it("draws no tail behind a spark once there is no ship to draw it in", async () => {
    const board = await startBoard(withShip);
    const ship = shipOf(board.shell.field);
    sparksAt(board, [[ship.x + 3, ship.y]]);
    const drawn = isShown(board.scene.kit.sparks.tails[0]);
    board.shell.field.ship = null;

    board.run.advance(16);

    expect([drawn, isShown(board.scene.kit.sparks.tails[0])]).toEqual([
      true,
      false,
    ]);
  });

  it("blinks a spark in its last second, its halo with it, and shows it whole before", async () => {
    const board = await startBoard();
    const [spark] = sparksAt(board, [[10, 10]]);
    if (!spark) throw new Error("No spark.");
    const read = () =>
      [
        isShown(board.scene.kit.sparks.sparks[0]),
        shownHalos(board).length,
      ].join();
    const before = overASecond(board.run, read);
    spark.shedAt = board.shell.field.steps - stepsIn(SPARK_LIFE_MS - 500);

    const blinking = overASecond(board.run, read);

    expect([before, blinking]).toEqual([
      new Set(["true,1"]),
      new Set(["true,1", "false,0"]),
    ]);
  });

  it("hides a spark that is gathered or gone, its tail and its halo with it", async () => {
    const board = await startBoard(withShip);
    const ship = shipOf(board.shell.field);
    const [spark] = sparksAt(board, [[ship.x + 3, ship.y]]);
    if (!spark) throw new Error("No spark.");
    spark.live = false;

    board.run.advance(16);

    expect({
      spark: isShown(board.scene.kit.sparks.sparks[0]),
      tail: isShown(board.scene.kit.sparks.tails[0]),
      halos: shownHalos(board).length,
    }).toEqual({ spark: false, tail: false, halos: 0 });
  });
});
