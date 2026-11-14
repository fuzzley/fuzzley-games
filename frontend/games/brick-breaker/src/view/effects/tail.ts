import { SPEED_INFO } from "../../rules/speed";
import { MAX_STEPS_PER_FRAME, STEP_S } from "../../rules/tuning";
import { STREAK_STEPS, streakTier } from "./streak";

/** The most dots a ball's tail has, at the streak's last step. */
export const TAIL_MOST = 8;

/** How far a ball goes between one place its tail keeps and the next, in field units. */
export const TAIL_GAP = 0.5;

/**
 * How far a ball may go between one frame and the next and still lay its
 * tail along the way, in field units: as far as one at twice Fast's top
 * speed, Custom's most, goes in the longest frame; farther, it was moved,
 * not flying.
 */
const TAIL_JUMP = 2 * SPEED_INFO.fast.top * MAX_STEPS_PER_FRAME * STEP_S;

/** How opaque a tail's nearest dot is. */
export const TAIL_ALPHA = 0.6;

/**
 * How large the dots of a tail shrink toward, as a share of the nearest's
 * size: the size of a dot one past the farthest.
 */
export const TAIL_LEAST = 0.4;

/** Says where a ball was, in field units. */
interface Place {
  x: number;
  y: number;
}

/**
 * Keeps the places a ball has passed, a gap apart, for its tail: the last
 * {@link TAIL_MOST} it laid before its latest, which lies within a gap of
 * the ball, under it. Its records are made once, so following a ball makes
 * nothing.
 */
export class Trail {
  /** The places, a ring, the newest at {@link newest}. */
  private readonly places: readonly Place[] = Array.from(
    { length: TAIL_MOST },
    () => ({ x: 0, y: 0 }),
  );
  /** Where in the ring the newest place is. */
  private newest = 0;
  /** How many places it keeps. */
  private kept = 0;
  /** The place it laid last, which it keeps once it lays the next. */
  private readonly laid: Place = { x: 0, y: 0 };
  /** Where it last followed the ball to. */
  private readonly followed: Place = { x: 0, y: 0 };
  /** Whether it has a ball to follow, laid where it was first followed. */
  private following = false;

  /** How many places it keeps, up to {@link TAIL_MOST}. */
  get length(): number {
    return this.kept;
  }

  /**
   * Follows the ball to where it is now, laying a place at each gap along
   * its way from the last one laid, or starting afresh where it jumped.
   */
  follow(x: number, y: number): void {
    const { laid, followed } = this;
    const jumped = Math.hypot(x - followed.x, y - followed.y) > TAIL_JUMP;
    followed.x = x;
    followed.y = y;
    if (!this.following || jumped) {
      this.clear();
      this.following = true;
      laid.x = x;
      laid.y = y;
      return;
    }
    const dx = x - laid.x;
    const dy = y - laid.y;
    const way = Math.hypot(dx, dy);
    const gaps = Math.floor(way / TAIL_GAP);
    for (let gap = 1; gap <= gaps; gap++) {
      this.keep(laid);
      laid.x += (dx * TAIL_GAP) / way;
      laid.y += (dy * TAIL_GAP) / way;
    }
  }

  /** Forgets every place, as its ball leaves play or waits on the paddle. */
  clear(): void {
    this.following = false;
    this.kept = 0;
  }

  /**
   * Returns a place it keeps, from the newest, 0, back.
   *
   * @throws {RangeError} For a place it doesn't keep.
   */
  placeOf(back: number): Readonly<Place> {
    return this.placeAt(back);
  }

  /** Keeps a place as the newest, letting the oldest go once it keeps the most. */
  private keep({ x, y }: Readonly<Place>): void {
    this.newest = (this.newest + 1) % TAIL_MOST;
    this.kept = Math.min(this.kept + 1, TAIL_MOST);
    const place = this.placeAt(0);
    place.x = x;
    place.y = y;
  }

  /** Returns the record of a place it keeps, from the newest back, or throws a RangeError. */
  private placeAt(back: number): Place {
    const place =
      back >= 0 && back < this.kept
        ? this.places[(this.newest - back + TAIL_MOST) % TAIL_MOST]
        : undefined;
    if (!place) {
      throw new RangeError(`The trail keeps no place ${String(back)} back.`);
    }
    return place;
  }
}

/**
 * Returns how many dots a ball's tail has in a streak: none before the
 * multiplier's first step, then more at each, up to {@link TAIL_MOST} at its
 * last.
 */
export function tailLength(streak: number): number {
  const tier = streakTier(streak);
  if (tier === 0) return 0;
  return Math.round((TAIL_MOST * (tier + 1)) / (STREAK_STEPS.length + 1));
}

/** Returns how opaque a dot of a tail so long is, from its nearest, 0: fainter at each. */
export function tailAlpha(dot: number, length: number): number {
  return TAIL_ALPHA * (1 - dot / length);
}

/** Returns how large a dot of a tail so long is, from its nearest, 0, as a share of the nearest's size. */
export function tailScale(dot: number, length: number): number {
  return 1 - ((1 - TAIL_LEAST) * dot) / length;
}
