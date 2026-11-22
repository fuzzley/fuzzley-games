import type { ReportState } from "@fz/game-ui/bug_report";
import {
  readNumber,
  readObject,
  readRecord,
  readString,
} from "@/engine/core/common/json_reader";
import {
  type GameSnapshot,
  readGameSnapshot,
} from "@/engine/tableau/session/game_snapshot";
import type { GameOptionValues } from "../provider/game_catalog";

/** Records a game as a bug report carries it: which, by what rules, where. */
export interface GamePosition {
  readonly gameId: string;
  readonly options: GameOptionValues;
  readonly snapshot: GameSnapshot;
}

/**
 * The tag a bug report packs a position under, which every report filed
 * since the first has carried, so none may change it.
 */
export const POSITION_TAG = "fs1";

/**
 * Reads a value from outside, such as parsed JSON, as a position.
 *
 * @throws Error naming the first part that is malformed.
 */
export function readGamePosition(
  value: unknown,
  path = "position",
): GamePosition {
  const position = readObject(value, path);
  return {
    gameId: readString(position["gameId"], `${path}.gameId`),
    options: readRecord(position["options"], `${path}.options`, readNumber),
    snapshot: readGameSnapshot(position["snapshot"], `${path}.snapshot`),
  };
}

/**
 * Returns a position as a bug report carries it: its score and moves, then
 * the position, which keeps fewer of its undo steps, the newest, where the
 * whole doesn't fit the report's link.
 */
export function reportedPosition(position: GamePosition): ReportState {
  const { score, history } = position.snapshot;
  const summary = `Score ${score} · ${history.length} moves`;
  if (history.length === 0) return { summary, value: position };
  return {
    summary,
    value: position,
    trim: {
      most: history.length,
      at: (kept) => ({
        value: {
          ...position,
          snapshot: {
            ...position.snapshot,
            history: history.slice(history.length - kept),
          },
        },
        note: `${kept} of ${history.length} undo steps`,
      }),
    },
  };
}
