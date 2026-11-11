import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { recordOf } from "@fz/core/records";
import { installFakeViewport } from "@fz/game-ui/testing";
import {
  CanvasCardsComponent,
  PhaserCanvasComponent,
  type SceneSource,
} from "@fz/phaser/canvas";
import {
  FakePhaserCanvas,
  collectErrors,
  provideFakePhaserCanvas,
} from "@fz/phaser/testing";
import { figures } from "@fz/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { BRICK_KIND_IDS, brickKind } from "../../rules/catalog/bricks";
import type { HelpPictures } from "../help/help.component";
import {
  type BoardCard,
  BoardCardComponent,
  type ClearedCard,
  type EndedCard,
  type ReadyCard,
} from "./board_card.component";

/** Level 3's Ready card, which brings in the tough brick. */
const READY: ReadyCard = {
  kind: "ready",
  level: 3,
  name: "Thicker",
  boon: "hot",
  newKind: "tough",
};

/** A level cleared in 7 rounds of a par of 9, for three stars, with two friends freed. */
const CLEARED: ClearedCard = {
  kind: "cleared",
  level: 3,
  rounds: 7,
  par: 9,
  tally: { bricks: 1840, jumps: 500, stars: 600 },
  score: 12940,
  friends: [3, 5],
};

/** A run lost on level 3. */
const LOST: EndedCard = {
  kind: "ended",
  outcome: "over",
  level: 3,
  name: "Thicker",
  score: 12940,
};

/** A run that cleared the last level. */
const WON: EndedCard = { kind: "ended", outcome: "won", score: 98760 };

/** Returns a picture as the scene encodes one, holding nothing but a name. */
function pictureOf(name: string): string {
  return `data:image/png;base64,${btoa(name)}`;
}

/** Pictures as the scene hands them over, each kind's its own. */
const PICTURES: HelpPictures = {
  bricks: recordOf(BRICK_KIND_IDS, pictureOf),
};

/** What a spec gets back from rendering the card. */
interface RenderedCard {
  readonly user: UserEvent;
  /** The card's element, the layer the board lays over the field. */
  readonly layer: HTMLElement;
  readonly resumeRun: ReturnType<typeof vi.fn>;
  readonly nextLevel: ReturnType<typeof vi.fn>;
  readonly tryAgain: ReturnType<typeof vi.fn>;
  readonly newGame: ReturnType<typeof vi.fn>;
}

/** Renders a card, or none, with the scene's pictures or none, and listens to it. */
async function renderCard(
  card: BoardCard | null,
  pictures: HelpPictures | null = PICTURES,
): Promise<RenderedCard> {
  const resumeRun = vi.fn();
  const nextLevel = vi.fn();
  const tryAgain = vi.fn();
  const newGame = vi.fn();
  const { container } = await render(BoardCardComponent, {
    inputs: { card, pictures },
    on: { resumeRun, nextLevel, tryAgain, newGame },
  });
  return {
    user: userEvent.setup(),
    layer: container,
    resumeRun,
    nextLevel,
    tryAgain,
    newGame,
  };
}

/** Returns an element's text as it reads, as one line. */
function textOf(element: Element): string {
  return element.textContent.replace(/\s+/g, " ").trim();
}

/** Returns the paragraph that reads a text whole, its emphasis among it. */
function paragraph(text: string): HTMLElement {
  return screen.getByText(
    (_, element) => element?.tagName === "P" && textOf(element) === text,
  );
}

/** The scene the canvas is shown, which the fake host never loads. */
const SCENE: SceneSource = () => Promise.reject(new Error("never loaded"));

@Component({
  imports: [BoardCardComponent, CanvasCardsComponent, PhaserCanvasComponent],
  template: `
    <fz-phaser-canvas
      #canvas
      [scene]="scene"
      [options]="{ title: 'Brick Fuzz Pop', background: 'transparent' }"
    />
    <app-board-card [card]="card()" [restoring]="restoring()">
      <fz-canvas-cards [canvas]="canvas" />
    </app-board-card>
  `,
})
class TestBoardComponent {
  readonly scene = SCENE;
  readonly card = input.required<BoardCard | null>();
  readonly restoring = input(false);
}

/** Two cards on one page, to see each named by its own title. */
@Component({
  imports: [BoardCardComponent],
  template: `
    <app-board-card [card]="ready" />
    <app-board-card [card]="paused" />
  `,
})
class TwoCardsComponent {
  readonly ready = READY;
  readonly paused: BoardCard = { kind: "paused", score: 0 };
}

describe("BoardCardComponent", () => {
  it("shows nothing with no card to show", async () => {
    const { layer } = await renderCard(null);

    expect(textOf(layer)).toBe("");
  });

  describe("Ready", () => {
    it("names the level", async () => {
      await renderCard(READY);

      expect(screen.getByText("Level 3: Thicker")).toBeInTheDocument();
    });

    it("says what the level's jumps earn", async () => {
      await renderCard(READY);

      expect(
        screen.getByText(
          "Clear to the dashed line and the wall jumps: your next shot is a hot shot.",
        ),
      ).toBeInTheDocument();
    });

    it("says a level's jumps earn its own boon", async () => {
      await renderCard({ ...READY, boon: "triple" });

      expect(
        screen.getByText(
          "Clear to the dashed line and the wall jumps: your next shot is a triple shot.",
        ),
      ).toBeInTheDocument();
    });

    it("names the kind of brick the level brings in, and what it does", async () => {
      await renderCard(READY);

      expect(
        paragraph(
          `New: ${brickKind("tough").name}. ${brickKind("tough").about}`,
        ),
      ).toBeInTheDocument();
    });

    it("shows the new kind's picture once the scene has drawn it", async () => {
      await renderCard(READY);

      expect(screen.getByRole("presentation")).toHaveAttribute(
        "src",
        pictureOf("tough"),
      );
    });

    it("shows no picture before the scene has drawn", async () => {
      await renderCard(READY, null);

      expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    });

    it("says nothing new for a level that brings in no kind", async () => {
      const { layer } = await renderCard({ ...READY, newKind: null });

      expect(textOf(layer)).not.toContain("New:");
    });

    it("offers no button, as the first move starts the level", async () => {
      await renderCard(READY);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("says the game is larger upright on a phone on its side", async () => {
      installFakeViewport(844, 390);

      await renderCard(READY);

      expect(
        screen.getByText("The game is larger upright."),
      ).toBeInTheDocument();
    });

    it.each([
      ["a phone held upright", 390, 844],
      ["a roomy screen", 1280, 800],
    ])("says nothing of turning %s", async (_, width, height) => {
      installFakeViewport(width, height);

      const { layer } = await renderCard(READY);

      expect(textOf(layer)).not.toContain("upright");
    });
  });

  describe("Paused", () => {
    it("says the level is paused", async () => {
      await renderCard({ kind: "paused", score: 12940 });

      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("gives the score, grouped in thousands", async () => {
      await renderCard({ kind: "paused", score: 12940 });

      expect(screen.getByText("Score 12,940")).toBeInTheDocument();
    });

    it("goes on at Resume", async () => {
      const { user, resumeRun } = await renderCard({
        kind: "paused",
        score: 0,
      });

      await user.click(screen.getByRole("button", { name: "Resume" }));

      expect(resumeRun).toHaveBeenCalledOnce();
    });
  });

  describe("Cleared", () => {
    it("names the level cleared", async () => {
      await renderCard(CLEARED);

      expect(screen.getByText("Level 3 cleared")).toBeInTheDocument();
    });

    it("draws a star for each earned, and says how many", async () => {
      const { layer } = await renderCard({ ...CLEARED, rounds: 11 });

      const stars = within(layer).getByText("2 of 3 stars").parentElement;

      expect(stars?.querySelectorAll("fz-icon")).toHaveLength(2);
    });

    it("says the rounds it took against its par", async () => {
      await renderCard(CLEARED);

      expect(screen.getByText("7 rounds, par 9")).toBeInTheDocument();
    });

    it("adds up its points, each part grouped in thousands", async () => {
      const { layer } = await renderCard(CLEARED);

      expect(figures(layer)).toEqual([
        ["Bricks", "1,840"],
        ["Jumps", "500"],
        ["Stars", "600"],
      ]);
    });

    it("gives the score", async () => {
      await renderCard(CLEARED);

      expect(screen.getByText("Score 12,940")).toBeInTheDocument();
    });

    it("lines the crew up, and says how many friends were freed", async () => {
      const { layer } = await renderCard(CLEARED);

      const line = within(layer).getByText("2 friends freed");

      expect(line.querySelectorAll("fz-fuzzball")).toHaveLength(3);
    });

    it("says nothing of friends where none were freed", async () => {
      const { layer } = await renderCard({ ...CLEARED, friends: [] });

      expect(textOf(layer)).not.toContain("freed");
    });

    it("goes on to the next level", async () => {
      const { user, nextLevel } = await renderCard(CLEARED);

      await user.click(screen.getByRole("button", { name: "Next level" }));

      expect(nextLevel).toHaveBeenCalledOnce();
    });
  });

  describe("Ended, a level lost", () => {
    it("says the game is over", async () => {
      await renderCard(LOST);

      expect(screen.getByText("Game over")).toBeInTheDocument();
    });

    it("says where it was lost", async () => {
      await renderCard(LOST);

      expect(screen.getByText("Lost on level 3, Thicker")).toBeInTheDocument();
    });

    it("shows no trophy", async () => {
      const { layer } = await renderCard(LOST);

      expect(layer.querySelector('fz-icon[name="trophy"]')).toBeNull();
    });

    it("offers the lost level again, and no new game", async () => {
      await renderCard(LOST);

      expect(
        screen
          .getAllByRole("button")
          .map((button) => button.textContent.trim()),
      ).toEqual(["Try again from level 3"]);
    });

    it("tries the lost level again", async () => {
      const { user, tryAgain, newGame } = await renderCard(LOST);

      await user.click(
        screen.getByRole("button", { name: "Try again from level 3" }),
      );

      expect({
        triedAgain: tryAgain.mock.calls.length,
        newGames: newGame.mock.calls.length,
      }).toEqual({ triedAgain: 1, newGames: 0 });
    });
  });

  describe("Ended, the last level cleared", () => {
    it("says every level is cleared", async () => {
      await renderCard(WON);

      expect(screen.getByText("Every level cleared!")).toBeInTheDocument();
    });

    it("says nothing of a level lost", async () => {
      await renderCard(WON);

      expect(screen.queryByText(/^Lost on/)).not.toBeInTheDocument();
    });

    it("shows the trophy", async () => {
      const { layer } = await renderCard(WON);

      expect(layer.querySelector('fz-icon[name="trophy"]')).not.toBeNull();
    });

    it("offers a new game, and no try at the last level", async () => {
      await renderCard(WON);

      expect(
        screen
          .getAllByRole("button")
          .map((button) => button.textContent.trim()),
      ).toEqual(["New game"]);
    });

    it("starts a new game", async () => {
      const { user, tryAgain, newGame } = await renderCard(WON);

      await user.click(screen.getByRole("button", { name: "New game" }));

      expect({
        triedAgain: tryAgain.mock.calls.length,
        newGames: newGame.mock.calls.length,
      }).toEqual({ triedAgain: 0, newGames: 1 });
    });
  });

  describe("Restoring the board", () => {
    it("says the board is being restored, and the game waits till it is back", async () => {
      await render(BoardCardComponent, {
        inputs: { card: null, restoring: true },
      });

      expect(
        within(
          screen.getByRole("group", { name: "Restoring the board" }),
        ).getByText("The game waits until it is back."),
      ).toBeInTheDocument();
    });

    it("shows in place of the card handed", async () => {
      await render(BoardCardComponent, {
        inputs: { card: { kind: "paused", score: 0 }, restoring: true },
      });

      expect(screen.getByRole("group")).toHaveAccessibleName(
        "Restoring the board",
      );
    });

    it("leaves the card handed once the board is back", async () => {
      const { fixture } = await render(BoardCardComponent, {
        inputs: { card: { kind: "paused", score: 0 }, restoring: true },
      });

      fixture.componentRef.setInput("restoring", false);
      fixture.detectChanges();

      expect(screen.getByRole("group")).toHaveAccessibleName("Paused");
    });
  });

  it.each([
    ["Ready", READY, "Level 3: Thicker"],
    ["Paused", { kind: "paused", score: 0 }, "Paused"],
    ["Cleared", CLEARED, "Level 3 cleared"],
    ["Ended, a level lost,", LOST, "Game over"],
    ["Ended, the last level cleared,", WON, "Every level cleared!"],
  ] as const)(
    "makes the %s card a group, named by its title, which heads it",
    async (_, card, title) => {
      await renderCard(card);

      expect(
        within(screen.getByRole("group", { name: title })).getByRole(
          "heading",
          { level: 2, name: title },
        ),
      ).toBeInTheDocument();
    },
  );

  it("names each card on a page by its own title", async () => {
    await render(TwoCardsComponent);

    expect(screen.getByRole("group", { name: "Paused" })).toContainElement(
      screen.getByRole("button", { name: "Resume" }),
    );
  });

  it.each([
    ["a level lost", LOST, "Score 12,940"],
    ["the last level cleared", WON, "Score 98,760"],
  ])(
    "gives the score of a run ended by %s, grouped in thousands",
    async (_, card, score) => {
      await renderCard(card);

      expect(screen.getByText(score)).toBeInTheDocument();
    },
  );

  it.each([
    ["Resume", { kind: "paused", score: 0 }],
    ["Next level", CLEARED],
    ["Try again from level 3", LOST],
    ["New game", WON],
  ] as const)(
    "keeps the keys on %s from the board around it, which would steer the shot",
    async (name, card) => {
      const { layer } = await renderCard(card);
      const heard = vi.fn();
      layer.addEventListener("keydown", heard);

      fireEvent.keyDown(screen.getByRole("button", { name }), {
        code: "Space",
        key: " ",
      });

      expect(heard).not.toHaveBeenCalled();
    },
  );

  it("shows the canvas's card in place of its own, as the app's error handler is told why", async () => {
    const errors = collectErrors();
    const { fixture } = await render(TestBoardComponent, {
      inputs: { card: { kind: "paused", score: 0 } },
      providers: [provideFakePhaserCanvas({ readyAtOnce: false })],
    });

    TestBed.inject(FakePhaserCanvas).host.latest.fail();
    await Promise.resolve();
    fixture.detectChanges();

    expect({
      couldNotDraw: screen
        .getByRole("alert")
        .textContent.includes("The board couldn't be drawn"),
      paused: screen.queryByText("Paused"),
      errors,
    }).toEqual({
      couldNotDraw: true,
      paused: null,
      errors: [new Error("The scene couldn't be loaded")],
    });
  });

  it("shows the canvas's card in place of the restoring one", async () => {
    collectErrors();
    const { fixture } = await render(TestBoardComponent, {
      inputs: { card: null, restoring: true },
      providers: [provideFakePhaserCanvas({ readyAtOnce: false })],
    });

    TestBed.inject(FakePhaserCanvas).host.latest.fail();
    await Promise.resolve();
    fixture.detectChanges();

    expect({
      couldNotDraw: screen
        .getByRole("alert")
        .textContent.includes("The board couldn't be drawn"),
      restoring: screen.queryByText("Restoring the board"),
    }).toEqual({ couldNotDraw: true, restoring: null });
  });
});
