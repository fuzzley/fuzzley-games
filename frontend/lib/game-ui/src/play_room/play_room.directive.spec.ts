import { Component } from "@angular/core";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type FakeViewport, installFakeViewport } from "../testing";
import { type AwayReason, PlayRoomDirective } from "./play_room.directive";

@Component({
  imports: [PlayRoomDirective],
  template: `
    <div fzPlayRoom data-testid="room" (away)="reasons.push($event)">
      <div role="application" aria-label="Board" tabindex="0"></div>
      <button type="button">Up</button>
      <p>Score 10</p>
    </div>
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

  /** Renders a room, the board in it focused, and returns what it said. */
  async function renderRoom(): Promise<AwayReason[]> {
    const { fixture } = await render(TestRoomHostComponent);
    screen.getByRole("application").focus();
    return fixture.componentInstance.reasons;
  }

  describe("the focus", () => {
    it("is away once it leaves the room for the page around it", async () => {
      const reasons = await renderRoom();

      screen.getByRole("button", { name: "Settings" }).focus();

      expect(reasons).toEqual(["focus"]);
    });

    it("is away once it leaves for another window", async () => {
      const reasons = await renderRoom();

      screen.getByRole("application").blur();

      expect(reasons).toEqual(["focus"]);
    });

    it("stays while it moves within the room", async () => {
      const reasons = await renderRoom();

      screen.getByRole("button", { name: "Up" }).focus();

      expect(reasons).toEqual([]);
    });
  });

  describe("the page", () => {
    it("is away as it goes out of sight", async () => {
      const reasons = await renderRoom();

      setVisibility("hidden");

      expect(reasons).toEqual(["hidden"]);
    });

    it("isn't as it comes back into sight", async () => {
      const reasons = await renderRoom();

      setVisibility("visible");

      expect(reasons).toEqual([]);
    });
  });

  describe("the screen", () => {
    it("is away as it turns on its side", async () => {
      const reasons = await renderRoom();

      viewport?.setSize(844, 390);
      await settle();

      expect(reasons).toEqual(["turned"]);
    });

    it("is away as it turns back upright", async () => {
      viewport?.setSize(844, 390);
      const reasons = await renderRoom();

      viewport?.setSize(390, 844);
      await settle();

      expect(reasons).toEqual(["turned"]);
    });

    it("isn't through a change of size that doesn't turn it", async () => {
      const reasons = await renderRoom();

      viewport?.setSize(390, 664);
      await settle();

      expect(reasons).toEqual([]);
    });
  });

  describe("a press", () => {
    it("keeps the focus in the room when it lands on what can't take it", async () => {
      await renderRoom();

      const kept = !fireEvent.pointerDown(screen.getByText("Score 10"), {
        button: 0,
      });

      expect(kept).toBe(true);
    });

    it("lets a control take the focus", async () => {
      await renderRoom();

      const taken = fireEvent.pointerDown(
        screen.getByRole("button", { name: "Settings" }),
        { button: 0 },
      );

      expect(taken).toBe(true);
    });

    it("leaves the focus alone while it is outside the room", async () => {
      await renderRoom();
      screen.getByRole("button", { name: "Settings" }).focus();

      const taken = fireEvent.pointerDown(screen.getByText("Score 10"), {
        button: 0,
      });

      expect(taken).toBe(true);
    });

    it("leaves a press of another button alone", async () => {
      await renderRoom();

      const taken = fireEvent.pointerDown(screen.getByText("Score 10"), {
        button: 2,
      });

      expect(taken).toBe(true);
    });
  });
});
