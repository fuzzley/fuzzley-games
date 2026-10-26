import { render, screen } from "@testing-library/angular";
import { SiteFooterComponent } from "./site_footer.component";

describe("SiteFooterComponent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("claims the copyright for the current year", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-06-15"));

    await render(SiteFooterComponent);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2031 Andrey Gavel",
    );
  });

  it("links to the site's source on GitHub, in a new tab", async () => {
    await render(SiteFooterComponent);

    const link = screen.getByRole("link", {
      name: "Source on GitHub (opens in a new tab)",
    });

    expect(link).toHaveAttribute(
      "href",
      "https://github.com/fuzzley/fuzzley-games",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});
