import { LEVELS, levelEntryOf, parseLevel } from "../rules/levels/levels";
import { parFrom } from "../rules/run/stars";
import { DEPTHS } from "../rules/wall/wall";
import type { CertifyApi } from "./script_api";
import { lineHolds, replayLine, solveLevel } from "./solver";

/**
 * What `tools/certify-levels.mjs` plays, which each of its threads loads
 * through Vite: the levels, the depths and the solver, each line it finds
 * replayed before it is handed back, as the specs replay it, and thrown
 * for if it doesn't hold.
 */
export const CERTIFY_API: CertifyApi = {
  levels: LEVELS,
  depths: DEPTHS,
  solve: (number, depth) => {
    const level = parseLevel(levelEntryOf(LEVELS, number).data);
    const solved = solveLevel(level, depth);
    if (
      solved !== null &&
      !lineHolds(solved.line, replayLine(level, depth, solved.line))
    ) {
      throw new Error(
        `The solver's line for level ${String(number)} on a field ${String(depth)} deep doesn't hold.`,
      );
    }
    return solved;
  },
  parFrom,
};
