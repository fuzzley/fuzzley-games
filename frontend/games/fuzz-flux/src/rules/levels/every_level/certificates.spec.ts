import { SIM_TIMEOUT_MS } from "@fz/core/testing";
import { certificateProblem } from "../../../testing/certificates";
import { LEVELS } from "../levels";

describe("every level's certificates", { timeout: SIM_TIMEOUT_MS }, () => {
  it.each(LEVELS)(
    "clear level $number, $data.name, on each of its deals in its moves",
    (entry) => {
      const problems = entry.data.deals
        .map((seed) => certificateProblem(entry, seed))
        .filter((problem) => problem !== null);

      expect(problems).toEqual([]);
    },
  );
});
