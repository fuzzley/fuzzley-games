import { render, screen } from "@testing-library/angular";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  it("names the game", async () => {
    await render(AppComponent);

    expect(
      screen.getByRole("heading", { name: "Brick Breaker" }),
    ).toBeInTheDocument();
  });
});
