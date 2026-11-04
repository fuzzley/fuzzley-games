import { render, screen, within } from "@testing-library/angular";
import { HelpCatalogComponent } from "./help_catalog.component";
import { type HelpEntry, helpEntries } from "./help_entries";

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

/** Renders the list of the entries given. */
async function renderCatalog(entries: readonly HelpEntry[]): Promise<void> {
  await render(HelpCatalogComponent, { inputs: { entries } });
}

describe("HelpCatalogComponent", () => {
  it("lists each entry by its name and what it does", async () => {
    await renderCatalog(helpEntries(IDS, kind, undefined));

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent.trim()),
    ).toEqual(["Stone. Breaks in two.", "Ice. Shatters in three."]);
  });

  it("shows no picture an entry has none of", async () => {
    await renderCatalog(helpEntries(IDS, kind, undefined));

    expect(screen.queryAllByRole("presentation")).toHaveLength(0);
  });

  it("shows each picture beside its name, saying nothing itself", async () => {
    await renderCatalog(
      helpEntries(IDS, kind, { stone: "stone.png", ice: "ice.png" }),
    );

    const ice = screen.getByText("Ice.").closest("li");

    expect(ice && within(ice).getByRole("presentation")).toHaveAttribute(
      "src",
      "ice.png",
    );
  });
});
