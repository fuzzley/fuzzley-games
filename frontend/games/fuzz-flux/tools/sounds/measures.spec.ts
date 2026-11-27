import { designSounds } from "./measures.mjs";

describe("designSounds", () => {
  it("reads each sound's row of the table, what plays it and its measures, and nothing else", () => {
    const table = [
      "| Sound | When it plays | ms | Peak, dBFS | Average, dBFS | Middle of its energy, Hz |",
      "| ----- | ------------- | -- | ---------- | ------------- | ------------------------ |",
      "| `knock-2` | A brick loses a layer. | 410 | -14.0 | -27.3 | 620 |",
    ].join("\n");

    expect(designSounds(table)).toEqual(
      new Map([
        [
          "knock-2",
          {
            when: "A brick loses a layer.",
            ms: 410,
            peak: -14,
            average: -27.3,
            centroid: 620,
          },
        ],
      ]),
    );
  });
});
