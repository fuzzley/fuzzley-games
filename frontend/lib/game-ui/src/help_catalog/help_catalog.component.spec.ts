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

/** Renders a catalog of the entries given under the heading "Kinds", with what to know first, if anything. */
async function renderCatalog(
  entries: readonly HelpEntry[],
  intro: string | null = null,
): Promise<void> {
  await render(HelpCatalogComponent, {
    inputs: { catalog: { id: "kinds", heading: "Kinds", intro, entries } },
  });
}

describe("HelpCatalogComponent", () => {
  it("heads the section it names with its heading", async () => {
    await renderCatalog(helpEntries(IDS, kind, undefined));

    expect(screen.getByRole("region", { name: "Kinds" })).toContainElement(
      screen.getByRole("heading", { level: 3, name: "Kinds" }),
    );
  });

  it("names each catalog's section by its own heading, beside another of the same id", async () => {
    const entries = helpEntries(IDS, kind, undefined);
    await render(
      `<fz-help-catalog [catalog]="hard" /><fz-help-catalog [catalog]="soft" />`,
      {
        imports: [HelpCatalogComponent],
        componentProperties: {
          hard: { id: "kinds", heading: "Hard", intro: null, entries },
          soft: { id: "kinds", heading: "Soft", intro: null, entries },
        },
      },
    );

    expect(screen.getByRole("region", { name: "Hard" })).toHaveTextContent(
      /^Hard/,
    );
    expect(screen.getByRole("region", { name: "Soft" })).toHaveTextContent(
      /^Soft/,
    );
  });

  it("says what to know before its entries", async () => {
    await renderCatalog(helpEntries(IDS, kind, undefined), "All of them melt.");

    expect(
      within(screen.getByRole("region", { name: "Kinds" })).getByRole(
        "paragraph",
      ),
    ).toHaveTextContent("All of them melt.");
  });

  it("says nothing before its entries where there is nothing to know", async () => {
    await renderCatalog(helpEntries(IDS, kind, undefined));

    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

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
