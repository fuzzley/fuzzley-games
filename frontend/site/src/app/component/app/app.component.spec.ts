import { render, screen } from "@testing-library/angular";
import { appConfig } from "../../app.config";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  it("shows the site header and footer around the routed page", async () => {
    const { navigate } = await render(AppComponent, {
      providers: appConfig.providers,
    });

    await navigate("/");

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "All games" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("announces through a live region every page shares", async () => {
    const { navigate } = await render(AppComponent, {
      providers: appConfig.providers,
    });

    await navigate("/?q=no-such-game");

    expect(
      screen.getByText("No games match.", {
        selector: '[aria-live="polite"]',
      }),
    ).toBeInTheDocument();
  });
});
