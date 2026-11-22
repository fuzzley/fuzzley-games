import { LEVELS } from "../rules/levels/levels";
import { CERTIFICATES, certificateOf } from "./every_level";
import { certificateLine } from "./golden_api";

const [FIRST] = LEVELS;

/** Every set's certificates, with only the first level's line on 11 deep, as given. */
function certificatesWith(
  line: readonly (readonly number[])[],
): Parameters<typeof certificateLine>[0] {
  return { [FIRST!.set.id]: { [FIRST!.data.id]: { "11": line } } };
}

describe("certificateLine", () => {
  it("reads a level's certificate on a depth as the replays read it", () => {
    expect(certificateLine(CERTIFICATES, FIRST!, 14)).toEqual(
      certificateOf(FIRST!, 14),
    );
  });

  it("names the level, the depth and the set where its set's certificates have none", () => {
    expect(() => certificateLine(certificatesWith([]), FIRST!, 12)).toThrow(
      `Level "${FIRST!.data.id}" has no certificate on a field 12 deep: is its set "${FIRST!.set.id}" in golden_api.ts's CERTIFICATES?`,
    );
  });

  it.each([[[[288]]], [[[288, 3, 1]]]])(
    "throws for a shot that isn't a pair, as %j",
    (line) => {
      expect(() => certificateLine(certificatesWith(line), FIRST!, 11)).toThrow(
        "A certificate's shot is an aim and a charge",
      );
    },
  );
});
