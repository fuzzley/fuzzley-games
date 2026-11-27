// The design's table of its sounds (docs/fuzz-flux/sound/measures.md), read:
// what plays each, and the measures the spec holds each of the game's to,
// for the spec in Node and the sound lab in a page alike.

/**
 * A sound as the design's table gives it.
 *
 * @typedef {object} DesignSound
 * @property {string} when What plays it in the game, in a sentence or two.
 * @property {number} ms Its length, in milliseconds.
 * @property {number} peak Its loudest sample, in dB below full scale.
 * @property {number} average Its level over its whole length, in dB below full scale.
 * @property {number} centroid Where its energy centers, in Hz.
 */

/** A row of the table: a sound's name, what plays it and its four measures. */
const ROW =
  /^\| `([\w-]+)` \| ([^|]+) \| (\d+) \| (-?[\d.]+) \| (-?[\d.]+) \| (\d+) \|$/;

/**
 * Returns the sounds of the design's table, by name, from its text.
 *
 * @param {string} table
 * @returns {ReadonlyMap<string, DesignSound>}
 */
export function designSounds(table) {
  return new Map(
    table.split("\n").flatMap((line) => {
      const row = ROW.exec(line);
      if (row === null) return [];
      const [, name = "", when = "", ms, peak, average, centroid] = row;
      return [
        [
          name,
          {
            when,
            ms: Number(ms),
            peak: Number(peak),
            average: Number(average),
            centroid: Number(centroid),
          },
        ],
      ];
    }),
  );
}
