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
} from "../../testing/belt_board";
import { placeComet } from "../../testing/field_picture";
import {
  COMET_FRAMES,
  DASH_RUN,
  LANE,
  LANE_DASH_ALPHA,
  TAIL_BEHIND,
  laneWashAlpha,
  warningFrame,
} from "../../view/art/things";

/** Returns a number rounded to nine places, as a spec compares one worked out two ways. */
function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
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
