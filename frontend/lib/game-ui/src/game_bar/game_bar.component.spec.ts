import { Component, input } from "@angular/core";
import { render, screen, within } from "@testing-library/angular";
import {
  type BarHome,
  type BarPlacement,
  GameBarComponent,
} from "./game_bar.component";

@Component({
  imports: [GameBarComponent],
  template: `
    <fz-game-bar
      [placement]="placement()"
      [home]="home()"
      [homeHref]="homeHref()"
    >
      <h1 fzBarTitle>Klondike</h1>
      <p fzBarStatus>Score 0</p>
      <button fzBarActions type="button">Undo</button>
      <button fzBarActions type="button">New Game</button>
    </fz-game-bar>
  `,
})
class TestBarHostComponent {
  readonly placement = input<BarPlacement>("top");
  readonly home = input<BarHome>("wordmark");
  readonly homeHref = input("/");
}

describe("GameBarComponent", () => {
  async function renderBar(
    inputs: {
      placement?: BarPlacement;
      home?: BarHome;
      homeHref?: string;
    } = {},
  ): Promise<HTMLElement> {
    const { container } = await render(TestBarHostComponent, { inputs });
    return container.querySelector("fz-game-bar")!;
  }

  function homeLink(): HTMLElement {
    return within(screen.getByRole("banner")).getByRole("link", {
      name: "Fuzzley Games",
    });
  }

  it("is the page's banner", async () => {
    await renderBar();

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("leads with a link home to Fuzzley Games", async () => {
    await renderBar();

    expect(within(screen.getByRole("banner")).getAllByRole("link")[0]).toBe(
      homeLink(),
    );
    expect(homeLink()).toHaveAttribute("href", "/");
  });

  it("shows the wordmark in the link home", async () => {
    await renderBar();

    expect(homeLink()).toHaveTextContent("Fuzzley Games");
  });

  it("shows the home button instead when asked, named as the wordmark is", async () => {
    await renderBar({ home: "icon" });

    expect(homeLink().textContent.trim()).toBe("");
  });

  it("leaves the link home out when asked", async () => {
    await renderBar({ home: "none" });

    expect(
      within(screen.getByRole("banner")).queryByRole("link"),
    ).not.toBeInTheDocument();
  });

  it("leads home wherever the app says", async () => {
    await renderBar({ homeHref: "https://fuzzley.games/" });

    expect(homeLink()).toHaveAttribute("href", "https://fuzzley.games/");
  });

  it("shows the home button on a rail, which has no room for the wordmark", async () => {
    await renderBar({ placement: "start" });

    expect(homeLink().textContent.trim()).toBe("");
  });

  it("holds the title, then the status, then the actions", async () => {
    await renderBar();

    expect(screen.getByRole("banner")).toHaveTextContent(
      /^Fuzzley Games\s*Klondike\s*Score 0\s*Undo\s*New Game$/,
    );
  });

  it.each<BarPlacement>(["top", "bottom", "start", "end"])(
    "stands against the edge it is placed at: %s",
    async (placement) => {
      const bar = await renderBar({ placement });

      expect(bar).toHaveAttribute("data-placement", placement);
    },
  );
});
