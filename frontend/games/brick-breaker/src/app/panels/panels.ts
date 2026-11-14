// What the panels beside a wide room's field show of a level and its play:
// where the level stands in its set, the kinds of brick it holds and which
// are new there, the capsules that can fall in it, and the effects in play.

import { EFFECT_KINDS, type InEffect } from "../../rules/bricks/capsules";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  hasTrait,
} from "../../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  capsule,
} from "../../rules/catalog/capsules";
import type { Level } from "../../rules/levels/level";
import { type LevelEntry, parseLevel } from "../../rules/levels/levels";
import type { Run } from "../../rules/run/run";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import { stepsIn } from "../../rules/stepper";
import { MAX_LIVES } from "../../rules/tuning";
import type { FieldView } from "../../view/field/frame";
import { timeLeft } from "../../view/field/tags";

/** What of a field says which effects are in play, and how far their time has run. */
type EffectsAt = Pick<FieldView, "effects" | "steps">;

/** Says where a level stands in its set: its place, from 1, and how many levels the set has. */
export interface PlaceInSet {
  readonly at: number;
  readonly of: number;
}

/** Describes a kind of brick a level holds. */
export interface KindHere {
  readonly id: BrickKindId;
  /** Whether the level is the first, by number, that holds it. */
  readonly isNew: boolean;
}

/** Describes an effect in play as the panels show it. */
export interface EffectInPlay {
  /** The capsule that started it. */
  readonly capsule: CapsuleId;
  /** How much of its time is left, from 1 as it starts; 1 for one that lasts until it is used. */
  readonly share: number;
  /** Its whole seconds left, rounded up, or null for one that lasts until it is used. */
  readonly seconds: number | null;
}

/**
 * Returns the score a run's next life comes at, or null while it holds the
 * most lives it may, which points bring no more of.
 */
export function nextLifeOf({
  lives,
  nextLifeAt,
}: Pick<Run, "lives" | "nextLifeAt">): number | null {
  return lives < MAX_LIVES ? nextLifeAt : null;
}

/** Returns where a level stands in its set. */
export function placeInSet({ set, data }: LevelEntry): PlaceInSet {
  return { at: set.levels.indexOf(data) + 1, of: set.levels.length };
}

/** Returns the kinds of brick a level holds, in How to play's order. */
export function kindsIn(level: Level): readonly BrickKindId[] {
  const kinds = new Set(level.cells.map((brick) => brick?.kind));
  return BRICK_KIND_IDS.filter((kind) => kinds.has(kind));
}

/**
 * Returns the number of the first level that holds each kind of brick, of
 * levels in the order they are played, for each kind any of them holds.
 */
export function firstLevels(
  levels: readonly LevelEntry[],
): ReadonlyMap<BrickKindId, number> {
  const firsts = new Map<BrickKindId, number>();
  for (const entry of levels) {
    for (const kind of kindsIn(parseLevel(entry))) {
      if (!firsts.has(kind)) firsts.set(kind, entry.number);
    }
  }
  return firsts;
}

/**
 * Returns the kinds of brick the level of a number holds, in How to play's
 * order, each new where that level is the first to hold it, as `firsts`
 * says ({@link firstLevels}).
 */
export function kindsHere(
  level: Level,
  number: number,
  firsts: ReadonlyMap<BrickKindId, number>,
): readonly KindHere[] {
  return kindsIn(level).map((id) => ({ id, isNew: firsts.get(id) === number }));
}

/**
 * Returns the capsules that can fall in a level at a speed, in How to play's
 * order: those a gift is pinned to, and the level's pool wherever a brick
 * may draw from it, by the level's chance or as a gift with none pinned,
 * but for those the speed keeps out.
 */
export function capsulesHere(level: Level, speed: Speed): readonly CapsuleId[] {
  const mayFall = (id: CapsuleId): boolean =>
    SPEED_INFO[speed].badCapsules || capsule(id).tone === "good";
  const here = new Set<CapsuleId>();
  let draws = level.drops > 0;
  for (const brick of level.cells) {
    if (!brick || !hasTrait(brick.kind, "gives")) continue;
    if (brick.capsule && mayFall(brick.capsule)) here.add(brick.capsule);
    else draws = true;
  }
  if (draws) {
    for (const id of level.capsules) if (mayFall(id)) here.add(id);
  }
  return CAPSULE_IDS.filter((id) => here.has(id));
}

/** Returns the effects in play on a field, in the order its tags show them. */
export function effectsInPlay(field: EffectsAt): readonly EffectInPlay[] {
  const shown: EffectInPlay[] = [];
  for (const kind of EFFECT_KINDS) {
    const effect = field.effects[kind];
    if (effect.capsule === null) continue;
    shown.push({
      capsule: effect.capsule,
      share: timeLeft(effect, field.steps),
      seconds: secondsLeft(effect, field.steps),
    });
  }
  return shown;
}

/**
 * Returns whether effects shown, as {@link effectsInPlay} returned them,
 * are those in play on a field, at the whole seconds each has left: false
 * once one has started, ended or ticked down a second. It makes nothing,
 * so it can be asked at every frame.
 */
export function showsEffects(
  shown: readonly EffectInPlay[],
  field: EffectsAt,
): boolean {
  let i = 0;
  for (const kind of EFFECT_KINDS) {
    const effect = field.effects[kind];
    if (effect.capsule === null) continue;
    const each = shown[i++];
    if (
      each?.capsule !== effect.capsule ||
      each.seconds !== secondsLeft(effect, field.steps)
    ) {
      return false;
    }
  }
  return i === shown.length;
}

/** Returns an effect's whole seconds left, rounded up, or null for one that lasts until it is used. */
function secondsLeft(effect: Readonly<InEffect>, steps: number): number | null {
  if (effect.endsAt === 0) return null;
  return Math.ceil((effect.endsAt - steps) / stepsIn(1000));
}
