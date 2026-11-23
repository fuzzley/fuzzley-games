// The guide a wall game's view works out for a shot before it is let fly,
// which its scene's guide painter draws: dots along the shot's path, the
// places it turns, and the bricks it would strike.

/** Describes a dot of the guide: its middle on the field, in field units, and how strongly it shows, 0 to 1, whole where it doesn't say. */
export interface GuideDot {
  readonly x: number;
  readonly y: number;
  readonly alpha?: number;
}

/** Describes a place on the field, in field units. */
export interface GuidePlace {
  readonly x: number;
  readonly y: number;
}

/** Describes the guide a shot shows before it is let fly, as a game's view works it out. */
export interface WallGuide {
  /** Where each dot lies along the shot's path, and how strongly it shows. */
  readonly dots: readonly GuideDot[];
  /** Where the shot turns, a ring at each where a game rings them: none for a game that doesn't. */
  readonly turns: readonly GuidePlace[];
  /** The wall cell of each brick the shot would strike, in the wall it is aimed at, each marked. */
  readonly struck: readonly number[];
}
