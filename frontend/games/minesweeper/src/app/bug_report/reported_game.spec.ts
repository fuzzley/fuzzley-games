import { packState, unpackState } from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { DEFAULT_CUSTOM } from "../../rules/difficulty";
import { type Field, createField } from "../../rules/field";
import { fieldFrom } from "../../testing/field_picture";
import {
  REPORT_TAG,
  type ReportedGame,
  readReportedGame,
  reportSummary,
  reportedValue,
} from "./reported_game";

/** A game under way: 2 mines, 1 square of ground and 2 numbers open. */
const IN_PLAY = ["*1_", ".21", "..*"];

/** The game of IN_PLAY lost on its last life, both mines stepped on. */
const LOST = ["x1_", ".21", "..x"];

/** A game won: every square but the mine's open. */
const WON = ["*1_", "11_", "___"];

/** Returns a reported game on a field, 42 seconds in, at the defaults. */
function reported(
  field: Field,
  change: Partial<ReportedGame> = {},
): ReportedGame {
  return {
    field,
    difficulty: "medium",
    seconds: 42,
    flagMode: false,
    lives: 3,
    custom: DEFAULT_CUSTOM,
    turned: false,
    scroll: { left: 0, top: 0 },
    ...change,
  };
}

/** A game under way as it is packed, for a spec to spoil one part of. */
const PACKED = reportedValue(reported(fieldFrom(IN_PLAY)));

describe("readReportedGame", () => {
  installCompressionStreams();

  it.each<[string, Field]>([
    ["not yet started", createField({ rows: 9, cols: 9, mines: 10 }, 3, 77)],
    ["under way", fieldFrom(IN_PLAY)],
    ["won", fieldFrom(WON)],
    ["lost", fieldFrom(LOST, { lives: 2 })],
  ])("reads back a game %s as it was packed", async (_, field) => {
    const game = reported(field, {
      difficulty: "custom",
      seconds: 3725,
      flagMode: true,
      lives: 5,
      custom: { rows: 5, cols: 8, mines: 12 },
      turned: true,
      scroll: { left: 120, top: 48 },
    });

    const text = await packState(REPORT_TAG, reportedValue(game));

    expect(readReportedGame(await unpackState(REPORT_TAG, text))).toEqual(game);
  });

  it("can't read a state that isn't an object", () => {
    expect(() => readReportedGame([PACKED])).toThrow(
      "This build can't read the game state.",
    );
  });

  it.each<[string, string, object]>([
    [
      "field",
      "holds squares it can't read",
      { field: { ...PACKED.field, squares: "rr" } },
    ],
    ["difficulty", "is no difficulty", { difficulty: "expert" }],
    ["seconds", "is below 0", { seconds: -1 }],
    ["flagMode", "isn't a yes or a no", { flagMode: "on" }],
    ["lives", "gives more lives than a game can have", { lives: 6 }],
    ["custom", "holds no size", { custom: null }],
    [
      "custom",
      "counts half a column",
      { custom: { rows: 5, cols: 8.5, mines: 12 } },
    ],
    [
      "custom",
      "is taller than a field can be",
      { custom: { rows: 31, cols: 5, mines: 1 } },
    ],
    ["turned", "isn't a yes or a no", { turned: 1 }],
    ["scroll", "holds no scroll", { scroll: null }],
    ["scroll", "scrolls part of a pixel", { scroll: { left: 1.5, top: 0 } }],
  ])("names the state's %s where it %s", (part, _, change) => {
    expect(() => readReportedGame({ ...PACKED, ...change })).toThrow(
      `This build can't read ${part} in the game state.`,
    );
  });

  it("names a part it doesn't know", () => {
    expect(() => readReportedGame({ ...PACKED, speed: "fast" })).toThrow(
      "The game state has a part this build doesn't know: speed.",
    );
  });

  it("names the first part it can't read", () => {
    expect(() =>
      readReportedGame({ ...PACKED, seconds: "soon", lives: 0 }),
    ).toThrow("This build can't read seconds in the game state.");
  });
});

describe("reportSummary", () => {
  it("says how a game under way stands", () => {
    expect(reportSummary(reported(fieldFrom(IN_PLAY)))).toBe(
      "In play · 0:42 · 3 of 3 lives · 2 mines left",
    );
  });

  it("says a game not yet started", () => {
    const field = createField({ rows: 9, cols: 9, mines: 10 }, 1, 77);

    expect(reportSummary(reported(field, { seconds: 0 }))).toBe(
      "Not started · 0:00 · 1 of 1 life · 10 mines left",
    );
  });

  it("says a game won", () => {
    expect(reportSummary(reported(fieldFrom(WON), { seconds: 75 }))).toBe(
      "Won · 1:15 · 3 of 3 lives · 1 mine left",
    );
  });

  it("says a game lost, in Flag mode, on a turned board", () => {
    const game = reported(fieldFrom(LOST, { lives: 2 }), {
      flagMode: true,
      turned: true,
    });

    expect(reportSummary(game)).toBe(
      "Lost · 0:42 · 0 of 2 lives · 0 mines left · Flag mode on · board turned",
    );
  });
});
