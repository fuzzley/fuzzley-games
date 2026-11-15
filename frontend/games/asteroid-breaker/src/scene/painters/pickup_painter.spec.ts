import { stepsIn } from "../../rules/stepper";
import { PICKUP_BLINK_MS } from "../../rules/tuning";
import {
  isShown,
  metricsOf,
  onCanvas,
  overASecond,
  shown,
  startBoard,
  stillness,
  zoomOf,
} from "../../testing/belt_board";
import { placePickup } from "../../testing/field_picture";
import {
  ORB_DIM,
  type OrbLook,
  PICKUP_REACH,
  orbLook,
  pickupFrame,
  restingLook,
} from "../../view/art/things";
import { GOLDEN_ANGLE } from "../../view/effects/flourish";

/** How much larger than its frame an orb shows breathed fully in, as the kit swells it. */
const SWELL = 0.07;

/** Returns how an orb in a slot shows at a time, in milliseconds, where motion is welcome and it doesn't blink. */
function lookAt(now: number, slot: number): OrbLook {
  return orbLook(false, now / 1000, slot * GOLDEN_ANGLE, true, restingLook());
}

/**
 * Returns the time of the first frame, a frame of 16 ms at a time on from a
 * time, at which a pickup in a slot has swollen past half its breath.
 */
function swollen(now: number, slot: number): number {
  let at = now + 16;
  while (lookAt(at, slot).scale < 1 + SWELL / 2) at += 16;
  return at;
}

describe("the pickups", () => {
  it("draw a pickup floating where it is, in its frame, at its size and opaque, still where motion isn't welcome", async () => {
    const { shell, run, scene } = await startBoard(stillness);
    const floating = placePickup(shell.field, "magnet", 30, 20);

    run.advance(16);

    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];
    expect([
      shown(copies),
      copies?.images[0]?.frame.name,
      copies?.images[0]?.scale,
      copies?.images[0]?.alpha,
    ]).toEqual([
      [onCanvas(metricsOf(shell), 30, 20), null, null, null],
      pickupFrame("magnet"),
      zoomOf(shell),
      1,
    ]);
  });

  it("draw a pickup between its last place and its next, on both sides of an edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      each.alpha = 0.5;
    });
    const floating = placePickup(shell.field, "spread", 0.5, 20);
    floating.lastX = 1;

    run.advance(16);

    const metrics = metricsOf(shell);
    const { width } = shell.field.torus;
    expect(
      shown(scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)]),
    ).toEqual([
      onCanvas(metrics, 0.75, 20),
      onCanvas(metrics, 0.75 + width, 20),
      null,
      null,
    ]);
  });

  it("draw a pickup swollen as it breathes in, as large as its look says", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    const slot = shell.field.pickups.indexOf(floating);
    const at = swollen(scene.time.now, slot);

    run.advance(at - scene.time.now);

    expect(scene.kit.pickups.pickups[slot]?.images[0]?.scale).toBeCloseTo(
      zoomOf(shell) * lookAt(at, slot).scale,
      9,
    );
  });

  it("draw a pickup swollen on both sides of an edge it reaches across only as it swells", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    const slot = shell.field.pickups.indexOf(floating);
    const at = swollen(scene.time.now, slot);
    // Halfway between its reach at rest and its reach as it swells.
    const x = (PICKUP_REACH * (1 + lookAt(at, slot).scale)) / 2;
    floating.x = x;
    floating.lastX = x;

    run.advance(at - scene.time.now);

    const metrics = metricsOf(shell);
    expect(shown(scene.kit.pickups.pickups[slot])).toEqual([
      onCanvas(metrics, x, 20),
      onCanvas(metrics, x + shell.field.torus.width, 20),
      null,
      null,
    ]);
  });

  it("breathe where motion is welcome, each a phase apart from the next", async () => {
    const { shell, run, scene } = await startBoard();
    placePickup(shell.field, "spread", 20, 20);
    placePickup(shell.field, "magnet", 40, 20);

    run.advance(16);

    const [first, second] = scene.kit.pickups.pickups.map(
      (copies) => copies.images[0]?.scale,
    );
    expect(first).not.toBe(second);
  });

  it("blink dim through their last seconds, never hidden", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    floating.lifeSteps = stepsIn(PICKUP_BLINK_MS);
    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];

    const seen = overASecond(run, () =>
      isShown(copies) ? copies?.images[0]?.alpha : 0,
    );

    expect(seen).toEqual(new Set([1, ORB_DIM]));
  });

  it("show steadily before their last seconds", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    floating.lifeSteps = stepsIn(PICKUP_BLINK_MS) + 1;
    const copies =
      scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)];

    const seen = overASecond(run, () =>
      isShown(copies) ? copies?.images[0]?.alpha : 0,
    );

    expect(seen).toEqual(new Set([1]));
  });

  it("draw nothing for a record out of play", async () => {
    const { shell, run, scene } = await startBoard();
    const floating = placePickup(shell.field, "spread", 30, 20);
    run.advance(16);
    floating.live = false;

    run.advance(16);

    expect(
      shown(scene.kit.pickups.pickups[shell.field.pickups.indexOf(floating)]),
    ).toEqual([null, null, null, null]);
  });
});
