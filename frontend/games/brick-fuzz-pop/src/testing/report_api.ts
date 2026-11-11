import { LEVELS, levelEntryOf, parseLevel } from "../rules/levels/levels";
import { DEPTHS } from "../rules/wall/wall";
import { CASUAL_FLOORS, playCasually } from "./casual";
import type { ReportApi } from "./script_api";

/**
 * What `tools/report-levels.mjs` plays, which it loads through Vite: the
 * levels, the depths, the floors and the careless player, as the specs in
 * `src/rules/levels/every_floor/` play it.
 */
export const REPORT_API: ReportApi = {
  levels: LEVELS,
  depths: DEPTHS,
  floors: CASUAL_FLOORS,
  playCasually: (level, depth, seed) =>
    playCasually(parseLevel(levelEntryOf(LEVELS, level).data), depth, seed),
};
