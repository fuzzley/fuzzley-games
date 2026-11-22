import {
  type ReportState,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { type Grid, countHint, place, toggleNote } from "../../rules/grid";
import { hintFor } from "../../rules/hint";
import {
  EASY,
  gridFrom,
  solvedBut,
  squareAt,
} from "../../testing/grid_picture";
import { DEFAULT_SETTINGS } from "../settings/settings.service";
import {
  REPORT_TAG,
  type ReportedGame,
  readReportedGame,
  reportState,
  reportSummary,
  reportedValue,
} from "./reported_game";

const CLEARING = { clearNotes: true };

/** A game under way: a note left, a 6 placed and a hint used, 2 moves in all. */
const PLAYED = countHint(
  place(
    toggleNote(gridFrom(EASY), squareAt("r1c2"), 9),
    squareAt("r1c1"),
    6,
    CLEARING,
  ),
);

/** `EASY` solved by its last digit, a 6 placed at row 1, column 1. */
const SOLVED = place(
  gridFrom(EASY, { digits: solvedBut("r1c1") }),
  squareAt("r1c1"),
  6,
  CLEARING,
);

/** Returns a reported game on a grid, 42 seconds in, at the defaults. */
function reported(
  grid: Grid,
  change: Partial<ReportedGame> = {},
): ReportedGame {
  return {
    grid,
    seconds: 42,
    selected: squareAt("r1c1"),
    notesMode: false,
    hint: null,
    settings: DEFAULT_SETTINGS,
    replay: false,
    ...change,
  };
}

/** Returns how a reported game's state shrinks, failing where it can't. */
function trimOf(game: ReportedGame): NonNullable<ReportState["trim"]> {
  const { trim } = reportState(game);
  if (!trim) throw new Error("The state can't shrink.");
  return trim;
}

/** A game under way as it is packed, for a spec to spoil one part of. */
const PACKED = reportedValue(reported(PLAYED));

describe("readReportedGame", () => {
  installCompressionStreams();

  it.each<[string, ReportedGame]>([
    ["fresh", reported(gridFrom(EASY, { level: "hard" }))],
    [
      "under way, a hint showing",
      reported(PLAYED, {
        seconds: 3725,
        selected: squareAt("r9c9"),
        notesMode: true,
        hint: hintFor(PLAYED),
        settings: { level: "hard", markMistakes: true, clearNotes: false },
      }),
    ],
    ["solved, played again", reported(SOLVED, { replay: true })],
  ])("reads back a game %s as it was packed", async (_, game) => {
    const text = await packState(REPORT_TAG, reportedValue(game));

    expect(readReportedGame(await unpackState(REPORT_TAG, text))).toEqual(game);
  });

  it("can't read a state that isn't an object", () => {
    expect(() => readReportedGame([PACKED])).toThrow(
      "This build can't read the game state.",
    );
  });

  it.each<[string, object]>([
    ["grid", { grid: { ...PACKED.grid, digits: "6" } }],
    ["seconds", { seconds: -1 }],
    ["selected", { selected: 81 }],
    ["notesMode", { notesMode: "on" }],
    ["hint", { hint: 1 }],
    ["settings", { settings: "easy" }],
    ["settings", { settings: { ...DEFAULT_SETTINGS, level: "master" } }],
    ["settings", { settings: { ...DEFAULT_SETTINGS, markMistakes: "on" } }],
    ["settings", { settings: { ...DEFAULT_SETTINGS, clearNotes: 1 } }],
    ["replay", { replay: null }],
  ])("names the state's %s where it can't read it", (part, change) => {
    expect(() => readReportedGame({ ...PACKED, ...change })).toThrow(
      `This build can't read ${part} in the game state.`,
    );
  });

  it("names a hint the grid doesn't give", () => {
    const solved = { ...reportedValue(reported(SOLVED)), hint: true };

    expect(() => readReportedGame(solved)).toThrow(
      "This build can't read hint in the game state.",
    );
  });

  it("names a part it doesn't know", () => {
    expect(() => readReportedGame({ ...PACKED, pencil: true })).toThrow(
      "The game state has a part this build doesn't know: pencil.",
    );
  });

  it("names the first part it can't read", () => {
    expect(() =>
      readReportedGame({ ...PACKED, seconds: "soon", replay: 0 }),
    ).toThrow("This build can't read seconds in the game state.");
  });
});

describe("reportSummary", () => {
  it("says how a game under way stands", () => {
    expect(reportSummary(reported(PLAYED))).toBe(
      "In play · 0:42 · 44 blank squares · 1 hint",
    );
  });

  it("says a solved puzzle, solved before", () => {
    const game = reported(SOLVED, { seconds: 754, replay: true });

    expect(reportSummary(game)).toBe(
      "Solved · 12:34 · 0 blank squares · 0 hints · solved before",
    );
  });

  it("says Notes mode and the hint showing", () => {
    const game = reported(PLAYED, { notesMode: true, hint: hintFor(PLAYED) });

    expect(reportSummary(game)).toBe(
      "In play · 0:42 · 44 blank squares · 1 hint · Notes on · hint showing",
    );
  });
});

describe("reportState", () => {
  it("packs the whole game, summed up", () => {
    const game = reported(PLAYED);

    expect(reportState(game)).toMatchObject({
      summary: reportSummary(game),
      value: reportedValue(game),
    });
  });

  it("can't shrink a game with no moves to undo", () => {
    expect(reportState(reported(gridFrom(EASY))).trim).toBeUndefined();
  });

  it("shrinks by the moves to undo, one at a time", () => {
    expect(trimOf(reported(PLAYED)).most).toBe(2);
  });

  it("keeps the newest moves, which a saved grid takes", () => {
    const { value, note } = trimOf(reported(PLAYED)).at(1);

    const kept = readReportedGame(value).grid;
    expect(kept.history).toEqual(PLAYED.history.slice(1));
    expect(kept.digits).toEqual(PLAYED.digits);
    expect(note).toBe("1 of 2 undo steps");
  });

  it("can keep no move at all", () => {
    const { value } = trimOf(reported(PLAYED)).at(0);

    const kept = readReportedGame(value).grid;

    expect(kept.history).toEqual([]);
    expect(kept.notes).toEqual(PLAYED.notes);
  });
});
