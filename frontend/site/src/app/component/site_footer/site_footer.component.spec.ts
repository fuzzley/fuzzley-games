import { type RenderResult, render, screen } from "@testing-library/angular";
import type { BuildInfo } from "../../model/build";
import { BUILD_INFO, SiteFooterComponent } from "./site_footer.component";

describe("SiteFooterComponent", () => {
  /** Renders the footer of a build of the given commit, made on 15 June 2031. */
  function renderBuiltFrom(
    commit: string,
  ): Promise<RenderResult<SiteFooterComponent>> {
    const build: BuildInfo = {
      version: "1.0.0",
      commit,
      buildTime: "2031-06-15T23:30:00.000Z",
    };
    return render(SiteFooterComponent, {
      providers: [{ provide: BUILD_INFO, useValue: build }],
    });
  }

  it("claims the copyright for the year of the build", async () => {
    await renderBuiltFrom("5b87385");

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2031 Andrey Gavel",
    );
  });

  it("links the owner's name to fuzzley.info, in a new tab", async () => {
    await renderBuiltFrom("5b87385");

    const link = screen.getByRole("link", {
      name: "Andrey Gavel (opens in a new tab)",
    });

    expect(link).toHaveAttribute("href", "https://fuzzley.info");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("links to the site's source on GitHub, in a new tab", async () => {
    await renderBuiltFrom("5b87385");

    const link = screen.getByRole("link", {
      name: "Source on GitHub (opens in a new tab)",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://github.com/fuzzley/fuzzley-games",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("says which commit the site was built from, and on what day", async () => {
    await renderBuiltFrom("5b87385");

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Built from 5b87385 on June 15, 2031",
    );
  });

  it("links the commit to its page on GitHub, in a new tab", async () => {
    await renderBuiltFrom("5b87385");

    const link = screen.getByRole("link", {
      name: "5b87385 (opens in a new tab)",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://github.com/fuzzley/fuzzley-games/commit/5b87385",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("gives only the day for a build that couldn't tell its commit", async () => {
    await renderBuiltFrom("dev");

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Built on June 15, 2031",
    );
    expect(
      screen.queryByRole("link", { name: /^dev/ }),
    ).not.toBeInTheDocument();
  });
});
