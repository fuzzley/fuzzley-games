// The numbers that set the game's feel, in one file, so tuning it touches
// nothing else: lengths in field units, speeds in units a second, and times
// in milliseconds, but the step's, which the physics takes in seconds. A
// number a catalog's entries differ by, such as a blast's delay or a
// capsule's width or time, is the entry's; one that sets how an effect
// works, such as how long a caught ball waits or how fast a bolt rises, is
// here.

/** The field's width: 13 bricks of 2. */
export const FIELD_WIDTH = 26;

/**
 * The field's height, from the top wall to the floor, unless a screen taller
 * than it is wide has room for more, up to {@link TALLEST_FIELD}.
 */
export const FIELD_HEIGHT = 30;

/**
 * The tallest a field grows on a tall screen, the room it gains lying
 * between the bricks and the paddle.
 */
export const TALLEST_FIELD = 45;

/** How many bricks a row holds. */
export const COLUMNS = 13;

/** How many rows of bricks a level may have. */
export const ROWS = 16;

/** A brick's width. */
export const BRICK_WIDTH = 2;

/** A brick's height. */
export const BRICK_HEIGHT = 1;

/** How far below the top wall the first row of bricks lies. */
export const BRICKS_TOP = 2;

/** The paddle's width, as a level starts. */
export const PADDLE_WIDTH = 4;

/** The paddle's height. */
export const PADDLE_HEIGHT = 0.75;

/**
 * Where the paddle's top lies, down from the top wall, on a field
 * {@link FIELD_HEIGHT} tall; on a taller one it lies as far above the floor.
 */
export const PADDLE_TOP = 27.5;

/**
 * How fast the paddle grows or shrinks to a new width, in the rules, so the
 * paddle the scene draws is the one the ball meets.
 */
export const PADDLE_RESIZE_SPEED = 16;

/** The ball's radius. */
export const BALL_RADIUS = 0.36;

/** The most balls in play at once. */
export const MAX_BALLS = 8;

/** The share of the base speed each brick hit adds, to the speed's top. */
export const CLIMB = 0.015;

/** The angle a served ball leaves at, from straight up, in degrees. */
export const SERVE_ANGLE = 20;

/** The most slanted a ball leaves the paddle's ends at, from straight up, in degrees. */
export const PADDLE_ANGLE = 60;

/** The flattest a ball travels, from the horizontal, in degrees. */
export const FLATTEST = 20;

/** How many bounces without the paddle or a needed brick make a lull. */
export const LULL_BOUNCES = 12;

/** The least and most a lull's turn is, in degrees. */
export const LULL_TURN = { least: 3, most: 7 } as const;

/** The fastest held keys move the paddle: faster across than any speed's top. */
export const KEY_SPEED = 40;

/** How long held keys take to bring the paddle to its fastest. */
export const KEY_RAMP_MS = 120;

/** The fastest the paddle follows a pointer or a finger. */
export const POINTER_SPEED = 120;

/** How long a step of the field is, in seconds. */
export const STEP_S = 1 / 120;

/** The most steps one frame takes, however long it was. */
export const MAX_STEPS_PER_FRAME = 12;

/** The most contacts one ball makes in a step; the rest of it is dropped. */
export const MAX_CONTACTS = 4;

/** Lives at the start of a run. */
export const FIRST_LIVES = 3;

/** The most lives a player can hold. */
export const MAX_LIVES = 6;

/** The points that bring the first extra life. */
export const FIRST_LIFE_POINTS = 20_000;

/** The points between each extra life after the first. */
export const LIFE_POINTS = 40_000;

/**
 * How a streak of bricks broken between two touches of the paddle scores:
 * from how many bricks each multiplier starts, the highest first.
 */
export const STREAK = [
  { from: 20, times: 4 },
  { from: 10, times: 3 },
  { from: 5, times: 2 },
] as const;

/** The points a cleared level adds. */
export const CLEAR_POINTS = 1000;

/** The points a level cleared without losing a ball adds besides. */
export const CLEAN_POINTS = 500;

/** How fast a capsule falls. */
export const CAPSULE_FALL_SPEED = 9;

/** A capsule's width. */
export const CAPSULE_WIDTH = 1.6;

/** A capsule's height. */
export const CAPSULE_HEIGHT = 0.8;

/** The most capsules falling at once, but for a gift brick's. */
export const MAX_CAPSULES = 3;

/** How fast a laser bolt rises. */
export const BOLT_SPEED = 40;

/** The shortest time between two pairs of bolts. */
export const BOLT_GAP_MS = 350;

/** A bolt's length. */
export const BOLT_LENGTH = 0.8;

/** How far in from each end of the paddle its bolts are fired. */
export const BOLT_INSET = 0.4;

/** How long a caught ball waits on the paddle before it leaves by itself. */
export const CATCH_HOLD_MS = 3000;

/** How far below the paddle's top a net lies. */
export const NET_DEPTH = 1.25;
