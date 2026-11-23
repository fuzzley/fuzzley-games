// The part of a wall game's flight that its playback reads: the moments of
// a round, on its one clock and in one total order, so a flight plays the
// same wherever it is worked out, and each fuzzball's track through them,
// with where it is at any moment. What happens at a moment, and what goes
// first among a moment's events, is the game's own.

/** Says when something happens in a flight. */
export interface At {
  /** Units flown since the shot was released, on the round's one clock. */
  readonly at: number;
}

/** Describes where a fuzzball's middle is at a moment of its flight. */
export interface Waypoint extends At {
  readonly x: number;
  readonly y: number;
}

/**
 * Describes a fuzzball's path: where it left, each place it turned and where
 * it landed, in order of `at`, joined by straight lines flown at a unit a
 * unit of `at`.
 *
 * Where it goes into one of a pair of twins and comes out of the other, the
 * two places share a moment. A fuzzball that never left has none.
 */
export interface BallTrack<R extends string> {
  /** Its number in its round, from 0, in the order its game makes them. */
  readonly ball: number;
  readonly role: R;
  readonly waypoints: readonly Waypoint[];
}

/** Describes an event of a flight with where it goes among those of its moment, as its game sets them out. */
export interface KeyedEvent<E extends At> {
  readonly event: E;
  /** The part of its moment's events it goes in, the lowest first. */
  readonly section: number;
  /** What it happens to within its section, the lowest first: a fuzzball's number, or a cell. */
  readonly who: number;
  /** Where its kind goes among those of what it happens to. */
  readonly rank: number;
  /** The order it happened in, which no two events share, so what an event caused stays right after it. */
  readonly seq: number;
}

/**
 * Returns where an event goes in a flight, before another or after it: by
 * moment, then by section, by what it happens to, by kind and by when it
 * happened, a total order, so a flight sorted by it lists its events the
 * same way every time.
 */
export function byMoment(a: KeyedEvent<At>, b: KeyedEvent<At>): number {
  return (
    a.event.at - b.event.at ||
    a.section - b.section ||
    a.who - b.who ||
    a.rank - b.rank ||
    a.seq - b.seq
  );
}

/**
 * Returns where a fuzzball is at a moment, or null before it leaves, after
 * it lands, or ever for one that never left.
 *
 * At a moment two of its waypoints share, as a pair of twins' do, it is at
 * the later, where it flies on from.
 */
export function positionAt(
  track: BallTrack<string>,
  at: number,
): Waypoint | null {
  const { waypoints } = track;
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (first === undefined || last === undefined) {
    return null;
  }
  if (!(at >= first.at && at <= last.at)) {
    return null;
  }
  // The last waypoint at or before the moment, the one it flies on from,
  // found by halves, since a game's view asks for every fuzzball every frame.
  let from = first;
  let fromIndex = 0;
  let low = 1;
  let high = waypoints.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const waypoint = waypoints[middle];
    if (waypoint === undefined || waypoint.at > at) {
      high = middle - 1;
    } else {
      from = waypoint;
      fromIndex = middle;
      low = middle + 1;
    }
  }
  const to = waypoints[fromIndex + 1];
  if (to === undefined) {
    return { at, x: from.x, y: from.y };
  }
  const share = (at - from.at) / (to.at - from.at);
  return {
    at,
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share,
  };
}
