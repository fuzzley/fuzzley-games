import { render, screen } from "@testing-library/angular";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  it("names the page with one heading", async () => {
    await render(AppComponent);

    expect(
      screen.getByRole("heading", { level: 1, name: "Minesweeper" }),
    ).toBeInTheDocument();
  });

  it("links home to Fuzzley Games", async () => {
    await render(AppComponent);

    expect(screen.getByRole("link", { name: /Fuzzley Games/ })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
