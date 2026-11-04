import { helpEntries } from "./help_entries";

/** A spec's catalog: two kinds of thing, each with its name and what it does. */
const KINDS = {
  stone: { name: "Stone", about: "Breaks in two." },
  ice: { name: "Ice", about: "Shatters in three." },
} as const;

/** The spec's kinds' ids, in the catalog's order. */
const IDS = ["stone", "ice"] as const;

/** Returns a spec's kind by its id. */
function kind(id: (typeof IDS)[number]): {
  readonly name: string;
  readonly about: string;
} {
  return KINDS[id];
}

describe("helpEntries", () => {
  it("takes each entry's name and words, in the catalog's order", () => {
    expect(helpEntries(IDS, kind, undefined)).toEqual([
      { id: "stone", name: "Stone", about: "Breaks in two.", picture: null },
      { id: "ice", name: "Ice", about: "Shatters in three.", picture: null },
    ]);
  });

  it("gives each entry its picture once there are pictures", () => {
    const pictures = { stone: "stone.png", ice: "ice.png" };

    expect(
      helpEntries(IDS, kind, pictures).map(({ picture }) => picture),
    ).toEqual(["stone.png", "ice.png"]);
  });
});
