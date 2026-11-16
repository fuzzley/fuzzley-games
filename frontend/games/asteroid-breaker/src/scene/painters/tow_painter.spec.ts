import type { Field } from "../../rules/field/field";
import type { Loose } from "../../rules/hazards/loose";
import { layTow } from "../../rules/ship/tow";
import type { TowLink } from "../../rules/ship/tow";
import { stepsIn } from "../../rules/stepper";
import {
  LOOSE_LIFE_MS,
  STRAY_RADIUS,
  TOW_HOOK,
  TOW_LINK,
} from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import {
  type FakeShell,
  isShown,
  linesOf,
  metricsOf,
  onCanvas,
  overASecond,
  shown,
  startBoard,
  stillness,
  withShip,
  zoomOf,
} from "../../testing/belt_board";
import { placeLoose, shipOf } from "../../testing/field_picture";
import { STRAY_DROP } from "../../view/art/art";
import { LOOSE_BLINK_MS, TOW_RADIUS } from "../../view/art/crew";
import { FACE_MS } from "../../view/art/faces";
import { ADRIFT_FRAMES, eyesFrame, eyesShift } from "../../view/art/pilot_art";
import { towLineWidth } from "../../view/field/tow_line";
import type { Copies } from "./copies";
import type { Bubbled } from "./tow_painter";

/** How much smaller a bubble in tow is drawn than a stray's. */
const IN_TOW = TOW_RADIUS / STRAY_RADIUS;

/** Sets a shell up with the pod flying, its two in tow below it, for a player who prefers less motion. */
function towing(shell: FakeShell): void {
  withShip(shell);
  stillness(shell);
}

/** Returns a field's link of the line in tow at a place in it, failing the spec if it has none. */
function linkOf(field: Field, link: number): TowLink {
  const at = field.tow[link];
  if (!at) throw new Error(`The field has no link ${String(link)}.`);
  return at;
}

/** Returns one of a painter's bubbles, failing the spec if it has none there. */
function bubbleOf(bubbles: readonly Bubbled[], slot: number): Bubbled {
  const bubbled = bubbles[slot];
  if (!bubbled) throw new Error(`The painter has no bubble ${String(slot)}.`);
  return bubbled;
}

/** Returns one of the crew knocked loose on a field, a pilot in a color at a place, knocked loose a number of steps ago. */
function looseOn(field: Field, x: number, y: number, stepsAgo: number): Loose {
  const loose = placeLoose(field, x, y, 6);
  loose.knockedAt = field.steps - stepsAgo;
  return loose;
}

/** Returns a number to three places, so places worked out two ways agree. */
function round(value: number): number {
  return Number(value.toFixed(3));
}

/** Returns what a spec reads of a bubble: where its parts show, at what scale, its fur, its ink and its face. */
function drawnOf(bubbled: Bubbled): {
  readonly bubble: { readonly x: number; readonly y: number } | null;
  readonly pilot: { readonly x: number; readonly y: number } | null;
  readonly eyes: { readonly x: number; readonly y: number } | null;
  readonly scale: number | undefined;
  readonly fur: string | undefined;
  readonly ink: number | undefined;
  readonly face: string | undefined;
} {
  const [bubble, pilot, eyes] = [bubbled.bubble, bubbled.pilot, bubbled.eyes]
    .map((copies) => shown(copies)[0] ?? null)
    .map((at) => (at ? { x: round(at.x), y: round(at.y) } : null));
  const image = bubbled.pilot.images[0];
  return {
    bubble: bubble ?? null,
    pilot: pilot ?? null,
    eyes: eyes ?? null,
    scale: bubbled.bubble.images[0]?.scaleX,
    fur: image?.frame.name,
    ink: image?.tintTopLeft,
    face: bubbled.eyes.images[0]?.frame.name,
  };
}

/** Returns where each copy of a part shows on the canvas, to three places, or null where it doesn't. */
function copiesOf(
  copies: Copies,
): readonly ({ readonly x: number; readonly y: number } | null)[] {
  return shown(copies).map((at) =>
    at ? { x: round(at.x), y: round(at.y) } : null,
  );
}

/** Returns where a place on the field lies on the canvas, to three places. */
function canvasAt(
  shell: FakeShell,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const at = onCanvas(metricsOf(shell), x, y);
  return { x: round(at.x), y: round(at.y) };
}

describe("the line in tow", () => {
  it("runs from the hook behind the pod through each in tow, in the color of the bubbles' rims", async () => {
    const { shell, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);

    const lines = linesOf(scene.kit.tow.line).map((line) => ({
      ...line,
      fromX: round(line.fromX),
      fromY: round(line.fromY),
      toX: round(line.toX),
      toY: round(line.toY),
    }));

    const stretch = (from: number, to: number) => {
      const start = canvasAt(shell, ship.x, ship.y + from);
      const end = canvasAt(shell, ship.x, ship.y + to);
      return {
        fromX: start.x,
        fromY: start.y,
        toX: end.x,
        toY: end.y,
        width: towLineWidth(metricsOf(shell)),
        color: ART_PALETTE.rim,
        alpha: 1,
      };
    };
    expect(lines).toEqual([
      stretch(TOW_HOOK, TOW_HOOK + TOW_LINK),
      stretch(TOW_HOOK + TOW_LINK, TOW_HOOK + 2 * TOW_LINK),
    ]);
  });

  it("is strung again past the edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);
    ship.y = 38;
    ship.lastY = 38;
    layTow(shell.field);

    run.advance(16);

    const { unit } = metricsOf(shell);
    const [first, second, third, fourth] = linesOf(scene.kit.tow.line);
    expect([
      linesOf(scene.kit.tow.line).length,
      round((third?.fromY ?? 0) - (first?.fromY ?? 0)),
      round((fourth?.toY ?? 0) - (second?.toY ?? 0)),
    ]).toEqual([4, round(-40 * unit), round(-40 * unit)]);
  });

  it("is strung again past both edges at a corner, and at the corner itself", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const heading = -Math.PI / 4;
    Object.assign(shipOf(shell.field), {
      ...{ x: 1, lastX: 1, y: 38, lastY: 38 },
      ...{ angle: heading, lastAngle: heading },
    });
    layTow(shell.field);

    run.advance(16);

    const { unit } = metricsOf(shell);
    const lines = linesOf(scene.kit.tow.line);
    const [first] = lines;
    // Each copy strokes the line's two stretches, so each starts two lines on.
    const copies = [0, 2, 4, 6].map((index) => ({
      x: round((lines[index]?.fromX ?? 0) - (first?.fromX ?? 0)),
      y: round((lines[index]?.fromY ?? 0) - (first?.fromY ?? 0)),
    }));
    expect({ count: lines.length, copies }).toEqual({
      count: 8,
      copies: [
        { x: 0, y: 0 },
        { x: round(72 * unit), y: 0 },
        { x: 0, y: round(-40 * unit) },
        { x: round(72 * unit), y: round(-40 * unit) },
      ],
    });
  });

  it("is drawn nowhere with no pod", async () => {
    const { shell, run, scene } = await startBoard(towing);
    shell.field.ship = null;

    run.advance(16);

    expect(linesOf(scene.kit.tow.line)).toEqual([]);
  });

  it("is drawn nowhere with no one in tow", async () => {
    const { shell, run, scene } = await startBoard(towing);
    shell.field.crew = { ...shell.field.crew, tow: [] };

    run.advance(16);

    expect(linesOf(scene.kit.tow.line)).toEqual([]);
  });
});

describe("the crew in tow", () => {
  it("draws each in tow in its bubble, smaller than a stray's, its pilot low in it in its ink, looking at the one ahead", async () => {
    const { shell, scene } = await startBoard(towing);
    const at = linkOf(shell.field, 1);

    const sits = at.y + STRAY_DROP * TOW_RADIUS;
    const shift = eyesShift({ x: 0, y: -1 }, "adrift", { x: 0, y: 0 });
    expect(drawnOf(bubbleOf(scene.kit.tow.inTow, 1))).toEqual({
      bubble: canvasAt(shell, at.x, at.y),
      pilot: canvasAt(shell, at.x, sits),
      eyes: canvasAt(shell, at.x + shift.x * IN_TOW, sits + shift.y * IN_TOW),
      scale: zoomOf(shell) * IN_TOW,
      fur: ADRIFT_FRAMES.fur,
      ink: ART_PALETTE.pilots[2],
      face: eyesFrame("adrift", "rest"),
    });
  });

  it("draws each in tow between where it was a step ago and where it is", async () => {
    const { shell, run, scene } = await startBoard((each) => {
      towing(each);
      each.alpha = 0.5;
    });
    const at = linkOf(shell.field, 0);
    at.lastX = at.x - 1;

    run.advance(16);

    expect(shown(bubbleOf(scene.kit.tow.inTow, 0).bubble)[0]).toEqual(
      onCanvas(metricsOf(shell), at.x - 0.5, at.y),
    );
  });

  it("draws a bubble again past the edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);
    ship.y = 38;
    ship.lastY = 38;
    layTow(shell.field);

    run.advance(16);

    const at = linkOf(shell.field, 0);
    expect(copiesOf(bubbleOf(scene.kit.tow.inTow, 0).bubble)).toEqual([
      canvasAt(shell, at.x, at.y),
      null,
      canvasAt(shell, at.x, at.y + 40),
      null,
    ]);
  });

  it("hides each place no one rides", async () => {
    const { scene } = await startBoard(towing);

    const riding = scene.kit.tow.inTow.map(({ bubble }) => isShown(bubble));

    expect(riding).toEqual([true, true, false, false, false]);
  });

  it("draws no one in tow with no pod", async () => {
    const { shell, run, scene } = await startBoard(towing);
    shell.field.ship = null;

    run.advance(16);

    expect(scene.kit.tow.inTow.map(({ bubble }) => isShown(bubble))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("shows each in tow eeping as one is knocked loose", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);
    shell.field.events.addKnocked(ship.x, ship.y, 2, shell.field.crew, 1, 0);

    run.advance(16);

    expect(bubbleOf(scene.kit.tow.inTow, 0).eyes.images[0]?.frame.name).toBe(
      eyesFrame("adrift", "eep"),
    );
  });

  it("forgets the last field's knock as a new field starts", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);
    shell.field.events.addKnocked(ship.x, ship.y, 2, shell.field.crew, 1, 0);
    run.advance(16);

    towing(shell);
    run.advance(16);

    expect(bubbleOf(scene.kit.tow.inTow, 0).eyes.images[0]?.frame.name).toBe(
      eyesFrame("adrift", "rest"),
    );
  });

  it("bobs each pilot in its bubble where motion is welcome", async () => {
    const { run, scene } = await startBoard(withShip);
    const { bubble, pilot } = bubbleOf(scene.kit.tow.inTow, 0);

    const seen = {
      bubble: overASecond(run, () => bubble.images[0]?.y).size,
      pilot: overASecond(run, () => pilot.images[0]?.y).size,
    };

    expect(seen.bubble).toBe(1);
    expect(seen.pilot).toBeGreaterThan(1);
  });
});

describe("the crew knocked loose", () => {
  it("draws one just knocked loose at a bubble in tow's size, puffed and wide eyed, looking at the pod", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const ship = shipOf(shell.field);
    looseOn(shell.field, ship.x, ship.y + 10, 0);

    run.advance(16);

    const sits = ship.y + 10 + STRAY_DROP * TOW_RADIUS;
    const shift = eyesShift({ x: 0, y: -1 }, "adrift", { x: 0, y: 0 });
    expect(drawnOf(bubbleOf(scene.kit.tow.loose, 0))).toEqual({
      bubble: canvasAt(shell, ship.x, ship.y + 10),
      pilot: canvasAt(shell, ship.x, sits),
      eyes: canvasAt(shell, ship.x + shift.x * IN_TOW, sits + shift.y * IN_TOW),
      scale: zoomOf(shell) * IN_TOW,
      fur: ADRIFT_FRAMES.puffed,
      ink: ART_PALETTE.pilots[6],
      face: eyesFrame("adrift", "eep"),
    });
  });

  it("draws one swelled to a stray's size, over its fright, its fur settled, pleading", async () => {
    const { shell, run, scene } = await startBoard(towing);
    looseOn(shell.field, 30, 30, stepsIn(FACE_MS.eep));

    run.advance(16);

    const drawn = drawnOf(bubbleOf(scene.kit.tow.loose, 0));
    expect([drawn.scale, drawn.fur, drawn.face]).toEqual([
      zoomOf(shell),
      ADRIFT_FRAMES.fur,
      eyesFrame("adrift", "plead"),
    ]);
  });

  it("draws one again past the edge it reaches across", async () => {
    const { shell, run, scene } = await startBoard(towing);
    placeLoose(shell.field, 0.5, 20);

    run.advance(16);

    expect(copiesOf(bubbleOf(scene.kit.tow.loose, 0).bubble)).toEqual([
      canvasAt(shell, 0.5, 20),
      canvasAt(shell, 72.5, 20),
      null,
      null,
    ]);
  });

  it("bobs on as it is knocked loose, each pilot's bob its own", async () => {
    const { shell, run, scene } = await startBoard(withShip);
    const loose = placeLoose(shell.field, 30, 30, 2);
    loose.knockedAt = shell.field.steps;

    run.advance(16);

    // The pilot riding second in tow, and the same pilot knocked loose, a
    // bubble in tow's size, drawn on the same frame.
    const [inTow, knocked] = [
      bubbleOf(scene.kit.tow.inTow, 1),
      bubbleOf(scene.kit.tow.loose, 0),
    ].map(
      ({ pilot, bubble }) =>
        (pilot.images[0]?.y ?? Number.NaN) - (bubble.images[0]?.y ?? 0),
    );
    expect(round(knocked ?? 0)).toBe(round(inTow ?? Number.NaN));
  });

  it("blinks one through its last seconds before it floats home, where motion isn't welcome too", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const lives = stepsIn(LOOSE_LIFE_MS) - stepsIn(LOOSE_BLINK_MS);
    looseOn(shell.field, 30, 30, lives);
    const { bubble } = bubbleOf(scene.kit.tow.loose, 0);

    const seen = overASecond(run, () => isShown(bubble));

    expect(seen).toEqual(new Set([true, false]));
  });

  it("shows one steadily before its last seconds", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const lives = stepsIn(LOOSE_LIFE_MS) - stepsIn(LOOSE_BLINK_MS);
    looseOn(shell.field, 30, 30, lives - 1);
    const { bubble } = bubbleOf(scene.kit.tow.loose, 0);

    const seen = overASecond(run, () => isShown(bubble));

    expect(seen).toEqual(new Set([true]));
  });

  it("draws nothing for a slot out of play", async () => {
    const { shell, run, scene } = await startBoard(towing);
    const loose = placeLoose(shell.field, 30, 30);
    run.advance(16);
    loose.live = false;

    run.advance(16);

    expect(scene.kit.tow.loose.map(({ bubble }) => isShown(bubble))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
