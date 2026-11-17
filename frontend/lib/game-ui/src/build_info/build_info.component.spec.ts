import { commitHash } from "@fz/dev/build-info";
import { render, screen } from "@testing-library/angular";
import { BUILD_INFO, type BuildInfo } from "./build_info";
import { BuildInfoComponent } from "./build_info.component";

/** Renders the line for a build, or for none. */
async function renderBuild(build: BuildInfo | null): Promise<HTMLElement> {
  const { container } = await render(BuildInfoComponent, {
    providers: [{ provide: BUILD_INFO, useValue: build }],
  });
  return container;
}

describe("BuildInfoComponent", () => {
  it("says the version is the commit, and the day it was built", async () => {
    const container = await renderBuild({
      commit: "549c93a",
      buildTime: "2031-06-15T09:30:00.000Z",
    });

    expect(container).toHaveTextContent(
      /^Version 549c93a, built June 15, 2031$/,
    );
  });

  it("links the commit to its page on GitHub, in a new tab", async () => {
    await renderBuild({
      commit: "549c93a",
      buildTime: "2031-06-15T09:30:00.000Z",
    });

    const link = screen.getByRole("link", {
      name: "549c93a (opens in a new tab)",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://github.com/fuzzley/fuzzley-games/commit/549c93a",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  // A clock on either side of UTC would name the other day for one of these,
  // as a clock off UTC, such as the one that runs `yarn verify:full` before a
  // merge, does; CI's is on UTC, which neither catches.
  it.each([
    ["2031-06-15T23:30:00.000Z", "June 15, 2031"],
    ["2031-06-16T00:30:00.000Z", "June 16, 2031"],
  ])(
    "names the day in UTC, as the site's footer does: %s is %s",
    async (buildTime, day) => {
      const container = await renderBuild({ commit: "549c93a", buildTime });

      expect(container).toHaveTextContent(`built ${day}`);
    },
  );

  it("names only the day of a build that couldn't tell its commit", async () => {
    const noGit = (): string => {
      throw new Error("not a git repository");
    };
    const container = await renderBuild({
      commit: commitHash({}, noGit),
      buildTime: "2031-06-15T09:30:00.000Z",
    });

    expect(container).toHaveTextContent(/^Built on June 15, 2031$/);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows nothing for a build that wasn't stamped", async () => {
    const container = await renderBuild(null);

    expect(container).toBeEmptyDOMElement();
  });
});
