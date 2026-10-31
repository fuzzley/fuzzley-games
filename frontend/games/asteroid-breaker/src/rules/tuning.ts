// The numbers that set the game's feel, in one file, so tuning it touches
// nothing else: lengths in field units, speeds in units a second, and times
// in milliseconds, but the step's, which the physics takes in seconds. A
// number a catalog's entries differ by, such as a rock kind's speed or a
// pickup's time, is the entry's.

/** How long a step of the field is, in seconds. */
export const STEP_S = 1 / 120;

/** The most steps one frame takes, however long it was. */
export const MAX_STEPS_PER_FRAME = 12;

/** The field's short side, whatever the shape of the room it fills. */
export const FIELD_SHORT_SIDE = 40;

/**
 * The longest the field's long side grows, so a room longer than this
 * over {@link FIELD_SHORT_SIDE} times its short side shows the page at the
 * field's ends.
 */
export const FIELD_LONGEST_SIDE = 88;
