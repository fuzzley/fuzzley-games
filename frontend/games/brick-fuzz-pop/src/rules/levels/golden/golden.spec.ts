// Every round Brick Fuzz Pop's levels' certificates play, and the shots drawn
// at each level's opening, on every depth, flown as they were when
// `yarn golden:flights` wrote golden.json, so a change that moves the rules'
// code holds how every shot plays.

import { GOLDEN_API } from "../../../testing/golden_api";
import { SIM_TIMEOUT_MS } from "../../../testing/timing";
import golden from "./golden.json";

/** Each level's hash on each depth, by the level's id, then by the depth, as golden.json holds them. */
type Hashes = Readonly<Record<string, Readonly<Record<string, string>>>>;

const CERTIFICATES: Hashes = golden.certificates;
const SHOTS: Hashes = golden.shots;

/** What a failure says to look at, rather than to write the file again. */
const LOOK_AGAIN =
  "a change that means to move the code, not to change how a shot plays, flies it as it did, so this is the bug; `yarn golden:flights` writes the file again only for one that means to";

/** Each level of the game as a spec's row: its number and its id. */
const LEVEL_ROWS = GOLDEN_API.levels.map(
  ({ number, data }) => [number, data.id] as const,
);

/** Returns a level's hash on each depth, by the depth, from a hash of a level's number and a depth. */
function onEveryDepth(
  level: number,
  hash: (level: number, depth: number) => string,
): Record<string, string> {
  return Object.fromEntries(
    GOLDEN_API.depths.map((depth) => [String(depth), hash(level, depth)]),
  );
}

describe("the golden flights", { timeout: SIM_TIMEOUT_MS }, () => {
  it("hold every level of the game, and no other", () => {
    const ids = LEVEL_ROWS.map(([, id]) => id).sort();

    expect({
      certificates: Object.keys(CERTIFICATES),
      shots: Object.keys(SHOTS),
    }).toEqual({ certificates: ids, shots: ids });
  });

  it.each(LEVEL_ROWS)(
    "fly level %i, %s, as its certificate did on every depth",
    (number, id) => {
      const flown = onEveryDepth(number, GOLDEN_API.certificateHash);

      expect(
        flown,
        `Level "${id}"'s certificate flies otherwise on the depths whose hashes differ: ${LOOK_AGAIN}.`,
      ).toEqual(CERTIFICATES[id]);
    },
  );

  it.each(LEVEL_ROWS)(
    "fly level %i, %s, as the shots drawn at its opening did on every depth",
    (number, id) => {
      const flown = onEveryDepth(number, GOLDEN_API.shotsHash);

      expect(
        flown,
        `The shots drawn at level "${id}"'s opening fly otherwise on the depths whose hashes differ: ${LOOK_AGAIN}.`,
      ).toEqual(SHOTS[id]);
    },
  );
});
