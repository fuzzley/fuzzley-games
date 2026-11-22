import { TestBed } from "@angular/core/testing";
import { installCompressionStreams } from "../testing";
import {
  ISSUE_FIELDS,
  type ReportLinkFields,
  STATE_TOO_LARGE,
  issueLink,
} from "./issue_link";
import { unpackState } from "./packed";
import {
  BUG_REPORT_CONFIG,
  type BugReportConfig,
  type ReportState,
} from "./tokens";

/** A form of the spec's own, on a limit of the usual length. */
const CONFIG: BugReportConfig = {
  newIssueUrl: "https://github.com/example/games/issues/new",
  template: "game_bug_report.yml",
  maxUrlChars: 6000,
};

/** The form on a limit too tight for a long history. */
const TIGHT: BugReportConfig = { ...CONFIG, maxUrlChars: 2500 };

/** The form on a limit nothing fits. */
const NO_ROOM: BugReportConfig = { ...CONFIG, maxUrlChars: 0 };

/** A small state that can't shrink. */
const SMALL: ReportState = {
  summary: "Score 12 · Length 5",
  value: { snake: [3, 4, 5], food: 17 },
};

/** Returns a report of a game, its state given or else {@link SMALL}. */
function report(state: ReportState = SMALL): ReportLinkFields {
  return {
    title: "Snake",
    tag: "sn1",
    game: "Snake · Fast",
    environment: "- Build: 549c93a\n- Theme: midnight",
    state,
  };
}

/** Describes one move of a history, distinct from every other. */
interface Move {
  readonly card: string;
  readonly from: string;
  readonly to: string;
  readonly score: number;
}

/** Returns a history of distinct moves, oldest first. */
function movesOf(length: number): readonly Move[] {
  return Array.from({ length }, (_, index): Move => ({
    card: `card-${index}`,
    from: `tableau-${index % 7}`,
    to: `tableau-${(index + 3) % 7}`,
    score: index * 7,
  }));
}

/**
 * Returns a state holding a history of moves, which shrinks by keeping only
 * the newest.
 */
function history(moves: readonly Move[]): ReportState {
  const { length } = moves;
  return {
    summary: `${length} moves`,
    value: { moves },
    trim: {
      most: length,
      at: (kept) => ({
        value: { moves: moves.slice(length - kept) },
        note: `${kept} of ${length} undo steps`,
      }),
    },
  };
}

/** Numbers enough that no link has room for them. */
const TOO_MANY = Array.from({ length: 5000 }, (_, index) => index * 7919);

/**
 * Returns a state of 100 parts that fits the usual link with up to `fitting`
 * of them kept, and never with more.
 */
function cliff(fitting: number): ReportState {
  return {
    summary: "Cliff",
    value: { numbers: TOO_MANY },
    trim: {
      most: 100,
      at: (kept) => ({
        value: kept <= fitting ? { kept } : { kept, numbers: TOO_MANY },
        note: `${kept} of 100 parts`,
      }),
    },
  };
}

/** Returns one field of the link, as the issue form will receive it. */
async function prefilled(
  fieldId: string,
  fields: ReportLinkFields = report(),
  config: BugReportConfig = CONFIG,
): Promise<string> {
  const url = new URL(await issueLink(config, fields));
  return url.searchParams.get(fieldId) ?? "";
}

/** Returns the moves a link's game-state field kept. */
async function keptMoves(
  fields: ReportLinkFields,
  config: BugReportConfig,
): Promise<readonly Move[]> {
  const field = await prefilled(ISSUE_FIELDS.gameState, fields, config);
  const { moves } = (await unpackState("sn1", field)) as {
    readonly moves: readonly Move[];
  };
  return moves;
}

installCompressionStreams();

describe("BUG_REPORT_CONFIG", () => {
  it("files reports on the games' shared form unless told otherwise", () => {
    expect(TestBed.inject(BUG_REPORT_CONFIG)).toEqual({
      newIssueUrl: "https://github.com/fuzzley/fuzzley-games/issues/new",
      template: "game_bug_report.yml",
      maxUrlChars: 6000,
    });
  });
});

describe("issueLink", () => {
  it("opens a new issue on the configured form", async () => {
    const url = new URL(await issueLink(CONFIG, report()));

    expect(`${url.origin}${url.pathname}`).toBe(CONFIG.newIssueUrl);
    expect(url.searchParams.get("template")).toBe(CONFIG.template);
  });

  it("titles the issue with the game's name, for the player to go on", async () => {
    expect(await prefilled("title")).toBe("[Snake] ");
  });

  it("names the game in play", async () => {
    expect(await prefilled(ISSUE_FIELDS.game)).toBe("Snake · Fast");
  });

  it("lists the environment", async () => {
    expect(await prefilled(ISSUE_FIELDS.environment)).toBe(
      "- Build: 549c93a\n- Theme: midnight",
    );
  });

  it("sums up the state over it, in a code block", async () => {
    const field = await prefilled(ISSUE_FIELDS.gameState);

    expect(field).toMatch(/^Score 12 · Length 5\n\n```\nsn1\.\S+\n```$/);
  });

  it("attaches the whole state where it fits", async () => {
    const field = await prefilled(ISSUE_FIELDS.gameState);

    expect(await unpackState("sn1", field)).toEqual(SMALL.value);
  });

  it("attaches a state that could shrink whole where it fits", async () => {
    expect(await keptMoves(report(history(movesOf(20))), CONFIG)).toHaveLength(
      20,
    );
  });

  it("keeps the link within the limit when the state is long", async () => {
    const link = await issueLink(TIGHT, report(history(movesOf(300))));

    expect(link.length).toBeLessThanOrEqual(2500);
  });

  it("keeps the most useful parts of a state too long to attach whole", async () => {
    const moves = movesOf(300);

    const kept = await keptMoves(report(history(moves)), TIGHT);

    expect(kept.length).toBeGreaterThan(0);
    expect(kept).toEqual(moves.slice(300 - kept.length));
  });

  it("keeps as many parts as fit, not fewer", async () => {
    const field = await prefilled(ISSUE_FIELDS.gameState, report(cliff(37)));

    expect(await unpackState("sn1", field)).toEqual({ kept: 37 });
  });

  it("says in the summary what it left out", async () => {
    const field = await prefilled(
      ISSUE_FIELDS.gameState,
      report(history(movesOf(300))),
      TIGHT,
    );

    expect(field).toMatch(/^300 moves · \d+ of 300 undo steps\n/);
  });

  it("says so when not even the smallest part fits", async () => {
    const field = await prefilled(
      ISSUE_FIELDS.gameState,
      report(history(movesOf(300))),
      NO_ROOM,
    );

    expect(field).toBe(`300 moves\n\n${STATE_TOO_LARGE}`);
  });

  it("says so when a state that can't shrink doesn't fit", async () => {
    const field = await prefilled(ISSUE_FIELDS.gameState, report(), NO_ROOM);

    expect(field).toBe(`Score 12 · Length 5\n\n${STATE_TOO_LARGE}`);
  });
});
