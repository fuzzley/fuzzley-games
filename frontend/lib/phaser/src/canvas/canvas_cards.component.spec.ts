import { DOCUMENT } from "@angular/common";
import { Component } from "@angular/core";
import { By } from "@angular/platform-browser";
import {
  fireEvent,
  isInaccessible,
  render,
  screen,
} from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import type { HostOptions } from "../host";
import {
  FakePhaserCanvas,
  type FakeCanvasHost,
  collectErrors,
  provideFakePhaserCanvas,
} from "../testing";
import { CanvasCardsComponent, canvasCardOf } from "./canvas_cards.component";
import type { SceneSource } from "./canvas_host";
import { PhaserCanvasComponent } from "./phaser_canvas.component";

/** The scene the canvas is shown, which the fake host never calls. */
const SCENE: SceneSource = () => Promise.reject(new Error("never loaded"));

const OPTIONS: HostOptions = { title: "Snake", background: "transparent" };

/** What the fake host fails a scene with. */
const FAILED = new Error("The scene couldn't be loaded");

/** Space as a browser sends it. */
const SPACE = { key: " ", code: "Space", keyCode: 32 } as const;

/** What the slow card says, in the status region, as one line. */
const STILL_LOADING =
  "Still loading the board. It can take a while on a slow connection.";

@Component({
  imports: [CanvasCardsComponent, PhaserCanvasComponent],
  template: `
    <div role="application" aria-label="Board" tabindex="0">
      <fz-phaser-canvas #canvas [scene]="scene" [options]="options" />
      <fz-canvas-cards [canvas]="canvas" />
    </div>
  `,
})
class TestBoardComponent {
  readonly scene = SCENE;
  readonly options = OPTIONS;
}

/** A board's canvas and its cards, rendered in a spec, and the fake host the canvas made. */
interface RenderedCards {
  readonly canvas: PhaserCanvasComponent;
  readonly cards: CanvasCardsComponent;
  readonly host: FakeCanvasHost;
  /** What the app's error handler was handed. */
  readonly errors: readonly unknown[];
  /** Called as the cards reload their page. */
  readonly reload: ReturnType<typeof vi.fn>;
  /** Has the canvas go eight seconds without drawing, so it is slow. */
  readonly beSlow: () => Promise<void>;
  /** Lets what the fake host settled reach the page. */
  readonly settle: () => Promise<void>;
}

/**
 * Renders a canvas whose scene waits to be told it is ready, with its cards
 * beside it, as a board places them, in a page whose reload a spec reads,
 * since jsdom's can't be.
 */
async function renderCards(): Promise<RenderedCards> {
  const errors = collectErrors();
  const reload = vi.fn();
  const { fixture } = await render(TestBoardComponent, {
    providers: [provideFakePhaserCanvas({ readyAtOnce: false })],
    configureTestBed: (testBed) => {
      testBed.overrideComponent(CanvasCardsComponent, {
        add: {
          providers: [
            {
              provide: DOCUMENT,
              useValue: { defaultView: { location: { reload } } },
            },
          ],
        },
      });
    },
  });
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return {
    canvas: fixture.debugElement.query(By.directive(PhaserCanvasComponent))
      .componentInstance as PhaserCanvasComponent,
    cards: fixture.debugElement.query(By.directive(CanvasCardsComponent))
      .componentInstance as CanvasCardsComponent,
    host: fixture.debugElement.injector.get(FakePhaserCanvas).host,
    errors,
    reload,
    beSlow: async () => {
      vi.advanceTimersByTime(8_000);
      await settle();
    },
    settle,
  };
}

/** Renders the cards with the canvas's scene failed. */
async function renderFailed(): Promise<RenderedCards> {
  const rendered = await renderCards();
  rendered.host.latest.fail();
  await rendered.settle();
  return rendered;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("canvasCardOf", () => {
  it("names none while the scene loads", async () => {
    const { canvas } = await renderCards();

    expect(canvasCardOf(canvas)).toBeNull();
  });

  it("names the slow one once the canvas is slow", async () => {
    const { canvas, beSlow } = await renderCards();

    await beSlow();

    expect(canvasCardOf(canvas)).toBe("slow");
  });

  it("names the failed one once the scene couldn't be drawn", async () => {
    const { canvas } = await renderFailed();

    expect(canvasCardOf(canvas)).toBe("failed");
  });

  it("names none once the slow scene draws", async () => {
    const { canvas, host, errors, beSlow, settle } = await renderCards();
    await beSlow();

    host.latest.ready();
    await settle();

    expect(canvasCardOf(canvas)).toBeNull();
    expect(errors).toEqual([]);
  });
});

describe("CanvasCardsComponent", () => {
  describe("its card", () => {
    it("is none while the scene loads", async () => {
      const { cards } = await renderCards();

      expect(cards.card()).toBeNull();
    });

    it("is the slow one once the canvas is slow", async () => {
      const { cards, beSlow } = await renderCards();

      await beSlow();

      expect(cards.card()).toBe("slow");
    });

    it("is the failed one once the scene couldn't be drawn", async () => {
      const { cards } = await renderFailed();

      expect(cards.card()).toBe("failed");
    });
  });

  describe("while the board loads", () => {
    it("shows no card before the board is slow", async () => {
      await renderCards();

      expect(screen.queryByText("Still loading the board")).toBeNull();
    });

    it("keeps a status region in the page, empty until the board is slow", async () => {
      await renderCards();

      expect(screen.getByRole("status")).toHaveTextContent(/^$/);
    });

    it("says in that region the board is still loading, once it is slow", async () => {
      const { beSlow } = await renderCards();
      const region = screen.getByRole("status");

      await beSlow();

      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent(STILL_LOADING);
    });

    it("shows the Still loading card once it is slow, offering nothing to press", async () => {
      const { errors, beSlow } = await renderCards();

      await beSlow();

      expect(screen.getByText("Still loading the board")).toBeVisible();
      expect(
        screen.getByText("It can take a while on a slow connection."),
      ).toBeVisible();
      expect(screen.queryAllByRole("button", { hidden: true })).toEqual([]);
      expect(errors).toEqual([]);
    });

    it("hides the card from assistive technology, which reads its words in the region", async () => {
      const { beSlow } = await renderCards();

      await beSlow();

      expect(isInaccessible(screen.getByText("Still loading the board"))).toBe(
        true,
      );
    });

    it.each<[string, (host: FakeCanvasHost) => void]>([
      [
        "drawn",
        (host) => {
          host.latest.ready();
        },
      ],
      [
        "given up on",
        (host) => {
          host.latest.fail();
        },
      ],
    ])(
      "empties the region and puts the card away once the slow board is %s",
      async (_, settleScene) => {
        const { host, beSlow, settle } = await renderCards();
        await beSlow();

        settleScene(host);
        await settle();

        expect(screen.getByRole("status")).toHaveTextContent(/^$/);
        expect(screen.queryByText("Still loading the board")).toBeNull();
      },
    );
  });

  describe("once the board couldn't be drawn", () => {
    it("says so in an alert, offering to reload, as the app's error handler is told why", async () => {
      const { errors } = await renderFailed();

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("The board couldn't be drawn");
      expect(alert).toHaveTextContent("Reloading the page may help.");
      expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
      expect(errors).toEqual([FAILED]);
    });

    it("reloads the page as Reload is pressed", async () => {
      const { reload } = await renderFailed();
      const user = userEvent.setup({
        advanceTimers: (ms) => vi.advanceTimersByTime(ms),
      });

      await user.click(screen.getByRole("button", { name: "Reload" }));

      expect(reload).toHaveBeenCalledOnce();
    });

    it("keeps the keys on Reload from the board around it, which would hand them to the scene", async () => {
      await renderFailed();
      const board = screen.getByRole("application", { name: "Board" });
      const heard = vi.fn();
      board.addEventListener("keydown", heard);
      board.addEventListener("keyup", heard);
      const button = screen.getByRole("button", { name: "Reload" });

      fireEvent.keyDown(button, SPACE);
      fireEvent.keyUp(button, SPACE);

      expect(heard).not.toHaveBeenCalled();
    });
  });

  it.each<[string, (rendered: RenderedCards) => Promise<void>]>([
    ["the board is slow", ({ beSlow }) => beSlow()],
    [
      "the board couldn't be drawn",
      async ({ host, settle }) => {
        host.latest.fail();
        await settle();
      },
    ],
  ])("leaves the focus on the board as it says %s", async (_, act) => {
    const rendered = await renderCards();
    const board = screen.getByRole("application", { name: "Board" });
    board.focus();

    await act(rendered);

    expect(board).toHaveFocus();
  });
});
