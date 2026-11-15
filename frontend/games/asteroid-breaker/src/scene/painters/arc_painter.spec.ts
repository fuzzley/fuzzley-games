import { commandsOf } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import type { Rock } from "../../rules/rocks/rocks";
import { STATIC_MOST, ZAP_ARCS } from "../../rules/tuning";
import {
  type Board,
  type FakeShell,
  isShown,
  metricsOf,
  onCanvas,
  startBoard,
  stillness,
  withShip,
  zoomOf,
} from "../../testing/belt_board";
import { fieldFrom, placeRock, shipOf } from "../../testing/field_picture";
import {
  ARC_FROM,
  ARC_RIM,
  BRANCH_WEIGHT,
  HULL_ARC_CORE,
  HULL_STROKES,
  ZAP_STROKES,
  arcSparkHalo,
  arcWidth,
  zapAlpha,
} from "../../view/art/arcs";
import { rimToward } from "../../view/art/breaks";
import { type WrittenHalo, energyOf, haloAlpha } from "../../view/art/energy";
import { HALO_DISC } from "./halo_painter";

/** Describes a path a `Graphics` strokes: the places it runs through, on the canvas, and its line. */
interface StrokedPath {
  readonly width: number;
  readonly color: number;
  readonly alpha: number;
  readonly at: readonly { readonly x: number; readonly y: number }[];
}

/** Returns each path a `Graphics` strokes, in order, with the line it was stroked in. */
function pathsOf(graphics: GameObjects.Graphics): readonly StrokedPath[] {
  const paths: StrokedPath[] = [];
  let style = { width: 1, color: 0, alpha: 1 };
  let at: { readonly x: number; readonly y: number }[] = [];
  for (const command of commandsOf(graphics)) {
    if (command.kind === "lineStyle") style = command;
    if (command.kind === "beginPath") at = [];
    if (command.kind === "moveTo" || command.kind === "lineTo") {
      at.push({ x: command.x, y: command.y });
    }
    if (command.kind === "strokePath") {
      const { width, color, alpha } = style;
      paths.push({ width, color, alpha, at });
    }
  }
  return paths;
}

/** Returns a number to three places, so places worked out two ways agree. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000 + 0;
}

/** Returns a place to three places. */
function rounded(at: { readonly x: number; readonly y: number } | undefined): {
  readonly x: number;
  readonly y: number;
} {
  return { x: round(at?.x ?? NaN), y: round(at?.y ?? NaN) };
}

/** Returns where a place on the field lies on the board's canvas, to three places. */
function canvasAt(
  board: Board,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  return rounded(onCanvas(metricsOf(board.shell), x, y));
}

/** Returns the paths the arcs' lines stroke. */
function arcPaths(board: Board): readonly StrokedPath[] {
  return pathsOf(board.scene.kit.arcs.lines);
}

/** Returns where each path starts and ends, to three places. */
function endsOf(paths: readonly StrokedPath[]): readonly (readonly {
  readonly x: number;
  readonly y: number;
}[])[] {
  return paths.map(({ at }) => [rounded(at[0]), rounded(at.at(-1))]);
}

/** Returns where on the field a zap's arc to a rock ahead of the pod along x lands: just inside its rim toward the pod. */
function landingOf(rock: Rock): { readonly x: number; readonly y: number } {
  return { x: rock.x - rimToward(rock, Math.PI) * ARC_RIM, y: rock.y };
}

/** Returns a record a halo is written into. */
function blankHalo(): WrittenHalo {
  return { along: 0, across: 0, ahead: 0, turn: 0, strength: 0 };
}

/**
 * Starts a board with the pod in its field and a medium rock laid ahead of
 * it, so far along x, logs a zap's arc to it, and draws a frame.
 */
async function startZapped(
  setUp: (shell: FakeShell) => void = () => undefined,
  ahead = 8,
): Promise<{ readonly board: Board; readonly rock: Rock }> {
  const board = await startBoard((shell) => {
    withShip(shell);
    setUp(shell);
  });
  const { field } = board.shell;
  const ship = shipOf(field);
  const rock = placeRock(field, "medium", ship.x + ahead, ship.y);
  field.events.addArc(rock, ahead, 0);
  board.run.advance(16);
  return { board, rock };
}

describe("ArcPainter", () => {
  describe("a zap's arc", () => {
    it("is stroked from past the hull to just inside the rock's rim, its halo, body and middle back to front, each its main line then its branches", async () => {
      const { board, rock } = await startZapped();
      const ship = shipOf(board.shell.field);

      const paths = arcPaths(board);

      const from = canvasAt(board, ship.x + ARC_FROM, ship.y);
      const to = canvasAt(board, landingOf(rock).x, rock.y);
      expect({
        paths: paths.length,
        mains: endsOf(paths.filter((_, i) => i % 3 === 0)),
      }).toEqual({
        // Three strokes, each of the main line and its two branches.
        paths: 9,
        mains: [
          [from, to],
          [from, to],
          [from, to],
        ],
      });
    });

    it("is stroked in the accent's energy, as wide and as opaque as the view says, a branch narrower", async () => {
      const { board } = await startZapped();
      const metrics = metricsOf(board.shell);
      const palette = board.shell.colors;
      const tones = energyOf(palette.accent, palette);

      const lines = arcPaths(board).map(({ width, color, alpha }) => [
        round(width),
        color,
        round(alpha),
      ]);

      expect(lines).toEqual(
        ZAP_STROKES.flatMap((stroke) => {
          const color = tones[stroke.tone];
          const alpha = round(zapAlpha(stroke, 1, palette));
          const branch = [
            round(arcWidth(stroke, BRANCH_WEIGHT, metrics)),
            color,
            alpha,
          ];
          return [
            [round(arcWidth(stroke, 1, metrics)), color, alpha],
            branch,
            branch,
          ];
        }),
      );
    });

    it("leaps anew after 45 ms where motion is welcome", async () => {
      const { board } = await startZapped();
      const first = arcPaths(board)[0]?.at.map(rounded);

      board.run.advance(50);

      expect(arcPaths(board)[0]?.at.map(rounded)).not.toEqual(first);
    });

    it("holds its first leap where motion isn't welcome", async () => {
      const { board } = await startZapped(stillness);
      const first = arcPaths(board)[0]?.at.map(rounded);

      board.run.advance(50);

      expect(arcPaths(board)[0]?.at.map(rounded)).toEqual(first);
    });

    it("fades after 90 ms", async () => {
      const { board } = await startZapped();

      board.run.advance(120);

      // The body's main line, after the halo's and its two branches.
      const body = ZAP_STROKES[1];
      if (!body) throw new Error("No body.");
      expect(round(arcPaths(board)[3]?.alpha ?? 0)).toBe(
        round(zapAlpha(body, 1 - (120 - 90) / 90, board.shell.colors)),
      );
    });

    it("is gone by 180 ms, its spark and its glow with it", async () => {
      const { board } = await startZapped();

      board.run.advance(200);

      expect({
        paths: arcPaths(board).length,
        spark: isShown(board.scene.kit.arcs.sparks[0]),
        glow: isShown(board.scene.kit.arcs.glows[0]),
      }).toEqual({ paths: 0, spark: false, glow: false });
    });

    it("lands a spark where it ends, as large as the field's zoom, over its glow in the accent, as the view says", async () => {
      const { board, rock } = await startZapped();
      const metrics = metricsOf(board.shell);
      const palette = board.shell.colors;

      const [image] = board.scene.kit.arcs.sparks[0]?.images ?? [];
      const [haloImage] = board.scene.kit.arcs.glows[0]?.images ?? [];

      const at = canvasAt(board, landingOf(rock).x, rock.y);
      const scale = (2 * metrics.unit) / HALO_DISC.size;
      expect({
        at: rounded(image),
        scale: image?.scaleX,
        alpha: image?.alpha,
        halo: rounded(haloImage),
        haloScale: round(haloImage?.scaleX ?? 0),
        haloAlpha: round(haloImage?.alpha ?? 0),
        tint: haloImage?.tintTopLeft,
        disc: haloImage?.texture.key,
      }).toEqual({
        at,
        scale: zoomOf(board.shell),
        alpha: 1,
        halo: at,
        haloScale: round(arcSparkHalo(0, 1, blankHalo()).along * scale),
        haloAlpha: round(
          haloAlpha(arcSparkHalo(0, 1, blankHalo()).strength, palette),
        ),
        tint: palette.accent,
        disc: HALO_DISC.key,
      });
    });

    it("follows the pod as it flies", async () => {
      const { board, rock } = await startZapped();
      const ship = shipOf(board.shell.field);
      ship.x -= 2;
      ship.lastX -= 2;

      board.run.advance(16);

      expect(endsOf(arcPaths(board).slice(0, 1))).toEqual([
        [
          canvasAt(board, ship.x + ARC_FROM, ship.y),
          canvasAt(board, landingOf(rock).x, rock.y),
        ],
      ]);
    });

    it("leaps from where the pod zapped while no pod is drawn", async () => {
      const { board } = await startZapped();
      const ship = shipOf(board.shell.field);
      const zappedAt = { x: ship.x, y: ship.y };
      board.shell.field.ship = null;

      board.run.advance(16);

      expect(endsOf(arcPaths(board).slice(0, 1))[0]?.[0]).toEqual(
        canvasAt(board, zappedAt.x + ARC_FROM, zappedAt.y),
      );
    });

    it("is stroked again past the field's edge it reaches across", async () => {
      const { board } = await startZapped((shell) => {
        const ship = shipOf(shell.field);
        ship.x = shell.field.torus.width - 3;
        ship.lastX = ship.x;
      });
      const { width } = board.shell.field.torus;

      // Each line is stroked, then its copy.
      const [main, copy] = endsOf(arcPaths(board));

      expect(copy).toEqual(
        main?.map(({ x, y }) => ({
          x: round(x - width * metricsOf(board.shell).unit),
          y,
        })),
      );
    });

    it("is drawn for no other event at a rock", async () => {
      const board = await startBoard(withShip);
      const { field } = board.shell;
      const ship = shipOf(field);
      const rock = placeRock(field, "medium", ship.x + 8, ship.y);
      field.events.addRock("hit", rock);

      board.run.advance(16);

      expect(arcPaths(board)).toHaveLength(0);
    });

    it("leaps to no rock that lies over the hull", async () => {
      const { board } = await startZapped(undefined, 2);

      expect({
        paths: arcPaths(board).length,
        spark: isShown(board.scene.kit.arcs.sparks[0]),
      }).toEqual({ paths: 0, spark: false });
    });

    it("takes the oldest's slot once every slot holds one", async () => {
      const { board, rock } = await startZapped();
      board.run.advance(150);
      const { events } = board.shell.field;
      for (let i = 0; i < ZAP_ARCS; i++) events.addArc(rock, 8, 0);

      board.run.advance(16);

      // The first arc's slot, nearly faded, now holds the last arc, whole.
      expect(
        board.scene.kit.arcs.sparks.map((spark) => ({
          shown: isShown(spark),
          alpha: spark.images[0]?.alpha,
        })),
      ).toEqual(
        Array.from({ length: ZAP_ARCS }, () => ({ shown: true, alpha: 1 })),
      );
    });

    it("is forgotten as a new field starts", async () => {
      const { board } = await startZapped();
      board.shell.field = fieldFrom(["...", ".^.", "..."]);

      board.run.advance(16);

      expect(arcPaths(board)).toHaveLength(0);
    });
  });

  describe("the arcs crawling over the hull", () => {
    /** Starts a board with the pod in its field, static at a level. */
    async function startCharged(
      level: number,
      setUp: (shell: FakeShell) => void = () => undefined,
    ): Promise<Board> {
      return startBoard((shell) => {
        withShip(shell);
        shell.field.charge.level = level;
        setUp(shell);
      });
    }

    it("crawl over the hull at full static, three in the pilot's ink under a white core, about the pod", async () => {
      const board = await startCharged(STATIC_MOST);
      const { field, colors: palette } = board.shell;
      const metrics = metricsOf(board.shell);
      const ship = shipOf(field);
      const pod = onCanvas(metrics, ship.x, ship.y);

      const paths = arcPaths(board);

      const ink = palette.pilots[field.crew.pilot ?? 0];
      const lines = (index: number, color: number | undefined) => {
        const stroke = HULL_STROKES[index];
        if (!stroke) throw new Error("No stroke.");
        const line = [round(arcWidth(stroke, 1, metrics)), color, stroke.alpha];
        return [line, line, line];
      };
      expect({
        lines: paths.map(({ width, color, alpha }) => [
          round(width),
          color,
          alpha,
        ]),
        near: paths.every(({ at }) =>
          at.every(
            ({ x, y }) => Math.hypot(x - pod.x, y - pod.y) < 1.2 * metrics.unit,
          ),
        ),
      }).toEqual({
        lines: [...lines(0, ink), ...lines(1, HULL_ARC_CORE)],
        near: true,
      });
    });

    it("crawl none short of full static", async () => {
      const board = await startCharged(STATIC_MOST - 1);

      expect(arcPaths(board)).toHaveLength(0);
    });

    it("crawl none with no pilot at the controls", async () => {
      const board = await startCharged(STATIC_MOST, (shell) => {
        shell.field.crew = { ...shell.field.crew, pilot: null };
      });

      expect(arcPaths(board)).toHaveLength(0);
    });

    it("crawl anew every 100 ms where motion is welcome", async () => {
      const board = await startCharged(STATIC_MOST);
      const first = endsOf(arcPaths(board));

      board.run.advance(100);

      expect(endsOf(arcPaths(board))).not.toEqual(first);
    });

    it("hold still where motion isn't welcome", async () => {
      const board = await startCharged(STATIC_MOST, stillness);
      const first = endsOf(arcPaths(board));

      board.run.advance(100);

      expect(endsOf(arcPaths(board))).toEqual(first);
    });

    it("are stroked again past the field's edge the pod reaches across", async () => {
      const board = await startCharged(STATIC_MOST, (shell) => {
        const ship = shipOf(shell.field);
        ship.x = 0.5;
        ship.lastX = 0.5;
      });

      expect(arcPaths(board)).toHaveLength(12);
    });

    it("are stroked again past both edges and the corner the pod reaches across", async () => {
      const board = await startCharged(STATIC_MOST, (shell) => {
        const ship = shipOf(shell.field);
        Object.assign(ship, { x: 0.5, lastX: 0.5, y: 0.5, lastY: 0.5 });
      });

      expect(arcPaths(board)).toHaveLength(24);
    });

    it("crawl two where the pod's fine marks don't show", async () => {
      const board = await startBoard(
        (shell) => {
          withShip(shell);
          shell.field.charge.level = STATIC_MOST;
        },
        { width: 480, height: 320 },
      );

      // Two arcs, each in the pilot's ink and its white core.
      expect(arcPaths(board)).toHaveLength(4);
    });
  });
});
