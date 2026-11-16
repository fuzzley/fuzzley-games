import type { GameObjects } from "phaser";
import { COMET_RECORDS } from "../../rules/hazards/comets";
import { stepsIn } from "../../rules/stepper";
import { COMET_MARGIN, COMET_WARNING_MS } from "../../rules/tuning";
import {
  layersOf,
  metricsOf,
  onCanvas,
  shownAt,
  startBoard,
  stillness,
  WIDER,
  withShip,
} from "../../testing/belt_board";
import { placeBurr, placeComet, shipOf } from "../../testing/field_picture";
import type { FieldMetrics } from "../../view/field/field_metrics";
import type { Copies } from "./copies";
import {
  BURR_FRAMES,
  BURR_HOLDS,
  CLINGING_SHARE,
  COMET_FRAMES,
  DASH_RUN,
  LANE,
  LANE_DASH_ALPHA,
  TAIL_BEHIND,
  burrGlintAt,
  laneWashAlpha,
  warningFrame,
} from "../../view/art/things";

/**
 * A canvas large enough for a burr clinging's barbs and glint: a field unit
 * of 16 CSS px and more, where the spec's canvas lays it out at under 11,
 * too small for a burr's, and {@link WIDER} at 13.5, large enough for those
 * of one adrift.
 */
const ROOMIER = { width: 1200, height: 700 } as const;

/** Returns a number rounded to nine places, as a spec compares one worked out two ways. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

/** Returns where an image is shown, each coordinate rounded to nine places, or null where it is hidden. */
function roundedAt(
  image: GameObjects.Image | undefined,
): { readonly x: number; readonly y: number } | null {
  const at = image ? shownAt(image) : null;
  return at && { x: rounded(at.x), y: rounded(at.y) };
}

/** Returns where a place on the field lies on the canvas, each coordinate rounded to nine places. */
function roundedOn(
  metrics: FieldMetrics,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const at = onCanvas(metrics, x, y);
  return { x: rounded(at.x), y: rounded(at.y) };
}

describe("the comets", () => {
  it("draw a comet crossing where it is, turned the way it flies, its head lit and its edge over it", async () => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, 30, 20, 0.5);

    run.advance(16);

    const [head] = scene.kit.hazards.comets;
    const [edge] = scene.kit.hazards.edges;
    const at = onCanvas(metricsOf(shell), 30, 20);
    expect({
      head: head && shownAt(head),
      edge: edge && shownAt(edge),
      turned: [head?.rotation, edge?.rotation],
      lit: head?.lighting,
      frames: [head?.frame.name, edge?.frame.name],
    }).toEqual({
      head: at,
      edge: at,
      turned: [0.5, 0.5],
      lit: true,
      frames: [COMET_FRAMES.head, COMET_FRAMES.edge],
    });
  });

  it("draw a comet between its last place and its next, off the field as it comes in", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const comet = placeComet(shell.field, -1, 20);
    comet.lastX = -2;

    run.advance(16);

    const [head] = scene.kit.hazards.comets;
    expect(head && shownAt(head)).toEqual(onCanvas(metricsOf(shell), -1.5, 20));
  });

  it("draw a comet's tail behind it along its way, whole while it is on the field", async () => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, 30, 20, Math.PI / 2);

    run.advance(16);

    const [tail] = scene.kit.hazards.tails;
    expect([tail && shownAt(tail), tail?.rotation, tail?.alpha]).toEqual([
      onCanvas(metricsOf(shell), 30, 20 - TAIL_BEHIND),
      Math.PI / 2,
      1,
    ]);
  });

  it.each([
    ["half as strongly halfway out to the margin", -COMET_MARGIN / 2, 0.5],
    ["not at all at the margin", -COMET_MARGIN, 0],
  ])("draw a comet's tail %s", async (_, x, alpha) => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, x, 20);

    run.advance(16);

    const [tail] = scene.kit.hazards.tails;
    expect([tail?.alpha, tail?.visible]).toEqual([alpha, alpha > 0]);
  });

  it("warn of a comet at the edge it will come in by, pointing in, its chevrons held still where motion isn't welcome, and draw it not yet", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const comet = placeComet(shell.field, -COMET_MARGIN, 20);
    comet.warnSteps = 100;

    run.advance(16);

    const [head] = scene.kit.hazards.comets;
    const [warning] = scene.kit.hazards.warnings;
    expect({
      comet: head && shownAt(head),
      warning: warning && shownAt(warning),
      turned: warning?.rotation,
      frame: warning?.frame.name,
    }).toEqual({
      comet: null,
      warning: onCanvas(metricsOf(shell), 0, 20),
      turned: 0,
      frame: warningFrame(null),
    });
  });

  it.each([
    [0, 0],
    [300, 1],
    [500, 2],
  ] as const)(
    "light a warning's chevrons in turn where motion is welcome, %i ms in its chevron %i",
    async (warnedMs, lit) => {
      const { shell, run, scene } = await startBoard();
      placeComet(shell.field, -COMET_MARGIN, 20).warnSteps =
        stepsIn(COMET_WARNING_MS) - stepsIn(warnedMs);

      run.advance(16);

      expect(scene.kit.hazards.warnings[0]?.frame.name).toBe(warningFrame(lit));
    },
  );

  it("lay a comet's lane from its warning across the field, its wash running a little past both edges", async () => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, -COMET_MARGIN, 20).warnSteps = 100;
    const metrics = metricsOf(shell);
    const { width } = shell.field.torus;

    run.advance(16);

    const [lane] = scene.kit.hazards.lanes;
    expect([
      lane && shownAt(lane),
      rounded((lane?.displayWidth ?? 0) / metrics.unit),
      rounded((lane?.displayHeight ?? 0) / metrics.unit),
      lane?.alpha,
    ]).toEqual([
      onCanvas(metrics, width / 2, 20),
      rounded(width + 2 * LANE.past),
      rounded(2 * LANE.half),
      laneWashAlpha(shell.colors),
    ]);
  });

  it("lay a comet's lane's dashes a run at a time from just past its chevrons, as many as reach the far edge", async () => {
    const { shell, run, scene } = await startBoard();
    placeComet(shell.field, -COMET_MARGIN, 20).warnSteps = 100;
    const metrics = metricsOf(shell);
    const { width } = shell.field.torus;
    const runs = Math.ceil((width - LANE.dashesFrom) / DASH_RUN);

    run.advance(16);

    const shown = (scene.kit.hazards.dashes[0] ?? []).filter(
      (image) => image.visible,
    );
    expect({
      first: shown[0] && shownAt(shown[0]),
      runs: shown.length,
      alphas: new Set(shown.map((image) => image.alpha)),
    }).toEqual({
      first: onCanvas(metrics, LANE.dashesFrom + DASH_RUN / 2, 20),
      runs,
      alphas: new Set([LANE_DASH_ALPHA]),
    });
  });

  it("lay a comet's lane under all that lies on the field, and its comet and warning over it", async () => {
    const { scene } = await startBoard();
    const layers = layersOf(scene);
    const { lanes, dashes, comets, warnings } = scene.kit.hazards;

    expect({
      lanes: [...lanes, ...dashes.flat()].every((image) =>
        layers.get("lanes")?.exists(image),
      ),
      hazards: [...comets, ...warnings].every((image) =>
        layers.get("hazards")?.exists(image),
      ),
    }).toEqual({ lanes: true, hazards: true });
  });

  it("hide a warning and its lane once its comet comes in", async () => {
    const { shell, run, scene } = await startBoard();
    const comet = placeComet(shell.field, -COMET_MARGIN, 20);
    comet.warnSteps = 100;
    run.advance(16);
    comet.warnSteps = 0;

    run.advance(16);

    const { warnings, lanes, dashes } = scene.kit.hazards;
    expect(
      [warnings[0], lanes[0], ...(dashes[0] ?? [])].some(
        (image) => image?.visible,
      ),
    ).toBe(false);
  });

  it("hide a comet, its edge and its tail once it is out of play", async () => {
    const { shell, run, scene } = await startBoard();
    const comet = placeComet(shell.field, 30, 20);
    run.advance(16);
    comet.live = false;

    run.advance(16);

    const { comets, edges, tails } = scene.kit.hazards;
    expect(
      [comets[0], edges[0], tails[0]].some((image) => image?.visible),
    ).toBe(false);
  });

  it("draw nothing for a record out of play", async () => {
    const { scene } = await startBoard();
    const { comets, edges, tails, warnings, lanes, dashes } = scene.kit.hazards;

    expect(
      [...comets, ...edges, ...tails, ...warnings, ...lanes, ...dashes.flat()]
        .map(shownAt)
        .filter((at) => at !== null),
    ).toEqual([]);
  });

  it("make a lane's dashes for each record", async () => {
    const { scene } = await startBoard();

    expect(scene.kit.hazards.dashes).toHaveLength(COMET_RECORDS);
  });
});

describe("the burrs", () => {
  it("draw a burr adrift where it is, turned the way it flies, barbed, its glint toward the light", async () => {
    const { shell, run, scene } = await startBoard(undefined, WIDER);
    placeBurr(shell.field, 30, 20, 0.5);
    const glint = burrGlintAt(shell.colors, 1, { x: 0, y: 0 });

    run.advance(16);

    const burr = scene.kit.hazards.burrs[0]?.images[0];
    const shine = scene.kit.hazards.burrGlints[0]?.images[0];
    const metrics = metricsOf(shell, WIDER);
    expect({
      burr: roundedAt(burr),
      turned: burr?.rotation,
      frame: burr?.frame.name,
      glint: roundedAt(shine),
      glintFrame: shine?.frame.name,
    }).toEqual({
      burr: roundedOn(metrics, 30, 20),
      turned: 0.5,
      frame: BURR_FRAMES.adrift,
      glint: roundedOn(metrics, 30 + glint.x, 20 + glint.y),
      glintFrame: BURR_FRAMES.glint,
    });
  });

  it("draw a burr adrift and each clinging bare, without its glint, on a field too small for them", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    placeBurr(shell.field, 30, 20);
    shipOf(shell.field).burrs = 3;

    run.advance(16);

    const { burrs, burrGlints, clinging, clingingGlints } = scene.kit.hazards;
    expect({
      frames: [burrs[0], ...clinging].map(
        (copies) => copies?.images[0]?.frame.name,
      ),
      glints: [burrGlints[0], ...clingingGlints].some((copies) =>
        copies?.images.some((image) => image.visible),
      ),
    }).toEqual({
      frames: [
        BURR_FRAMES.bare,
        ...BURR_HOLDS.map(({ bareFrame }) => bareFrame),
      ],
      glints: false,
    });
  });

  it("draw a burr coming in once, between its last place and its next, off the field", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    placeBurr(shell.field, -0.3, 20, 0, false).lastX = -0.8;

    run.advance(16);

    const images = scene.kit.hazards.burrs[0]?.images ?? [];
    expect(images.map((image) => roundedAt(image))).toEqual([
      roundedOn(metricsOf(shell), -0.55, 20),
      null,
      null,
      null,
    ]);
  });

  it("draw a burr that wraps again past the edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard();
    placeBurr(shell.field, 0.7, 20);

    run.advance(16);

    const across = scene.kit.hazards.burrs[0]?.images[1];
    expect(roundedAt(across)).toEqual(
      roundedOn(metricsOf(shell), 0.7 + shell.field.torus.width, 20),
    );
  });

  it("draw a burr that wraps between its last place and its next the short way across the edge, and past it", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const { width } = shell.field.torus;
    placeBurr(shell.field, 0.1, 20, Math.PI).lastX = width - 0.1;

    run.advance(16);

    const images = scene.kit.hazards.burrs[0]?.images ?? [];
    const metrics = metricsOf(shell);
    expect([roundedAt(images[0]), roundedAt(images[1])]).toEqual([
      roundedOn(metrics, 0, 20),
      roundedOn(metrics, width, 20),
    ]);
  });

  it("hide a burr and its glint once it is out of play", async () => {
    const { shell, run, scene } = await startBoard(undefined, WIDER);
    const burr = placeBurr(shell.field, 30, 20);
    run.advance(16);
    burr.live = false;

    run.advance(16);

    const { burrs, burrGlints } = scene.kit.hazards;
    expect(
      [...burrs, ...burrGlints].some((copies) =>
        copies.images.some((image) => image.visible),
      ),
    ).toBe(false);
  });

  it("make a burr's images for each slot a field may have adrift", async () => {
    const { shell, scene } = await startBoard();

    expect([
      scene.kit.hazards.burrs.length,
      scene.kit.hazards.burrGlints.length,
    ]).toEqual([
      shell.field.burrs.slots.length,
      shell.field.burrs.slots.length,
    ]);
  });

  it("draw a burr at each of the pod's first holds for each clinging, turned with the pod, barbed, its glint toward the light", async () => {
    const { shell, run, scene } = await startBoard(withShip, ROOMIER);
    const ship = shipOf(shell.field);
    Object.assign(ship, {
      x: 30,
      y: 20,
      lastX: 30,
      lastY: 20,
      angle: Math.PI / 2,
      lastAngle: Math.PI / 2,
      burrs: 2,
    });
    const glint = burrGlintAt(shell.colors, CLINGING_SHARE, { x: 0, y: 0 });
    const metrics = metricsOf(shell, ROOMIER);
    // A quarter turn down the field takes a hold's x down and its y back.
    const held = BURR_HOLDS.map(({ at }) => ({ x: 30 - at.y, y: 20 + at.x }));

    run.advance(16);

    const { clinging, clingingGlints } = scene.kit.hazards;
    expect({
      burrs: clinging.map(({ images }) => roundedAt(images[0])),
      turned: clinging
        .slice(0, 2)
        .map(({ images }) => rounded(images[0]?.rotation ?? 0)),
      frames: clinging.map(({ images }) => images[0]?.frame.name),
      glints: clingingGlints.map(({ images }) => roundedAt(images[0])),
    }).toEqual({
      burrs: [
        ...held.slice(0, 2).map(({ x, y }) => roundedOn(metrics, x, y)),
        null,
      ],
      // Phaser keeps a rotation within half a turn either way.
      turned: BURR_HOLDS.slice(0, 2).map(({ turn }) =>
        rounded(
          Math.atan2(
            Math.sin(turn + Math.PI / 2),
            Math.cos(turn + Math.PI / 2),
          ),
        ),
      ),
      frames: BURR_HOLDS.map(({ frame }) => frame),
      glints: [
        ...held
          .slice(0, 2)
          .map(({ x, y }) => roundedOn(metrics, x + glint.x, y + glint.y)),
        null,
      ],
    });
  });

  it("draw a burr clinging past the edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    Object.assign(shipOf(shell.field), {
      x: 0.5,
      y: 20,
      lastX: 0.5,
      lastY: 20,
      angle: Math.PI,
      lastAngle: Math.PI,
      burrs: 1,
    });
    const { width } = shell.field.torus;
    const metrics = metricsOf(shell);

    run.advance(16);

    // Turned half about, the first hold lies 1.12 behind the pod's middle,
    // past the field's left edge, and 0.3 below it.
    const images = scene.kit.hazards.clinging[0]?.images ?? [];
    expect([roundedAt(images[0]), roundedAt(images[1])]).toEqual([
      roundedOn(metrics, width - 0.62, 20.3),
      roundedOn(metrics, -0.62, 20.3),
    ]);
  });

  it("draw no burr clinging, nor its glint, between one pod and the next", async () => {
    const { shell, run, scene } = await startBoard(withShip, ROOMIER);
    shipOf(shell.field).burrs = 3;
    run.advance(16);
    shell.field.ship = null;

    run.advance(16);

    const { clinging, clingingGlints } = scene.kit.hazards;
    expect(
      [...clinging, ...clingingGlints].some((copies) =>
        copies.images.some((image) => image.visible),
      ),
    ).toBe(false);
  });

  it("draw the burrs adrift with the hazards, and those clinging over the pod", async () => {
    const { shell, run, scene } = await startBoard(withShip, ROOMIER);
    const layers = layersOf(scene);
    placeBurr(shell.field, 30, 20);
    shipOf(shell.field).burrs = 2;

    run.advance(16);

    const { burrs, burrGlints, clinging, clingingGlints } = scene.kit.hazards;
    const shownIn = (copies: readonly (Copies | undefined)[]): unknown[] =>
      copies
        .flatMap((each) => each?.images ?? [])
        .filter((image) => image.visible)
        .map((image) => image.displayList);
    const hazards = layers.get("hazards");
    const clingers = layers.get("burrs");
    expect({
      adrift: shownIn([burrs[0], burrGlints[0]]),
      clinging: shownIn([...clinging, ...clingingGlints]),
    }).toEqual({
      adrift: [hazards, hazards],
      clinging: [clingers, clingers, clingers, clingers],
    });
  });

  it("draw each burr adrift under its glint, and both under the comets and their warnings", async () => {
    const { scene } = await startBoard();
    const { burrs, burrGlints, tails, warnings } = scene.kit.hazards;
    // A layer of the field draws its children by their depths
    // (`keepJoinOrder()`), the burrs' sent to its back.
    const highest = (copies: readonly Copies[]): number =>
      Math.max(
        ...copies.flatMap(({ images }) => images.map((image) => image.depth)),
      );
    const lowest = (copies: Copies | undefined): number =>
      Math.min(...(copies?.images ?? []).map((image) => image.depth));

    expect({
      underGlint: burrs.every(
        (burr, i) => highest([burr]) < lowest(burrGlints[i]),
      ),
      underComets:
        highest([...burrs, ...burrGlints]) <
        Math.min(...[...tails, ...warnings].map((image) => image.depth)),
    }).toEqual({ underGlint: true, underComets: true });
  });
});
