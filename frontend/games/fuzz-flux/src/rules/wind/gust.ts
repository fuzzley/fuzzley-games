// A gust: the turning wind turning after a move. A turning wind counts its
// wait down a move at a time, and the move that runs it out turns the
// board's frame its quarters clockwise, which turns the wind as many
// counterclockwise on the screen, and begins its wait again.

import type { WindRule } from "../elements/element_rule";

/** The wind's part in a move: a turning wind waits its moves, then turns. */
export const GUST_RULE: Required<WindRule> = {
  afterMove: (wind) => {
    const wait = wind.wait - 1;
    return wait > 0
      ? { wind: { ...wind, wait }, quarters: 0 }
      : { wind: { ...wind, wait: wind.every }, quarters: wind.quarters };
  },
};
