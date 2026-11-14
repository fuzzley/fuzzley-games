// The field of a mock: a moment of play written as plain data, in field
// units, and the staging that draws it with the art kit's pieces (../../art),
// back to front in the game's own order of layers. Nothing here is the
// game's code. A mock is a picture of the plan (../../plan.md), so a thing
// lies where its moment's description puts it and nothing is simulated.

import {
  TURN,
  mix,
  num,
  path,
  place,
  polar,
  polygon,
  polyline,
  rect,
  ring,
  seeded,
  text,
  turned,
} from "../../art/lib/core.mjs";
import {
  backdropDefs,
  backdropSvg,
  fieldSvg,
} from "../../art/lib/backdrop.mjs";
import {
  arcSvg,
  blastFx,
  breakFx,
  energyOf,
  exhaustFx,
  flaringSvg,
  glow,
  glowDefs,
  impactFx,
  makeArc,
  muzzleFlashSvg,
  rimPoint,
  shotSvg,
  spark,
} from "../../art/lib/fx.mjs";
import { PILOT_INKS, ROCK_INKS } from "../../art/lib/palettes.mjs";
import { makeRock, rockDefs, rockSvg } from "../../art/lib/rocks.mjs";
import { PODS, podDefs, podSvg, podTones } from "../../art/lib/ship.mjs";
import {
  TOW_RADIUS,
  straySvg,
  towLine,
  towSvg,
} from "../../art/lib/strays.mjs";
import {
  burrSvg,
  cometSvg,
  makeBurr,
  makeComet,
  moteDrawnSvg,
  motePath,
  moteSvg,
  orbSvg,
  warningSvg,
} from "../../art/lib/things.mjs";

/** @import { Point } from "../../art/lib/core.mjs" */
/** @import { Sector } from "../../art/lib/backdrop.mjs" */
/** @import { WeaponId } from "../../art/lib/fx.mjs" */
/** @import { Face } from "../../art/lib/fuzzball.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */
/** @import { Lamp, RockKind, RockShape, RockSize } from "../../art/lib/rocks.mjs" */
/** @import { PodVariant } from "../../art/lib/ship.mjs" */
/** @import { PickupId } from "../../art/lib/things.mjs" */

/**
 * @typedef {object} RockThing A rock adrift.
 * @property {RockKind} kind
 * @property {RockSize} size
 * @property {number} seed
 * @property {Point} at
 * @property {number} [turn] In radians.
 * @property {number} [hits] The hits it has held, each a crack.
 * @property {number} [struck] How brightly it flashes as it is struck, 0 to 1.
 * @property {number} [flare] How far a volatile rock's seams have flared, 0 to 1.
 */

/**
 * @typedef {object} BreakThing A rock breaking.
 * @property {RockKind} kind
 * @property {RockSize} size
 * @property {number} seed
 * @property {Point} at
 * @property {number} t How long ago it broke, in milliseconds.
 * @property {number} [turn]
 * @property {number} [from] The way the shot that broke it flew, in radians.
 * @property {number[]} [headings] The ways its pieces go.
 */

/**
 * @typedef {object} BlastThing A volatile rock's blast.
 * @property {"large" | "medium"} size
 * @property {number} seed
 * @property {Point} at
 * @property {number} t How long ago its seams began to flare, in milliseconds.
 * @property {number} [turn]
 */

/**
 * @typedef {object} PodThing The pod, and what is drawn on it.
 * @property {Point} at
 * @property {number} turn Its heading, in radians.
 * @property {PodVariant} [variant]
 * @property {number} [pilot] Which of the eight pilots flies it.
 * @property {Face} [face]
 * @property {Point} [look]
 * @property {number} [charge] The pilot's fur, 0 to 3: static's four steps.
 * @property {number} [thrust] From 0 to 1.
 * @property {boolean} [trail] Whether its engines leave exhaust behind them.
 * @property {boolean} [dash]
 * @property {number} [guard] How brightly the ring of a pod that can't be touched shows.
 * @property {boolean} [shield]
 * @property {number} [static] How far the canopy's ring has filled with static, 0 to 1.
 * @property {number} [recharge] How far the dash has charged again, 0 to 1.
 * @property {boolean} [ready] Whether the dash's arc pulses, as it does once when it is ready.
 * @property {number} [weapon] How much of a weapon's time is left, 0 to 1; none if left out.
 * @property {0 | 1} [muzzle] The frame of the flash at its prow, if a shot has just left.
 * @property {boolean} [struck] Whether it has just been hit: it flashes, and a spark flies from where it was struck.
 * @property {number} [struckFrom] The way to what hit it, in radians.
 */

/**
 * @typedef {object} TowThing The crew in tow behind the pod.
 * @property {number[]} pilots Who rides, the nearest the pod first.
 * @property {number} [heading] The way the line was flown, in radians; it trails the other way. The pod's own unless told.
 * @property {number} [sway]
 * @property {number} [phase]
 * @property {number} [gap]
 * @property {number} [loose] How many of the last have been knocked loose.
 * @property {number} [flung] How far those knocked loose have flown since, in field units.
 */

/**
 * @typedef {object} StrayThing A stray fuzzball adrift in its bubble.
 * @property {Point} at
 * @property {number} pilot
 * @property {Face} [face]
 * @property {number} [bob]
 * @property {Point} [look]
 */

/** @typedef {{ id: PickupId, at: Point, breath?: number }} OrbThing */

/**
 * @typedef {object} SparkThing A spark: hanging where it was shed, or on its way in to the pod.
 * @property {Point} at Where it hangs, or where it was drawn from.
 * @property {0 | 1 | 2} [size]
 * @property {number} [turn]
 * @property {number} [opacity]
 * @property {number} [drawn] How far along its way to the pod it is, 0 to 1; it hangs unless given.
 * @property {number} [bend] How far its way swings to one side.
 * @property {boolean} [over] Whether it is drawn over the effects, as one a breaking rock is shedding.
 */

/** @typedef {{ weapon?: WeaponId, at: Point, turn: number }} ShotThing */

/**
 * @typedef {object} ArcThing An arc of the zap, from the pod to a rock.
 * @property {number} to The rock it strikes, by its place in the moment's rocks; -1 for the blast.
 * @property {number} seed
 * @property {number} [strength]
 */

/** @typedef {{ at: Point, turn: number, seed?: number }} CometThing */

/**
 * @typedef {object} WarningThing A comet's warning on the field's edge.
 * @property {Point} at The point on the edge it will come in by.
 * @property {number} turn The way it will fly, in radians.
 * @property {0 | 1 | 2 | "still"} [frame]
 * @property {number} lane How long its lane is, in field units.
 */

/**
 * @typedef {object} BurrThing
 * @property {Point} at
 * @property {number} [turn]
 * @property {number} [seed]
 * @property {number} [scale]
 * @property {number} [opacity]
 * @property {number} [flung] The way it was flung from the pod, in radians, if it was just shaken off.
 */

/**
 * @typedef {object} LabelThing Points scored, written on the field.
 * @property {Point} at
 * @property {string} words
 * @property {string} [times] The multiplier, written small after them.
 * @property {number} [opacity]
 */

/**
 * @typedef {object} Moment A moment of play.
 * @property {Palette} palette
 * @property {Sector} sector
 * @property {number} width The field's, in field units.
 * @property {number} height
 * @property {number} unit The pixels a field unit takes.
 * @property {number} [seed] What the backdrop's stars are strewn from.
 * @property {RockThing[]} [rocks]
 * @property {BreakThing[]} [breaks]
 * @property {BlastThing[]} [blasts]
 * @property {PodThing} [pod]
 * @property {TowThing} [tow]
 * @property {StrayThing[]} [strays]
 * @property {OrbThing[]} [orbs]
 * @property {SparkThing[]} [sparks]
 * @property {ShotThing[]} [shots]
 * @property {ArcThing[]} [arcs]
 * @property {CometThing} [comet]
 * @property {WarningThing} [warning]
 * @property {BurrThing[]} [burrs]
 * @property {LabelThing[]} [labels]
 * @property {number} [dim] How far the field is dimmed under a card, 0 to 1.
 */

/** @typedef {{ at: Point, color: string, strength: number, reach: number }} Light A light on the field, in field units. */

/** How wide the field's frame is, in CSS pixels, as the game has it. */
export const FRAME_PX = 2;

/** How far out the arc that counts a weapon's time down lies, in field units. */
export const WEAPON_ARC = 1.5;

/** How far out the arc that shows the dash charging again lies, and half its sweep, in radians. */
export const DASH_ARC = { radius: 1.22, half: 0.62 };

/** How far from the pod's middle a zap's arcs leap from, in field units: its hull's edge. */
const ARC_FROM = 1.2;

/** The numbers' face, for points on the field and figures in the bar. */
export const MONO = "ui-monospace, 'Cascadia Mono', Consolas, monospace";

/**
 * Returns the shifts a thing is drawn at: none, and one for each edge it
 * reaches past, so that its other part shows at the far side.
 *
 * @param {Point} at
 * @param {number} reach
 * @param {{ width: number, height: number }} field
 * @returns {Point[]}
 */
export function copyShifts([x, y], reach, { width, height }) {
  const across = [0];
  if (x - reach < 0) across.push(width);
  if (x + reach > width) across.push(-width);
  const down = [0];
  if (y - reach < 0) down.push(height);
  if (y + reach > height) down.push(-height);
  return across.flatMap((dx) =>
    down.map((dy) => /** @type {Point} */ ([dx, dy])),
  );
}

/**
 * Returns the short way from one place to another across the field's edges.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {{ width: number, height: number }} field
 * @returns {Point}
 */
export function across(from, to, { width, height }) {
  let dx = to[0] - from[0];
  let dy = to[1] - from[1];
  if (dx > width / 2) dx -= width;
  if (dx < -width / 2) dx += width;
  if (dy > height / 2) dy -= height;
  if (dy < -height / 2) dy += height;
  return [dx, dy];
}

/**
 * Returns a drawing made about a thing's middle, placed on the field, and
 * again past each edge the thing reaches across.
 *
 * @param {string} inner
 * @param {Point} at
 * @param {number} reach
 * @param {Moment} moment
 * @param {{ turn?: number, opacity?: number }} [how] A turn in degrees.
 * @returns {string}
 */
function wrapped(inner, at, reach, moment, how = {}) {
  if (!inner) return "";
  return copyShifts(at, reach, moment)
    .map(([dx, dy]) =>
      place(inner, {
        x: (at[0] + dx) * moment.unit,
        y: (at[1] + dy) * moment.unit,
        ...how,
      }),
    )
    .join("");
}

/**
 * Returns the lights of a moment, which the rocks near them take: each
 * blast, the pod while it zaps, and the comet.
 *
 * @param {Moment} moment
 * @returns {Light[]}
 */
function lightsOf(moment) {
  const { palette } = moment;
  const inks = ROCK_INKS[palette.mode];
  /** @type {Light[]} */
  const lights = [];
  for (const blast of moment.blasts ?? []) {
    lights.push({
      at: blast.at,
      color:
        palette.mode === "light"
          ? mix(inks.core, inks.volatile, 0.35)
          : inks.core,
      strength: 0.95,
      reach: blast.size === "large" ? 13 : 9,
    });
  }
  if (moment.pod && (moment.arcs?.length ?? 0) > 0) {
    lights.push({
      at: moment.pod.at,
      color: mix(
        palette.accent,
        "#ffffff",
        palette.mode === "light" ? 0.5 : 0.35,
      ),
      strength: 0.75,
      reach: 11,
    });
  }
  if (moment.comet) {
    lights.push({
      at: moment.comet.at,
      color: palette.danger,
      strength: 0.7,
      reach: 9,
    });
  }
  return lights;
}

/**
 * Returns the lamps a thing at a place takes from a moment's lights.
 *
 * @param {Point} at
 * @param {Light[]} lights
 * @param {Moment} moment
 * @returns {Lamp[]}
 */
function lampsAt(at, lights, moment) {
  /** @type {Lamp[]} */
  const lamps = [];
  for (const light of lights) {
    const [dx, dy] = across(at, light.at, moment);
    if (Math.hypot(dx, dy) > light.reach || (dx === 0 && dy === 0)) continue;
    lamps.push({
      at: [dx * moment.unit, dy * moment.unit],
      color: light.color,
      strength: light.strength,
      reach: light.reach * moment.unit,
    });
  }
  return lamps;
}

/**
 * Returns a rock's outline turned, in pixels about its middle.
 *
 * @param {RockShape} rock
 * @param {number} turn
 * @param {number} unit
 * @returns {Point[]}
 */
function outlineOf(rock, turn, unit) {
  return rock.outline.map((p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([
      x * rock.radius * unit,
      y * rock.radius * unit,
    ]);
  });
}

/**
 * Returns the rocks' layer.
 *
 * @param {Moment} moment
 * @param {Light[]} lights
 * @returns {string}
 */
function rocksLayer(moment, lights) {
  const { palette, unit } = moment;
  const inks = ROCK_INKS[palette.mode];
  return (moment.rocks ?? [])
    .map((thing) => {
      const rock = makeRock(thing.kind, thing.size, thing.seed);
      const turn = thing.turn ?? 0;
      const look = {
        unit,
        turn,
        hits: thing.hits ?? 0,
        lamps: lampsAt(thing.at, lights, moment),
      };
      const parts = [
        thing.flare
          ? flaringSvg(rock, palette, thing.flare, { unit, turn })
          : rockSvg(rock, palette, look),
      ];
      if (thing.struck) {
        const ink = thing.kind === "crystal" ? inks.stone : inks[thing.kind];
        parts.push(
          polygon(
            outlineOf(rock, turn, unit),
            mix(ink, "#ffffff", palette.mode === "light" ? 0.62 : 0.9),
            { opacity: 0.5 * thing.struck },
          ),
        );
      }
      return wrapped(parts.join(""), thing.at, rock.radius * 1.25, moment);
    })
    .join("");
}

/**
 * Returns the sparks' layer: those that hang, and those on their way in to
 * the pod, each with the tail it leaves.
 *
 * @param {Moment} moment
 * @param {boolean} over Whether to draw those that lie over the effects, or the rest.
 * @returns {string}
 */
function sparksLayer(moment, over) {
  const { palette, unit, pod } = moment;
  return (moment.sparks ?? [])
    .filter((thing) => Boolean(thing.over) === over)
    .map((thing) => {
      const size = thing.size ?? 1;
      if (thing.drawn === undefined || !pod) {
        return wrapped(
          moteSvg(size, palette, { unit, turn: thing.turn ?? 0 }),
          thing.at,
          1,
          moment,
          thing.opacity === undefined ? {} : { opacity: thing.opacity },
        );
      }
      const way = motePath(thing.at, pod.at, thing.bend ?? 0.25);
      return moteDrawnSvg(way, thing.drawn, size, palette, {
        unit,
        guide: false,
      });
    })
    .join("");
}

/**
 * Returns the tow line as the art kit lays it out, tied to the pod's own
 * hook whichever way the line trails.
 *
 * @param {PodThing} pod
 * @param {TowThing} tow
 * @returns {ReturnType<typeof towLine>}
 */
export function towOf(pod, tow) {
  const heading = tow.heading ?? pod.turn;
  const hook = PODS[pod.variant ?? "bumble"].hook;
  // `towLine()` turns the hook by the line's heading, so hand it the hook as that heading sees it.
  const tied = turned(turned(hook, pod.turn), -heading);
  const how = {
    heading,
    count: tow.pilots.length,
    hook: tied,
    ...(tow.gap === undefined ? {} : { gap: tow.gap }),
    ...(tow.sway === undefined ? {} : { sway: tow.sway }),
    ...(tow.phase === undefined ? {} : { phase: tow.phase }),
  };
  const loose = tow.loose ?? 0;
  const line = towLine({ ...how, loose });
  if (loose === 0 || !tow.flung) return line;
  // The kit lays a loose bubble just off the line; one that has flown is moved on the same way.
  const whole = towLine(how);
  const first = line.at.length - loose;
  for (let i = first; i < line.at.length; i++) {
    const at = /** @type {Point} */ (line.at[i]);
    const was = /** @type {Point} */ (whole.at[i]);
    const far = Math.hypot(at[0] - was[0], at[1] - was[1]) || 1;
    const dx = ((at[0] - was[0]) / far) * tow.flung;
    const dy = ((at[1] - was[1]) / far) * tow.flung;
    line.at[i] = [at[0] + dx, at[1] + dy];
    const end = 2 * (i - first) + 1;
    line.ends[end] = (line.ends[end] ?? []).map(([x, y]) => [x + dx, y + dy]);
  }
  return line;
}

/**
 * Returns the crew in tow, about the pod's middle.
 *
 * @param {PodThing} pod
 * @param {TowThing} tow
 * @param {Palette} palette
 * @param {number} unit
 * @returns {string}
 */
export function towDrawn(pod, tow, palette, unit) {
  const inks = PILOT_INKS[palette.mode];
  return towSvg(
    {
      tow: towOf(pod, tow),
      inks: tow.pilots.map((pilot) => inks[pilot % 8] ?? palette.accent),
      unit,
      loose: tow.loose ?? 0,
    },
    palette,
  );
}

/**
 * Returns an arc of a circle about the origin as a path's `d`, clockwise
 * from one angle to another.
 *
 * @param {number} r
 * @param {number} from In radians.
 * @param {number} to
 * @returns {string}
 */
export function arcD(r, from, to) {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M${num(x0)} ${num(y0)}A${num(r)} ${num(r)} 0 ${to - from > TURN / 2 ? 1 : 0} 1 ${num(x1)} ${num(y1)}`;
}

/**
 * Returns the two arcs the plan draws on the pod that the art kit's pod
 * lacks, about the pod's middle, to go under it: the short arc behind the
 * canopy that fills as the dash charges again, and the outer arc that
 * counts a weapon's time down.
 *
 * @param {PodThing} pod
 * @param {Palette} palette
 * @param {number} unit
 * @returns {string}
 */
export function podArcs(pod, palette, unit) {
  const tones = podTones(palette);
  const parts = [];
  const pen = Math.max(1.3, 0.1 * unit);
  if (pod.weapon !== undefined && pod.weapon > 0) {
    const r = WEAPON_ARC * unit;
    const sweep = Math.min(0.999, pod.weapon) * TURN;
    parts.push(
      ring(0, 0, r, palette.fieldText, Math.max(1, 0.05 * unit), {
        opacity: 0.12,
      }),
      path(arcD(r, -TURN / 4, -TURN / 4 + sweep), {
        fill: "none",
        stroke: palette.fieldText,
        "stroke-width": pen,
        "stroke-linecap": "round",
        opacity: 0.5,
      }),
    );
  }
  const recharge = pod.recharge ?? 1;
  const r = DASH_ARC.radius * unit;
  const tail = pod.turn + TURN / 2;
  const from = tail - DASH_ARC.half;
  const to = tail + DASH_ARC.half;
  const stroke = {
    fill: "none",
    "stroke-width": pen,
    "stroke-linecap": "round",
  };
  parts.push(
    path(arcD(r, from, to), {
      ...stroke,
      stroke: palette.field,
      "stroke-width": pen + Math.max(2, 0.16 * unit),
    }),
  );
  if (recharge >= 1) {
    if (pod.ready) {
      const [x, y] = polar(tail, r);
      parts.push(glow(x, y, 1.1 * unit, palette.accent, palette, 0.9));
    }
    parts.push(path(arcD(r, from, to), { ...stroke, stroke: tones.rimLit }));
  } else {
    parts.push(path(arcD(r, from, to), { ...stroke, stroke: tones.rimDim }));
    if (recharge > 0.03) {
      parts.push(
        path(arcD(r, from, from + (to - from) * recharge), {
          ...stroke,
          stroke: tones.rimLit,
        }),
      );
    }
  }
  return parts.join("");
}

/**
 * Returns the pod with everything the plan draws on it, about its middle:
 * the kit's pod, its canopy's rim filled by static, over the two arcs of
 * `podArcs()`.
 *
 * @param {PodThing} pod
 * @param {Palette} palette
 * @param {number} unit
 * @returns {string}
 */
export function podDrawn(pod, palette, unit) {
  const look = {
    variant: pod.variant ?? "bumble",
    turn: pod.turn,
    unit,
    pilot: pod.pilot ?? 0,
    charge: pod.charge ?? 0,
    thrust: pod.thrust ?? 0,
    dash: pod.dash ?? false,
    guard: pod.guard ?? 0,
    shield: pod.shield ?? false,
    // The kit fills the canopy's rim with the dash; the plan fills it with static.
    recharge: pod.static ?? 0,
    ...(pod.face ? { face: pod.face } : {}),
    ...(pod.look ? { look: pod.look } : {}),
  };
  return podArcs(pod, palette, unit) + podSvg(look, palette);
}

/**
 * Returns the exhaust a thrusting pod leaves, behind each of its engines,
 * about the pod's middle. It goes under the crew in tow, where the kit's
 * own trail, drawn with the pod, would lie over them.
 *
 * @param {PodThing} pod
 * @param {Palette} palette
 * @param {number} unit
 * @returns {string}
 */
export function exhaustDrawn(pod, palette, unit) {
  if (!pod.trail) return "";
  return PODS[pod.variant ?? "bumble"].engines
    .map((engine, i) => {
      const [x, y] = turned([engine.at[0] - 0.35, engine.at[1]], pod.turn);
      return place(
        exhaustFx(310 + i * 12, palette, { unit: unit * 0.66, seed: 5 + i }),
        { x: x * unit, y: y * unit, turn: (pod.turn / TURN) * 360 },
      );
    })
    .join("");
}

/**
 * Returns the pod's layer: the pod, the flash at its prow, and the spark
 * of a hit it has just taken.
 *
 * @param {Moment} moment
 * @returns {string}
 */
function podLayer(moment) {
  const { palette, unit, pod } = moment;
  if (!pod) return "";
  const parts = [podDrawn(pod, palette, unit)];
  if (pod.muzzle !== undefined) {
    const nose = polar(pod.turn, 1.5 * unit);
    parts.push(
      place(muzzleFlashSvg(pod.muzzle, palette, { unit, turn: pod.turn }), {
        x: nose[0],
        y: nose[1],
      }),
    );
  }
  if (pod.struck) {
    const toward = pod.struckFrom ?? 0;
    const hit = polar(toward, 1.3 * unit);
    parts.push(
      place(
        impactFx(40, palette, {
          unit,
          toward: toward + TURN / 2,
          seed: 4,
          count: 7,
        }),
        { x: hit[0], y: hit[1] },
      ),
    );
  }
  return wrapped(parts.join(""), pod.at, 4, moment);
}

/**
 * Returns the zap's arcs, each from the pod to the rim of the rock it
 * strikes, with a spark where it lands.
 *
 * @param {Moment} moment
 * @returns {string}
 */
function arcsLayer(moment) {
  const { palette, unit, pod } = moment;
  if (!pod) return "";
  const parts = [];
  for (const thing of moment.arcs ?? []) {
    const target = thing.to < 0 ? moment.blasts?.[0] : moment.rocks?.[thing.to];
    if (!target) continue;
    const [dx, dy] = across(pod.at, target.at, moment);
    const far = Math.hypot(dx, dy) || 1;
    const rock = makeRock(
      "kind" in target ? target.kind : "volatile",
      target.size,
      target.seed,
    );
    // It leaps from the hull's edge, so the pod stays whole under it, to the rim that faces the pod.
    const facing = Math.atan2(-dy, -dx);
    const rim = rimPoint(
      rock.outline.map((p) => turned(p, target.turn ?? 0)),
      facing,
    );
    const inset = 0.86;
    const from = /** @type {Point} */ ([
      (dx / far) * ARC_FROM,
      (dy / far) * ARC_FROM,
    ]);
    const to = /** @type {Point} */ ([
      dx + rim[0] * rock.radius * inset,
      dy + rim[1] * rock.radius * inset,
    ]);
    const strength = thing.strength ?? 1;
    parts.push(
      arcSvg(makeArc(from, to, thing.seed, { branches: 2 }), palette, {
        unit,
        strength,
      }),
      spark(to[0] * unit, to[1] * unit, 0.6 * unit, palette.accent, palette, {
        turn: thing.seed * 0.7,
        opacity: strength,
      }),
    );
  }
  return wrapped(parts.join(""), pod.at, 12, moment);
}

/**
 * Returns the effects' layer: rocks breaking, blasts, the zap's arcs, and
 * burrs flung off.
 *
 * @param {Moment} moment
 * @returns {string}
 */
function effectsLayer(moment) {
  const { palette, unit } = moment;
  const parts = [];
  for (const thing of moment.breaks ?? []) {
    const rock = makeRock(thing.kind, thing.size, thing.seed);
    parts.push(
      wrapped(
        breakFx(rock, thing.t, palette, {
          unit,
          turn: thing.turn ?? 0,
          seed: thing.seed,
          from: thing.from ?? 0,
          ...(thing.headings ? { headings: thing.headings } : {}),
        }),
        thing.at,
        rock.radius * 3,
        moment,
      ),
    );
  }
  for (const thing of moment.blasts ?? []) {
    const rock = makeRock("volatile", thing.size, thing.seed);
    parts.push(
      wrapped(
        blastFx(rock, thing.t, palette, {
          unit,
          turn: thing.turn ?? 0,
          seed: thing.seed,
        }),
        thing.at,
        8,
        moment,
      ),
    );
  }
  parts.push(arcsLayer(moment));
  for (const thing of moment.burrs ?? []) {
    const burr = burrSvg(makeBurr(thing.seed ?? 2), palette, {
      unit,
      turn: thing.turn ?? 0,
      scale: thing.scale ?? 0.82,
      ...(thing.opacity === undefined ? {} : { opacity: thing.opacity }),
    });
    const marks = [];
    if (thing.flung !== undefined) {
      // The ticks of a thing torn free, behind it on the way it came.
      const energy = energyOf(palette.accent, palette);
      for (const off of [-0.42, 0, 0.42]) {
        marks.push(
          polyline(
            [
              polar(thing.flung + TURN / 2 + off, 0.95 * unit),
              polar(
                thing.flung + TURN / 2 + off,
                (1.5 - Math.abs(off) * 0.5) * unit,
              ),
            ],
            energy.body,
            Math.max(1, 0.08 * unit),
            { opacity: 0.75 },
          ),
        );
      }
    }
    parts.push(wrapped(marks.join("") + burr, thing.at, 1.6, moment));
  }
  return parts.join("");
}

/**
 * Returns the points scored, each written where it was scored, in the
 * field's text over an outline in the field's color.
 *
 * @param {Moment} moment
 * @returns {string}
 */
function labelsLayer(moment) {
  const { palette, unit } = moment;
  const size = Math.max(11, 1.05 * unit);
  return (moment.labels ?? [])
    .map((label) => {
      const x = label.at[0] * unit;
      const y = label.at[1] * unit;
      const words = (/** @type {Record<string, string | number>} */ more) =>
        [
          text(x, y, label.words, {
            "font-size": size,
            "font-weight": 750,
            "text-anchor": "end",
            ...more,
          }),
          label.times
            ? text(x + 0.25 * unit, y, label.times, {
                "font-size": size * 0.72,
                "font-weight": 700,
                ...more,
              })
            : "",
        ].join("");
      return place(
        words({
          fill: palette.field,
          stroke: palette.field,
          "stroke-width": Math.max(2.5, 0.24 * unit),
          "stroke-linejoin": "round",
        }) + words({ fill: palette.fieldText }),
        label.opacity === undefined ? {} : { opacity: label.opacity },
      );
    })
    .join("");
}

/**
 * Returns a moment's field drawn from its top left corner, in pixels, back
 * to front in the game's order: the backdrop, the sparks, the rocks, the
 * pickups, the strays, the comet and its warning, the shots, the crew in
 * tow, the pod, the effects and the points. Whatever shows it clips it to
 * the field, as `fieldOf()` does.
 *
 * @param {Moment} moment
 * @returns {string}
 */
export function sceneSvg(moment) {
  const { palette, unit } = moment;
  const inks = PILOT_INKS[palette.mode];
  const lights = lightsOf(moment);
  const layers = [
    backdropSvg(
      {
        sector: moment.sector,
        width: moment.width,
        height: moment.height,
        unit,
        seed: moment.seed ?? 7,
      },
      palette,
    ),
    sparksLayer(moment, false),
    rocksLayer(moment, lights),
    (moment.orbs ?? [])
      .map((orb) =>
        wrapped(
          orbSvg(orb.id, palette, { unit, breath: orb.breath ?? 0.4 }),
          orb.at,
          2.2,
          moment,
        ),
      )
      .join(""),
    // A stray crosses the field and doesn't wrap, so it is drawn once.
    (moment.strays ?? [])
      .map((stray) =>
        place(
          straySvg(
            {
              ink: inks[stray.pilot % 8] ?? palette.accent,
              unit,
              face: stray.face ?? "plead",
              bob: stray.bob ?? 0,
              ...(stray.look ? { look: stray.look } : {}),
            },
            palette,
          ),
          { x: stray.at[0] * unit, y: stray.at[1] * unit },
        ),
      )
      .join(""),
    moment.warning
      ? place(
          warningSvg(moment.warning.frame ?? 1, palette, {
            unit,
            lane: moment.warning.lane,
          }),
          {
            x: moment.warning.at[0] * unit,
            y: moment.warning.at[1] * unit,
            turn: (moment.warning.turn / TURN) * 360,
          },
        )
      : "",
    moment.comet
      ? place(
          cometSvg(makeComet(moment.comet.seed ?? 1), palette, {
            unit,
            turn: moment.comet.turn,
          }),
          { x: moment.comet.at[0] * unit, y: moment.comet.at[1] * unit },
        )
      : "",
    (moment.shots ?? [])
      .map((shot) =>
        wrapped(
          shotSvg(shot.weapon ?? "gun", palette, { unit, turn: shot.turn }),
          shot.at,
          2.2,
          moment,
        ),
      )
      .join(""),
    // A zap lights the field about the pod, under it, and a hit flashes there.
    moment.pod && ((moment.arcs?.length ?? 0) > 0 || moment.pod.struck)
      ? wrapped(
          glow(
            0,
            0,
            (moment.pod.struck ? 3.4 : 4.2) * unit,
            palette.accent,
            palette,
            moment.pod.struck ? 0.85 : 0.6,
          ),
          moment.pod.at,
          5,
          moment,
        )
      : "",
    moment.pod
      ? wrapped(
          exhaustDrawn(moment.pod, palette, unit),
          moment.pod.at,
          4,
          moment,
        )
      : "",
    moment.pod && moment.tow
      ? wrapped(
          towDrawn(moment.pod, moment.tow, palette, unit),
          moment.pod.at,
          2 + moment.tow.pilots.length * (2 * TOW_RADIUS + 1.2),
          moment,
        )
      : "",
    podLayer(moment),
    effectsLayer(moment),
    sparksLayer(moment, true),
    labelsLayer(moment),
    moment.dim
      ? rect(
          0,
          0,
          moment.width * unit,
          moment.height * unit,
          palette.mode === "light" ? palette.fieldText : palette.page,
          { opacity: moment.dim },
        )
      : "",
  ];
  return layers.join("");
}

/**
 * Returns a moment's field at a place, clipped to its rectangle, with its
 * frame over it.
 *
 * @param {Moment} moment
 * @param {{ x: number, y: number, over?: string }} where Its top left corner, and anything to draw over the field, inside its frame.
 * @returns {string}
 */
export function fieldOf(moment, { x, y, over = "" }) {
  const { palette, unit } = moment;
  const width = moment.width * unit;
  const height = moment.height * unit;
  return [
    fieldSvg(x, y, width, height, sceneSvg(moment) + over, palette),
    rect(
      x + FRAME_PX / 2,
      y + FRAME_PX / 2,
      width - FRAME_PX,
      height - FRAME_PX,
      "none",
      { stroke: palette.fieldLine, "stroke-width": FRAME_PX },
    ),
  ].join("");
}

/** Matches one gradient of a file's defs, and its id. */
const GRADIENT =
  /<(radialGradient|linearGradient)\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/\1>/g;

/**
 * Returns the defs a drawing needs: for each palette in it the rocks', the
 * pod's and the backdrops' gradients, and a halo's for each color its
 * halos name, only those the drawing names.
 *
 * @param {string} svg The drawing.
 * @param {Palette[]} palettes
 * @returns {string}
 */
export function defsOf(svg, palettes) {
  const all = [
    ...palettes.map(
      (palette) => rockDefs(palette) + podDefs(palette) + backdropDefs(palette),
    ),
    glowDefs(svg),
  ].join("");
  return joinDefs([all], (id) => svg.includes(`url(#${id})`));
}

/**
 * Returns several drawings' defs as one file's, each id written once.
 *
 * @param {string[]} defs
 * @param {(id: string) => boolean} [wanted] Which ids to keep; all of them unless told.
 * @returns {string}
 */
export function joinDefs(defs, wanted = () => true) {
  const seen = new Set();
  const kept = [];
  for (const match of defs.join("").matchAll(GRADIENT)) {
    const id = /** @type {string} */ (match[2]);
    if (seen.has(id) || !wanted(id)) continue;
    seen.add(id);
    kept.push(match[0]);
  }
  return kept.join("");
}

/**
 * Returns a moment staged: its field at a place, clipped and framed, and
 * the defs the file that holds it needs.
 *
 * @param {Moment} moment
 * @param {{ x: number, y: number, over?: string }} where Its top left corner, and anything to draw over the field, inside its frame.
 * @returns {{ svg: string, defs: string }}
 */
export function stage(moment, where) {
  const svg = fieldOf(moment, where);
  return { svg, defs: defsOf(svg, [moment.palette]) };
}

/**
 * Returns sparks scattered about a place, as a broken rock sheds them.
 *
 * @param {Point} about
 * @param {number} count
 * @param {number} seed
 * @param {[number, number]} [reach] How far out they lie, in field units.
 * @returns {SparkThing[]}
 */
export function sparksAbout(about, count, seed, reach = [1, 2]) {
  const random = seeded(seed * 449 + 21);
  /** @type {SparkThing[]} */
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const angle = ((i + 0.15 + random() * 0.7) / count) * TURN + seed;
    const far = reach[0] + (reach[1] - reach[0]) * random();
    sparks.push({
      at: polar(angle, far, about),
      size: /** @type {0 | 1 | 2} */ (i % 3 === 2 ? 2 : 1),
      turn: random() * 0.6 - 0.3,
    });
  }
  return sparks;
}
