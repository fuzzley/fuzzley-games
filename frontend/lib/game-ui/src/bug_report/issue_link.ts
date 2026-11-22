import { packState } from "./packed";
import type { BugReportConfig, ReportState } from "./tokens";

/**
 * The fields of the issue form a report fills in, by the `id` each has in
 * the repository's `.github/ISSUE_TEMPLATE/game_bug_report.yml`.
 */
export const ISSUE_FIELDS = {
  game: "game",
  environment: "environment",
  gameState: "game-state",
} as const;

/** What the game-state field says where not even the smallest state fits. */
export const STATE_TOO_LARGE = "The game state was too large to attach.";

/** Describes what a report's link is built from. */
export interface ReportLinkFields {
  /** The game's name, which the issue's title starts with in brackets. */
  readonly title: string;
  /** The tag the state is packed under. */
  readonly tag: string;
  /** The game in play, in one line. */
  readonly game: string;
  /** The page and the game's settings, as a Markdown list. */
  readonly environment: string;
  /** The state, and how it shrinks to fit. */
  readonly state: ReportState;
}

/**
 * Returns an issue's title as the link fills it in: the game's name in
 * brackets, for the player to write what went wrong after.
 */
export function issueTitle(title: string): string {
  return `[${title}] `;
}

/**
 * Returns the link that opens a new issue on the form, filled in with a
 * report, its state the whole, or else as much of it as fits in
 * {@link BugReportConfig.maxUrlChars}.
 */
export async function issueLink(
  config: BugReportConfig,
  fields: ReportLinkFields,
): Promise<string> {
  const url = new URL(config.newIssueUrl);
  url.searchParams.set("template", config.template);
  url.searchParams.set("title", issueTitle(fields.title));
  url.searchParams.set(ISSUE_FIELDS.game, fields.game);
  url.searchParams.set(ISSUE_FIELDS.environment, fields.environment);
  url.searchParams.set(
    ISSUE_FIELDS.gameState,
    await fittedState(url, config.maxUrlChars, fields),
  );
  return url.toString();
}

/**
 * Returns the game-state field: the whole state, or else the most of its
 * parts that fit, by a binary search over how many it keeps.
 */
async function fittedState(
  url: URL,
  maxUrlChars: number,
  { tag, state }: ReportLinkFields,
): Promise<string> {
  const fits = (field: string): boolean => {
    const probe = new URL(url);
    probe.searchParams.set(ISSUE_FIELDS.gameState, field);
    return probe.toString().length <= maxUrlChars;
  };

  const whole = stateField(state.summary, await packState(tag, state.value));
  if (fits(whole)) return whole;

  let best = `${state.summary}\n\n${STATE_TOO_LARGE}`;
  const { trim } = state;
  if (!trim) return best;
  let low = 0;
  let high = trim.most - 1;
  while (low <= high) {
    const kept = Math.floor((low + high) / 2);
    const { value, note } = trim.at(kept);
    const field = stateField(
      `${state.summary} · ${note}`,
      await packState(tag, value),
    );
    if (fits(field)) {
      best = field;
      low = kept + 1;
    } else {
      high = kept - 1;
    }
  }
  return best;
}

/** Returns a summary line over a packed state in a code block. */
function stateField(summary: string, packed: string): string {
  return [summary, "", "```", packed, "```"].join("\n");
}
