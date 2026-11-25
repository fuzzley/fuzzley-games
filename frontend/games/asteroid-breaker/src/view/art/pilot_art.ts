// The pilots: `@fz/style/fuzzball`'s fuzzball, drawn by `@fz/phaser/fuzzball`
// in white, which the scene tints in each pilot's ink: upright in the pod's
// canopy, its fur lifted by a step of static and leaning from a push, and
// static's sparks about it on end; or adrift in a stray's bubble, or puffed
// in a fright as it bails out. Its eyes are a frame of their own at each
// face, baked looking straight out, which the scene moves the way it
// looks. And the constellation that traces it among the stars.

import {
  FUZZBALL_GRID,
  FUZZBALL_STRANDS,
  aboutBody,
  eyesCommands as eyesOnGrid,
  fuzzballCommands as fuzzballOnGrid,
  staticSparkCommands,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
} from "@fz/phaser/shapes";
import {
  FUZZBALL,
  FUZZBALL_FACES,
  FUZZBALL_LOOK_FAR,
  type FuzzballFace,
  type FuzzballForm,
  type FuzzballPose,
  MOST_LIFT,
  SPARKS_FROM,
  SPARK_LOOK,
  fuzzballForm,
  fuzzballShape,
  lookOffset,
} from "@fz/style/fuzzball";
import { itemAt, recordOf } from "@fz/core/records";
import type { Moving, Place } from "../../rules/torus";
import { STRAY_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { mixTone } from "../colors/tones";
import { PILOT_SIZE, canopyWithin } from "./pod_art";

/** Names where a pilot is drawn: upright in the pod's canopy, or adrift in a bubble, a stray's or a pilot's bailing out. */
export type Seat = "pod" | "adrift";

/** Every seat a pilot is drawn in. */
export const SEATS: readonly Seat[] = ["pod", "adrift"];

/** How much wider a pilot adrift is drawn than its bubble's radius, as the kit's `STRAY_FILL` draws it. */
const STRAY_FILL = 1.55;

/** How wide a pilot is drawn in each seat, across the fuzzball's grid, in field units. */
export const PILOT_SIZES: Readonly<Record<Seat, number>> = {
  pod: PILOT_SIZE,
  adrift: STRAY_FILL * STRAY_RADIUS,
};

/** How far from its middle a pilot adrift's fur may reach, as a share of its bubble's radius, as its bubble holds it. */
const BUBBLE_WITHIN = 0.93;

/**
 * The radius of the bubble a lost pod's pilot bails out in, in field units:
 * the art kit's bubble in tow, larger than the game's, which the line's
 * spacing holds to `crew.ts`' `TOW_RADIUS`, and which the scene draws a
 * stray's bubble and its pilot adrift scaled to.
 */
export const BAIL_OUT_RADIUS = 0.86;

/** The pushes on the pod's pilot's fur its frames are baked leaning from, on the fuzzball's grid: none, half a thrust's, a full thrust's and a dash's. */
export const LEANS: readonly number[] = [0, 0.5, 1, 2];

/** How white a pilot's frames are drawn, so the scene tints them in its ink. */
const WHITE = 0xffffff;

/** The names of a pilot adrift's frames, in white. */
export const ADRIFT_FRAMES = {
  /** Its body and fur, as a stray adrift draws it. */
  fur: "pilot-adrift",
  /** Its body and fur stood out in a fright, as a pilot bailing out draws it. */
  puffed: "pilot-adrift-puffed",
} as const;

// Made once, so finding a frame's name makes nothing.
const FUR_FRAMES: readonly (readonly string[])[] = Array.from(
  { length: MOST_LIFT + 1 },
  (_, lift) =>
    LEANS.map((_, lean) => `pilot-fur-${String(lift)}-${String(lean)}`),
);
const SPARK_FRAMES: readonly {
  readonly halo: string;
  readonly core: string;
}[] = LEANS.map((_, lean) => ({
  halo: `pilot-sparks-halo-${String(lean)}`,
  core: `pilot-sparks-core-${String(lean)}`,
}));
const EYES_FRAMES: Readonly<
  Record<Seat, Readonly<Record<FuzzballFace, string>>>
> = {
  pod: eyesNames("pod"),
  adrift: eyesNames("adrift"),
};

/** Returns the names of a seat's eyes' frames, one for each face. */
function eyesNames(seat: Seat): Readonly<Record<FuzzballFace, string>> {
  return recordOf(FUZZBALL_FACES, (face) => `pilot-eyes-${seat}-${face}`);
}

/**
 * Returns which of the baked pushes a push on the pod's pilot's fur is
 * drawn at, the nearest of `LEANS`.
 */
export function leanStep(push: number): number {
  let nearest = 0;
  for (let step = 1; step < LEANS.length; step++) {
    if (
      Math.abs(itemAt(LEANS, step) - push) <
      Math.abs(itemAt(LEANS, nearest) - push)
    ) {
      nearest = step;
    }
  }
  return nearest;
}

/**
 * Returns the name of the pod's pilot's body and fur's frame, lifted a step
 * of static, from 0 to `MOST_LIFT`, rounded, and leaning from a push, the
 * nearest baked (`leanStep()`), which the scene turns the way it pushes.
 *
 * @throws {RangeError} For a lift that is no number, which has no frame.
 */
export function furFrame(lift: number, push: number): string {
  const step = Math.min(MOST_LIFT, Math.max(0, Math.round(lift)));
  return itemAt(itemAt(FUR_FRAMES, step), leanStep(push));
}

/** How strongly the scene shows static's sparks' halos, each frame as one, beneath their cores. */
export const SPARK_HALO_ALPHA = SPARK_LOOK.haloAlpha;

/** Returns whether static's sparks show about the pod's pilot's fur, lifted a step of static. */
export function isSparking(lift: number): boolean {
  return lift >= SPARKS_FROM;
}

/** Returns the names of the frames of static's sparks about the pod's pilot's fur on end, leaning from a push: their halos and their cores. */
export function sparksFrames(push: number): {
  readonly halo: string;
  readonly core: string;
} {
  return itemAt(SPARK_FRAMES, leanStep(push));
}

/** Returns the name of the frame of a pilot's eyes in a seat at a face. */
export function eyesFrame(seat: Seat, face: FuzzballFace): string {
  return EYES_FRAMES[seat][face];
}

/**
 * Writes how far a pilot's eyes move from its middle for a look into a
 * record and returns it, in field units, by the pilot's size in a seat.
 */
export function eyesShift(look: Place, seat: Seat, into: Moving): Moving {
  const offset = lookOffset(look, FUZZBALL_LOOK_FAR);
  const by = PILOT_SIZES[seat] / FUZZBALL_GRID;
  into.x = offset.x * by;
  into.y = offset.y * by;
  return into;
}

/**
 * Returns the form the pod's pilot is drawn in at a scale, by its size in
 * CSS pixels: its own, or its small form, smaller still on the smallest
 * fields, which has no sparks.
 */
export function podPilotForm(scale: ArtScale): FuzzballForm {
  return fuzzballForm((PILOT_SIZES.pod * scale.unit) / scale.pixelRatio);
}

/**
 * Returns the color static's sparks' cores are drawn in about a pilot of an
 * ink, as `SPARK_LOOK` mixes it: toward the field's text in a light
 * palette, toward white in a dark one.
 */
export function sparkCore(ink: number, palette: BeltPalette): number {
  return palette.mode === "light"
    ? mixTone(ink, palette.shot, SPARK_LOOK.coreMix.light)
    : mixTone(ink, 0xffffff, SPARK_LOOK.coreMix.dark);
}

/**
 * Writes the way a pilot at a place looks into a record and returns it, a
 * share along each axis: straight at what it watches, the pod, or along its
 * heading where it watches nothing or what it watches is right there.
 */
export function lookingFrom(
  x: number,
  y: number,
  watched: Place | null,
  heading: number,
  into: Moving,
): Moving {
  const dx = watched ? watched.x - x : 0;
  const dy = watched ? watched.y - y : 0;
  const far = Math.hypot(dx, dy);
  into.x = far > 0 ? dx / far : Math.cos(heading);
  into.y = far > 0 ? dy / far : Math.sin(heading);
  return into;
}

/**
 * Where the constellation's specks lie, the tips of every other one of the
 * fuzzball's strands, and its eyes' two, as shares of its size from its
 * body's middle.
 */
export const CONSTELLATION: {
  readonly specks: readonly Point[];
  readonly eyes: readonly Point[];
} = {
  specks: FUZZBALL_STRANDS.filter((_, i) => i % 2 === 0).map(({ to }) =>
    asShare(to),
  ),
  eyes: FUZZBALL.eyes.map((eye) =>
    asShare(aboutBody({ x: eye.cx, y: eye.cy })),
  ),
};

/** Returns a point about the fuzzball's body's middle, on its grid, as a share of its size. */
function asShare(point: Point): Point {
  return { x: point.x / FUZZBALL_GRID, y: point.y / FUZZBALL_GRID };
}

/** Returns the fuzzball's body and fur about its body's middle, a size across its grid, in a color. */
export function fuzzballCommands(
  size: number,
  color: number,
): readonly DrawCommand[] {
  return fuzzballOnGrid(size / FUZZBALL_GRID, { color });
}

/** Returns the fuzzball's eyes about its body's middle, a size across its grid, with their glints where each is large enough to see. */
export function eyesCommands(
  size: number,
  palette: BeltPalette,
): readonly DrawCommand[] {
  return eyesOnGrid(size / FUZZBALL_GRID, {
    color: palette.eyes,
    glint: palette.glint,
  });
}

/** Returns a posed fuzzball's body and fur about its body's middle, a size across its grid, in white. */
function posedFur(size: number, pose: FuzzballPose): readonly DrawCommand[] {
  const { fur, furWidth } = fuzzballShape(pose);
  return fuzzballOnGrid(size / FUZZBALL_GRID, { color: WHITE, fur, furWidth });
}

/**
 * Returns a seat's eyes' frames, one at each face, looking straight out, in
 * the form its size takes at a scale, with their glints only where the
 * field keeps its fine marks.
 */
function eyesFrames(
  seat: Seat,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  const size = PILOT_SIZES[seat] * scale.unit;
  const form = fuzzballForm(size / scale.pixelRatio);
  const style = fine
    ? { color: palette.eyes, glint: palette.glint }
    : { color: palette.eyes };
  return FUZZBALL_FACES.map((face) =>
    centered(
      eyesFrame(seat, face),
      eyesOnGrid(size / FUZZBALL_GRID, style, {
        face,
        look: { x: 0, y: 0 },
        range: FUZZBALL_LOOK_FAR,
        ...form,
      }),
    ),
  );
}

/**
 * Returns the pod's pilot's frames, in white: its body and fur at each step
 * of static and each baked push, leaning along x, held inside the canopy,
 * and static's sparks at its last step, halos and cores apart, none in its
 * small form.
 */
function podPilotFrames(scale: ArtScale, fine: boolean): readonly ArtFrame[] {
  const size = PILOT_SIZES.pod * scale.unit;
  const form = podPilotForm(scale);
  const within = canopyWithin(scale, fine);
  const pose = (lift: number, lean: number): FuzzballPose => ({
    lift,
    lean: { x: lean, y: 0 },
    within,
    ...form,
  });
  const fur = FUR_FRAMES.flatMap((names, lift) =>
    names.map((name, lean) =>
      centered(name, posedFur(size, pose(lift, itemAt(LEANS, lean)))),
    ),
  );
  const sparks = SPARK_FRAMES.flatMap(({ halo, core }, lean) => {
    const drawn = staticSparkCommands(
      size / FUZZBALL_GRID,
      fuzzballShape(pose(MOST_LIFT, itemAt(LEANS, lean))).sparks,
      { core: WHITE, halo: WHITE, pixelRatio: scale.pixelRatio },
    );
    return [centered(halo, drawn.halos), centered(core, drawn.cores)];
  });
  return [...fur, ...sparks];
}

/** Returns a pilot adrift's frames, in white: its body and fur as it drifts, and stood out in a fright, each held inside its bubble. */
function adriftFrames(scale: ArtScale): readonly ArtFrame[] {
  const size = PILOT_SIZES.adrift * scale.unit;
  const form = fuzzballForm(size / scale.pixelRatio);
  const within =
    (BUBBLE_WITHIN * STRAY_RADIUS) / (PILOT_SIZES.adrift / FUZZBALL_GRID);
  return [
    centered(ADRIFT_FRAMES.fur, posedFur(size, { within, ...form })),
    centered(
      ADRIFT_FRAMES.puffed,
      posedFur(size, { puff: 1, within, ...form }),
    ),
  ];
}

/**
 * Returns every pilot's frames at a scale: the pod's pilot's and a pilot
 * adrift's, white, and their eyes at each face, in a palette, with their
 * glints only where the field keeps its fine marks.
 */
export function pilotFrames(
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): readonly ArtFrame[] {
  return [
    ...podPilotFrames(scale, fine),
    ...adriftFrames(scale),
    ...SEATS.flatMap((seat) => eyesFrames(seat, palette, scale, fine)),
  ];
}
