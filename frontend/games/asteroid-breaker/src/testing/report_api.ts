import { SPEEDS } from "../rules/speed";
import { STEP_S } from "../rules/tuning";
import { WAVES, waveEntryOf } from "../rules/waves/waves";
import {
  AUTOPILOT_LIMIT,
  ENDLESS_PLAYED,
  NARROWEST,
  TALLEST,
  WIDEST,
  playWave,
} from "./autopilot";
import type { ReportApi } from "./script_api";

/**
 * What `tools/report-waves.mjs` plays, which it loads through Vite: the
 * waves, the speeds, the fields and the autopilot, as its spec plays them.
 */
export const REPORT_API: ReportApi = {
  waves: WAVES,
  endless: ENDLESS_PLAYED,
  speeds: SPEEDS,
  stepSeconds: STEP_S,
  limit: AUTOPILOT_LIMIT,
  fields: { narrow: NARROWEST, wide: WIDEST, tall: TALLEST },
  playWave: (wave, speed, play) =>
    playWave(waveEntryOf(WAVES, wave), speed, play),
};
