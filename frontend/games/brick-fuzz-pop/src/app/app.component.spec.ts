import { render, screen, within } from "@testing-library/angular";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  it("names the game in the heading of the page's main landmark", async () => {
    await render(AppComponent);

    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        level: 1,
        name: "Brick Fuzz Pop",
      }),
    ).toBeInTheDocument();
  });
});
