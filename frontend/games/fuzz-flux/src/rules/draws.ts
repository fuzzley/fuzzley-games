// What each of the rules' draws is for. Every draw is `@fz/core/random`'s
// `hashOf()` of four whole numbers, the last a salt named here, so a draw
// hangs on no draw before it and two kinds of draw never meet; the careful
// player guesses at what falls in on seeds of its own, the deal's with the
// bits flipped that the masks here set. The deals proven for every level
// rely on these numbers, bit for bit.

/** The salt each kind of draw takes as the last of `hashOf()`'s four numbers. */
export const SALTS = {
  /**
   * The kind a square the deal fills tries first, drawn from the deal's
   * seed, its try at the board and the square, each kind after it tried in
   * turn.
   */
  deal: 1,
  /**
   * A refill's kind, drawn from the deal's seed, its lane's key and how
   * many fuzzballs the lane has let in before it.
   */
  refill: 3,
  /**
   * What breaks a tie between the squares a wisp would fly to, drawn from
   * the deal's seed, the moves played and the square.
   */
  wisp: 7,
  /**
   * Which of the ways a burr can spread it takes, drawn from the deal's
   * seed, the moves played and how many ways there are.
   */
  burr: 11,
  /**
   * Which plain fuzzball each spare move of the encore makes special, drawn
   * from the deal's seed, the moves played and the spare moves left after
   * it.
   */
  encore: 21,
  /**
   * The first of the shuffle's salts, a try each from it on: each try draws
   * a key for each plain fuzzball from the deal's seed, the moves played
   * and its place, and they trade places in the order of their keys.
   */
  shuffle: 100,
} as const satisfies Readonly<Record<string, number>>;

/**
 * How far apart each quarter turn of the board's frame keys its lanes for a
 * refill's draw, more than any board's lanes: a lane's key is its frame's
 * quarter turns times this, and its place.
 */
export const LANE_KEYS_A_TURN = 64;

/**
 * The masks of the careful player's two guesses at what falls in, a guess
 * each: it pictures a move played on the deal's seed with the mask's bits
 * flipped, so it can't see what will fall in.
 */
export const GUESS_MASKS = [0x5bd1e995, 0x1b873593] as const;
