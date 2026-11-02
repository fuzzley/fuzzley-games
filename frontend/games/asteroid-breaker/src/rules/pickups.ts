// The pickups floating on the field, drifting, drawn in to the ship and
// caught, and the effects they start, one of each group at a time.

import { keysOf } from "@fz/core/records";
import {
  type EffectKind,
  type PickupEffect,
  type PickupId,
  pickup,
} from "./catalog/pickups";
import type { Floating } from "./drops";
import type { Field } from "./field";
import { gainShipOn } from "./pilots";
import { hitWithin } from "./rocks";
import type { Ship } from "./ship";
import { stepsIn } from "./stepper";
import { type Torus, distanceSquared, pullToward, wrap } from "./torus";
import {
  PICKUP_CATCH_REACH,
  PICKUP_PULL_REACH,
  PICKUP_PULL_SPEED,
  STEP_S,
} from "./tuning";

/** Keeps an effect of a group in play: the pickup that started it, and when it ends. */
export interface InEffect {
  /** The pickup that started it, or null while none of the group is in play. */
  pickup: PickupId | null;
  /** The step it ends at, or 0 for one that lasts until it is used. */
  endsAt: number;
}

/** The effects in play, one for each group. */
export type Effects = Readonly<Record<EffectKind, InEffect>>;

/** An effect of each kind, by its kind. */
type EffectOf = { readonly [E in PickupEffect as E["kind"]]: E };

/** Says what the field does for one kind of effect, as it starts and as it ends. */
interface EffectRule<E extends PickupEffect> {
  /** Runs as the ship catches a pickup with it. */
  readonly start: (field: Field, effect: E, ship: Readonly<Ship>) => void;
  /**
   * Undoes it, as its time runs out, the next pickup of its group is
   * caught, a ship is lost or the wave is cleared. An effect without one is
   * over as it starts.
   */
  readonly end?: (field: Field) => void;
}

/** What each effect does, so an effect without its rule fails to compile. */
const EFFECT_RULES: { readonly [K in EffectKind]: EffectRule<EffectOf[K]> } = {
  weapon: {
    start: (field, { weapon }) => {
      field.weapon = weapon;
    },
    end: (field) => {
      field.weapon = "gun";
    },
  },
  guard: {
    start: (field) => {
      field.shielded = true;
    },
    end: (field) => {
      field.shielded = false;
    },
  },
  pull: {
    start: (field, { reach }) => {
      field.pullReach = reach;
    },
    end: (field) => {
      field.pullReach = PICKUP_PULL_REACH;
    },
  },
  pace: {
    start: (field, { scale }) => {
      field.pace = field.setup.pace * scale;
    },
    end: (field) => {
      field.pace = field.setup.pace;
    },
  },
  nova: {
    start: (field, { reach }, ship) => {
      field.events.add("nova", ship.x, ship.y, reach);
      hitWithin(field, ship.x, ship.y, reach);
    },
  },
  ship: {
    start: (field) => {
      gainShipOn(field);
    },
  },
};

/** Every kind of effect, in the order the field shows their tags. */
export const EFFECT_KINDS = keysOf(EFFECT_RULES);

/** Returns whether an effect of a kind lasts, until its time runs out or it is used, rather than being over as it starts. */
export function lasts(kind: EffectKind): boolean {
  return EFFECT_RULES[kind].end !== undefined;
}

/** Returns the records of the effects in play, none yet. */
export function createEffects(): Effects {
  const none = (): InEffect => ({ pickup: null, endsAt: 0 });
  return {
    weapon: none(),
    guard: none(),
    pull: none(),
    pace: none(),
    nova: none(),
    ship: none(),
  };
}

/**
 * Moves each floating pickup on a step, or fades it as its time runs out:
 * one within the field's reach of the ship is drawn in toward it, any other
 * drifts, and the ship catches one that touches it.
 */
export function stepPickups(field: Field): void {
  const { ship, torus } = field;
  for (const floating of field.pickups) {
    if (!floating.live) continue;
    if (floating.lifeSteps === 0) {
      floating.live = false;
      field.events.addPickup("faded", floating.x, floating.y, floating.id);
      continue;
    }
    floating.lifeSteps -= 1;
    floating.lastX = floating.x;
    floating.lastY = floating.y;
    if (ship === null || !pullIn(field, floating, ship)) {
      drift(floating, torus);
    }
    if (ship !== null && touches(floating, ship, torus)) {
      floating.live = false;
      catchPickup(field, floating, ship);
    }
  }
}

/** Ends the effects whose time has run out. */
export function stepEffects(field: Field): void {
  for (const kind of EFFECT_KINDS) {
    const inEffect = field.effects[kind];
    if (inEffect.pickup === null || inEffect.endsAt === 0) continue;
    if (field.steps >= inEffect.endsAt) endEffect(field, kind);
  }
}

/** Ends an effect of a group, if one is in play. */
export function endEffect(field: Field, kind: EffectKind): void {
  const inEffect = field.effects[kind];
  if (inEffect.pickup === null) return;
  inEffect.pickup = null;
  inEffect.endsAt = 0;
  EFFECT_RULES[kind].end?.(field);
}

/** Ends every effect, as a ship is lost or the wave is cleared. */
export function endEffects(field: Field): void {
  for (const kind of EFFECT_KINDS) endEffect(field, kind);
}

/** Lets go of the floating pickups, as a ship is lost or the wave is cleared. */
export function clearPickups(field: Field): void {
  for (const floating of field.pickups) floating.live = false;
}

/**
 * Starts a caught pickup's effect, ending the one of its group in play, if
 * any, so the same pickup again starts its time over.
 */
function catchPickup(
  field: Field,
  floating: Readonly<Floating>,
  ship: Readonly<Ship>,
): void {
  const { id } = floating;
  const { effect } = pickup(id);
  field.events.addPickup("caught", floating.x, floating.y, id);
  endEffect(field, effect.kind);
  startEffect(field, effect.kind, effect, ship);
  if (lasts(effect.kind)) {
    const inEffect = field.effects[effect.kind];
    inEffect.pickup = id;
    inEffect.endsAt = "ms" in effect ? field.steps + stepsIn(effect.ms) : 0;
  }
}

/** Runs an effect's start rule. */
function startEffect<K extends EffectKind>(
  field: Field,
  kind: K,
  effect: EffectOf[K],
  ship: Readonly<Ship>,
): void {
  EFFECT_RULES[kind].start(field, effect, ship);
}

/** Draws a pickup a step in toward the ship, if it is within the field's reach of it, and returns whether it did. */
function pullIn(
  field: Field,
  floating: Floating,
  ship: Readonly<Ship>,
): boolean {
  return pullToward(
    floating,
    ship,
    field.pullReach,
    PICKUP_PULL_SPEED * STEP_S,
    field.torus,
  );
}

/** Drifts a pickup a step on, across the wrap. */
function drift(floating: Floating, torus: Torus): void {
  floating.x = wrap(floating.x + floating.vx * STEP_S, torus.width);
  floating.y = wrap(floating.y + floating.vy * STEP_S, torus.height);
}

/** Returns whether a pickup touches the ship, near enough to its middle to be caught. */
function touches(
  floating: Readonly<Floating>,
  ship: Readonly<Ship>,
  torus: Torus,
): boolean {
  const apart = distanceSquared(torus, floating.x, floating.y, ship.x, ship.y);
  return apart <= PICKUP_CATCH_REACH * PICKUP_CATCH_REACH;
}
