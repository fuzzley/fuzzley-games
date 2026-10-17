import { render, screen } from "@testing-library/angular";
import { appConfig } from "../../app.config";
import { AppComponent } from "./app.component";

describe("AppComponent", () => {
  it("shows the site header above the routed page", async () => {
    const { navigate } = await render(AppComponent, {
      providers: appConfig.providers,
    });

    await navigate("/");

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "All games" }),
    ).toBeInTheDocument();
  });
});
