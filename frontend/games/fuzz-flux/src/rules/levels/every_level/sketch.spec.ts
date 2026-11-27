import { SIM_TIMEOUT_MS } from "@fz/core/testing";
import { keptAt, sketchLineOf } from "../../../testing/certificates";
import { designJson } from "../../../testing/design_files";
import { LEVELS } from "../levels";

/** The lines of the design's sketch's certificates, by the level's id and then the deal's seed, each move in the board's frame. */
const SKETCH_CERTIFICATES = designJson("sketch/certificates.json");

describe(
  "every level's certificates, beside the sketch's",
  { timeout: SIM_TIMEOUT_MS },
  () => {
    it.each(LEVELS)(
      "certify each deal of level $number, $data.name, by the sketch's line, each move turned to the board's frame",
      (entry) => {
        const lines = Object.fromEntries(
          entry.data.deals.map((seed) => [
            String(seed),
            sketchLineOf(entry, seed),
          ]),
        );

        expect(lines).toEqual(keptAt(SKETCH_CERTIFICATES, entry.data.id));
      },
    );
  },
);
