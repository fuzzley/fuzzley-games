import { TestBed } from "@angular/core/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { paintRoles } from "@fz/style/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { PALETTES } from "../testing/roles";
import {
  type SpecRound,
  playUntilCard,
  provideSpecPlay,
  scriptedRounds,
} from "../testing/spec_play";
import { FIELD_ROLES } from "../view/colors/palette";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";

/** The app rendered, and its game. */
interface RenderedApp {
  readonly game: GameService;
  readonly detectChanges: () => void;
}

/** Renders the app on a fake canvas, its rounds played as a script says, over the specs' levels. */
async function renderApp(
  ...script: readonly SpecRound[]
): Promise<RenderedApp> {
  const { fixture } = await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      ...provideSpecPlay(scriptedRounds(...script)),
    ],
  });
  await fixture.whenStable();
  return {
    game: TestBed.inject(GameService),
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Plays rounds until the level's end, and renders the result or the card. */
function playToEnd({ game, detectChanges }: RenderedApp): void {
  playUntilCard(game);
  detectChanges();
}

describe("AppComponent", () => {
  beforeEach(() => {
    // The board draws its field in the palette's inks, which jsdom has no
    // stylesheet to give it.
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("classic", FIELD_ROLES));
  });

  it("names the game in the heading of the page's main landmark", async () => {
    await renderApp();

    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        level: 1,
        name: "Rickashay",
      }),
    ).toBeInTheDocument();
  });

  it("shows the result over a level lost", async () => {
    const app = await renderApp("lost");

    playToEnd(app);

    expect(
      screen.getByRole("alertdialog", { name: "Game over" }),
    ).toBeVisible();
  });

  it("puts the result away and opens Levels as the result's Choose a level asks", async () => {
    const app = await renderApp("lost");
    playToEnd(app);

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect([
      screen.queryByRole("alertdialog"),
      screen.getByRole("dialog", { name: "Levels" }),
    ]).toEqual([null, expect.anything()]);
  });

  it("lists a level cleared with its stars in Levels", async () => {
    const app = await renderApp("cleared", "lost");
    playToEnd(app);
    app.game.nextLevel();
    playToEnd(app);

    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    expect(
      within(screen.getByRole("dialog", { name: "Levels" })).getByRole(
        "button",
        { name: /^1 First bounce/ },
      ),
    ).toHaveTextContent("2 of 3 stars");
  });

  it("starts a run at the level chosen in Levels, and closes it", async () => {
    const app = await renderApp("lost");
    playToEnd(app);
    await userEvent.click(
      screen.getByRole("button", { name: "Choose a level" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /^1 First bounce/ }),
    );

    expect([
      screen.queryByRole("dialog", { name: "Levels" }),
      app.game.outcome(),
    ]).toEqual([null, "ready"]);
  });

  it("starts a new game from the result once every level is cleared", async () => {
    const app = await renderApp("cleared");
    await app.game.startAt(3);
    playToEnd(app);

    await userEvent.click(screen.getByRole("button", { name: "New game" }));

    expect([screen.queryByRole("alertdialog"), app.game.run().level]).toEqual([
      null,
      3,
    ]);
  });
});
