// How long Rickashay's own flourishes take, in milliseconds, and how far
// those that move reach, in field units. The wall's step and jump, a struck
// brick's swell, a broken one's shards, a ring, the jump line's flash, the
// flare and a lost level's shake are `@fz/brick-wall/view/timing`'s, and
// move by `@fz/brick-wall/view/easing`'s curves.

/** How long a ramp's flash takes to run along its long face and fade. */
export const RAMP_FLASH_MS = 200;

/** How long a spark takes to fly off a plated face or a shut lock and fade. */
export const SPARK_MS = 180;

/** How long a hatch's bar takes to dip under a hold and settle back. */
export const DIP_MS = 220;

/** How far a hatch's bar dips under a hold. */
export const DIP = 0.12;

/** How long the hatches take to swing down as they open. */
export const SWING_MS = 320;

/** How long a portal takes to draw the fuzzball in, and its twin to let it out. */
export const PORTAL_MS = 240;

/** How long a lock's bolts take to slide a slot. */
export const SLIDE_MS = 200;

/** How long a spent floor bounce's spring takes to kick, and its puff to spread and fade. */
export const KICK_MS = 300;

/** How far behind the fuzzball dashing home its streak reaches. */
export const STREAK = 1.5;
