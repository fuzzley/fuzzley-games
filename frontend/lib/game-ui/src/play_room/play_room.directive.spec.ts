import { Component } from "@angular/core";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type FakeViewport, installFakeViewport } from "../testing";
import { type AwayReason, PlayRoomDirective } from "./play_room.directive";

@Component({
  imports: [PlayRoomDirective],
  template: `
    <div fzPlayRoom (away)="reasons.push($event)">
      <div role="application" aria-label="Board" tabindex="0"></div>
      <p>Beside the board</p>
      <button type="button">Up</button>
    </div>
    <p>Score 10</p>
    <button type="button">Settings</button>
  `,
})
class TestRoomHostComponent {
  readonly reasons: AwayReason[] = [];
}

/** Shows the page as in sight or hidden, and says so as a browser does. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Lets the queries' changes reach the signals and their effects. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("PlayRoomDirective", () => {
  let viewport: FakeViewport | null = null;

  beforeEach(() => {
    viewport = installFakeViewport(390, 844);
  });

  afterEach(() => {
    viewport?.restore();
    viewport = null;
    Reflect.deleteProperty(document, "visibilityState");
  });

  /** Renders a room with the board in it focused. */
  async function renderRoom(): Promise<{
    user: UserEvent;
    reasons: AwayReason[];
    board: HTMLElement;
  }> {
    const { fixture } = await render(TestRoomHostComponent);
    const board = screen.getByRole("application");
    board.focus();
    return {
      user: userEvent.setup(),
      reasons: fixture.componentInstance.reasons,
      board,
    };
  }

  describe("the focus", () => {
    it("is away once it leaves the room for the page around it", async () => {
      const { user, reasons } = await renderRoom();

      await user.tab();
      await user.tab();

      expect(reasons).toEqual(["focus"]);
    });

    it("is away once it leaves for another window", async () => {
      const { reasons, board } = await renderRoom();

      board.blur();

      expect(reasons).toEqual(["focus"]);
    });

    it("stays while it moves within the room", async () => {
      const { user, reasons } = await renderRoom();

      await user.tab();

      expect(reasons).toEqual([]);
    });
  });

  describe("the page", () => {
    it("is away as it goes out of sight", async () => {
      const { reasons } = await renderRoom();

      setVisibility("hidden");

      expect(reasons).toEqual(["hidden"]);
    });

    it("isn't as it comes back into sight", async () => {
      const { reasons } = await renderRoom();

      setVisibility("visible");

      expect(reasons).toEqual([]);
    });
  });

  describe("the screen", () => {
    it("is away as it turns on its side", async () => {
      const { reasons } = await renderRoom();

      viewport?.setSize(844, 390);
      await settle();

      expect(reasons).toEqual(["turned"]);
    });

    it("is away as it turns back upright", async () => {
      viewport?.setSize(844, 390);
      const { reasons } = await renderRoom();

      viewport?.setSize(390, 844);
      await settle();

      expect(reasons).toEqual(["turned"]);
    });

    it("isn't through a change of size that doesn't turn it", async () => {
      const { reasons } = await renderRoom();

      viewport?.setSize(390, 664);
      await settle();

      expect(reasons).toEqual([]);
    });
  });

  describe("a press", () => {
    it("keeps the focus in the room when it lands outside on what can't take it", async () => {
      const { user, board } = await renderRoom();

      await user.click(screen.getByText("Score 10"));

      expect(board).toHaveFocus();
    });

    it("keeps the focus in the room when it lands inside on what can't take it", async () => {
      const { user, board } = await renderRoom();

      await user.click(screen.getByText("Beside the board"));

      expect(board).toHaveFocus();
    });

    it("lets a control take the focus", async () => {
      const { user } = await renderRoom();
      const settings = screen.getByRole("button", { name: "Settings" });

      await user.click(settings);

      expect(settings).toHaveFocus();
    });

    it("leaves the focus alone while it is outside the room", async () => {
      const { user } = await renderRoom();
      await user.click(screen.getByRole("button", { name: "Settings" }));

      await user.click(screen.getByText("Score 10"));

      expect(document.body).toHaveFocus();
    });

    it("leaves a press of another button alone", async () => {
      const { user, board } = await renderRoom();

      await user.pointer({
        keys: "[MouseRight]",
        target: screen.getByText("Score 10"),
      });

      expect(board).not.toHaveFocus();
    });
  });
});
