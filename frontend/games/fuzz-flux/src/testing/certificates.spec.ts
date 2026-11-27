import { isRecord } from "@fz/core/json";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { CERTIFICATES, certificateProblem } from "./certificates";

/** Level 1, Three's company, played as the 30th level of a game, so a sentence that named it by its id would show. */
const THIRTIETH: LevelEntry = { ...LEVELS[0]!, number: 30 };

/** A line that clears level 1's deal 1, the sketch's certificate. */
const CLEARING = [
  [34, 35],
  [15, 16],
];

/** Returns certificates that keep only a line for level 1's deal 1, as a file keeps it. */
function keeping(line: unknown): Readonly<Record<string, unknown>> {
  return { "warm-up": { "1": { "1": line } } };
}

/** Returns the keys of a record read from JSON, none for anything else. */
function keysOf(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

/** Returns the seeds certificates keep lines for, by the set's id, then the level's. */
function keptSeeds(
  certificates: Readonly<Record<string, unknown>>,
): Record<string, Record<string, readonly string[]>> {
  return Object.fromEntries(
    Object.entries(certificates).map(([set, levels]) => [
      set,
      Object.fromEntries(
        keysOf(levels).map((level) => [
          level,
          keysOf(isRecord(levels) ? levels[level] : null),
        ]),
      ),
    ]),
  );
}

/** Returns the seeds of levels' deals, by the set's id, then the level's, lowest first, as an object of JSON keeps whole numbers. */
function dealtSeeds(
  levels: readonly LevelEntry[],
): Record<string, Record<string, readonly string[]>> {
  const seeds: Record<string, Record<string, readonly string[]>> = {};
  for (const { set, data } of levels) {
    seeds[set.id] = {
      ...seeds[set.id],
      [data.id]: [...data.deals].sort((a, b) => a - b).map(String),
    };
  }
  return seeds;
}

/** The end of every sentence of a replay that failed. */
const MOVED =
  ": a change to the rules or to the level moved it, and its set is certified again only where that change is meant.";

/** How a sentence of the certificate of level 1, played 30th, on its deal 1, starts. */
const OF_DEAL_1 = "The certificate of level 30, Three's company, on its deal 1";

describe("CERTIFICATES", () => {
  it("keeps a line for every deal of every level the game plays, and for nothing else", () => {
    expect(keptSeeds(CERTIFICATES)).toEqual(dealtSeeds(LEVELS));
  });
});

describe("certificateProblem", () => {
  it("finds nothing wrong with a line that clears the level at its last move", () => {
    expect(certificateProblem(THIRTIETH, 1, keeping(CLEARING))).toBeNull();
  });

  it.each([
    [
      "no set",
      {},
      'The certificates keep no set "warm-up", which level 30, Three\'s company, is in: certify it with `yarn certify:deals --set warm-up`, and its file joins `CERTIFICATES`.',
    ],
    [
      "no line for the level",
      { "warm-up": {} },
      `${OF_DEAL_1} keeps no line: certify its set again with \`yarn certify:deals --set warm-up\`, and where the proof finds none, the deal or the rules are at fault.`,
    ],
    [
      "no line for the deal",
      { "warm-up": { "1": {} } },
      `${OF_DEAL_1} keeps no line: certify its set again with \`yarn certify:deals --set warm-up\`, and where the proof finds none, the deal or the rules are at fault.`,
    ],
    [
      "something other than a move in a line",
      keeping([34, 35]),
      `${OF_DEAL_1} keeps [34,35], not a list of moves, each a pair of squares: certify its set again with \`yarn certify:deals --set warm-up\`, since no one writes its file but the script.`,
    ],
    [
      "something other than a pair of squares in a line",
      keeping([[34, 35.5]]),
      `${OF_DEAL_1} keeps [[34,35.5]], not a list of moves, each a pair of squares: certify its set again with \`yarn certify:deals --set warm-up\`, since no one writes its file but the script.`,
    ],
    [
      "a square off the board",
      keeping([CLEARING[0], [35, 36]]),
      `${OF_DEAL_1} plays a square off the board at its move 2 of 2, 35 to 36${MOVED}`,
    ],
    [
      "a square before the board",
      keeping([[-1, 0]]),
      `${OF_DEAL_1} plays a square off the board at its move 1 of 1, -1 to 0${MOVED}`,
    ],
    [
      "a move the rules refuse",
      keeping([CLEARING[0], [15, 22]]),
      `${OF_DEAL_1} is refused its move 2 of 2, 15 to 22${MOVED}`,
    ],
    [
      "a move after the level is cleared",
      keeping([...CLEARING, [0, 1]]),
      `${OF_DEAL_1} clears the level at its move 2 of 3, 15 to 16${MOVED}`,
    ],
    [
      "too few moves",
      keeping(CLEARING.slice(0, 1)),
      `${OF_DEAL_1} leaves the level in play after its last move${MOVED}`,
    ],
  ])("says what is wrong where the certificates keep %s", (_, kept, says) => {
    expect(certificateProblem(THIRTIETH, 1, kept)).toBe(says);
  });

  it("says where a line runs out of the level's moves before it clears the level", () => {
    const short: LevelEntry = {
      ...THIRTIETH,
      data: { ...THIRTIETH.data, moves: 1 },
    };

    expect(certificateProblem(short, 1, keeping(CLEARING))).toBe(
      `${OF_DEAL_1} runs out of moves at its move 1 of 2, 34 to 35${MOVED}`,
    );
  });
});
