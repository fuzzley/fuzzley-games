import { lineOf, readCertificates } from "./certificates";

/** A line of two shots, as a file holds it. */
const LINE = [
  [100, 2],
  [656, 0],
];

/** Returns what a file reads as, each level's lines as plain records, for a spec to compare. */
function readAsRecords(
  value: unknown,
): Record<string, Record<number, unknown>> {
  return Object.fromEntries(
    [...readCertificates(value)].map(([id, lines]) => [
      id,
      Object.fromEntries(lines),
    ]),
  );
}

describe("readCertificates", () => {
  it("reads each level's line on each depth, by its id", () => {
    const file = { "hello-wall": { "11": LINE, "22": [[0, 5]] } };

    expect(readAsRecords(file)).toEqual({
      "hello-wall": { 11: LINE, 22: [[0, 5]] },
    });
  });

  it.each([null, [], "certificates", 3])(
    "reads %j as no certificate",
    (file) => {
      expect(readCertificates(file).size).toBe(0);
    },
  );

  it.each(["10", "23", "011", "11.0", "eleven"])(
    "drops a line on a depth no field has, %j",
    (depth) => {
      const file = { "hello-wall": { [depth]: LINE, "12": LINE } };

      expect(readAsRecords(file)).toEqual({ "hello-wall": { 12: LINE } });
    },
  );

  it.each([
    ["empty", []],
    ["not a list", { 0: [100, 2] }],
    ["with an aim past the last", [[657, 2]]],
    ["with an aim between two", [[100.5, 2]]],
    ["with a charge past the most", [[100, 6]]],
    ["with a shot of three numbers", [[100, 2, 1]]],
    ["with a shot of one", [[100]]],
    ["with a shot that is no pair", [{ aim: 100, charge: 2 }]],
  ])("drops a line %s", (_, line) => {
    const file = { "hello-wall": { "11": line, "12": LINE } };

    expect(readAsRecords(file)).toEqual({ "hello-wall": { 12: LINE } });
  });

  it.each([
    ["is a list", LINE],
    ["is nothing", null],
    ["holds no line that reads", { "11": [] }],
  ])("drops a level that %s", (_, lines) => {
    const file = { "hello-wall": lines, stripes: { "11": LINE } };

    expect(readAsRecords(file)).toEqual({ stripes: { 11: LINE } });
  });
});

describe("lineOf", () => {
  const certificates = readCertificates({ "hello-wall": { "14": LINE } });

  it("finds a level's line on a depth", () => {
    expect(lineOf(certificates, "hello-wall", 14)).toEqual(LINE);
  });

  it.each([
    ["a depth it holds none on", "hello-wall", 15],
    ["a level it holds none for", "stripes", 14],
  ])("finds none on %s", (_, id, depth) => {
    expect(lineOf(certificates, id, depth)).toBeNull();
  });
});
