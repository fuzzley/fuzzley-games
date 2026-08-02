import { describe, it, expect, beforeEach } from "vitest";
import { DragController } from "@/engine/render/input/drag_controller";
import { TableIntent } from "@/engine/render/input/table_intents";

describe("DragController", () => {
  let intents: TableIntent[];
  /** The stack any card is treated as leading. */
  let stack: readonly string[];
  let clockMs: number;
  let controller: DragController;

  beforeEach(() => {
    intents = [];
    stack = ["a"];
    clockMs = 1000;
    controller = new DragController(
      (intent) => {
        intents.push(intent);
      },
      () => stack,
      () => clockMs,
    );
  });

  const kinds = () => intents.map((intent) => intent.kind);

  describe("hover", () => {
    it("marks a card as hovered", () => {
      controller.cardOver("a");

      expect(controller.hoveredCardId).toBe("a");
    });

    it("clears the hover when that card is left", () => {
      controller.cardOver("a");

      controller.cardOut("a");

      expect(controller.hoveredCardId).toBeNull();
    });

    it("leaves a different card's hover alone", () => {
      controller.cardOver("a");

      controller.cardOut("b");

      expect(controller.hoveredCardId).toBe("a");
    });

    it("marks a pile background as hovered", () => {
      controller.backgroundOver("stock");

      expect(controller.hoveredBackgroundPileId).toBe("stock");
    });

    it("clears the background hover when that pile is left", () => {
      controller.backgroundOver("stock");

      controller.backgroundOut("stock");

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });
  });

  describe("a tapped card", () => {
    it("stays examined after the finger lifts", () => {
      controller.cardOver("a");

      controller.cardOut("a", true);

      expect(controller.hoveredCardId).toBe("a");
    });

    it("gives way to the next card touched", () => {
      controller.cardOver("a");
      controller.cardOut("a", true);

      controller.cardOver("b");

      expect(controller.hoveredCardId).toBe("b");
    });

    it("is put back by a press on bare table", () => {
      controller.cardOver("a");
      controller.cardOut("a", true);

      controller.pressedBareTable();

      expect(controller.hoveredCardId).toBeNull();
    });

    it("is put back along with a lingering slot", () => {
      controller.backgroundOver("stock");

      controller.pressedBareTable();

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });
  });

  describe("presses", () => {
    it("reports a press as an activate", () => {
      controller.cardPressed("a");

      expect(intents).toEqual([{ kind: "activate", cardId: "a" }]);
    });

    it("reports a second quick press as a secondary activate too", () => {
      controller.cardPressed("a");
      clockMs += 100;

      controller.cardPressed("a");

      expect(kinds()).toEqual(["activate", "activate", "activate-secondary"]);
    });

    it("does not pair presses more than the double window apart", () => {
      controller.cardPressed("a");
      clockMs += 400;

      controller.cardPressed("a");

      expect(kinds()).toEqual(["activate", "activate"]);
    });

    it("does not pair presses on different cards", () => {
      controller.cardPressed("a");
      clockMs += 50;

      controller.cardPressed("b");

      expect(kinds()).toEqual(["activate", "activate"]);
    });

    it("cancels a pending drag on the second press, so the release cannot re-drop", () => {
      controller.dragStarted("a", { x: 1, y: 2 });
      controller.cardPressed("a");
      clockMs += 50;

      controller.cardPressed("a");

      expect(controller.drag).toBeNull();
    });

    it("forgets the press history when asked", () => {
      controller.cardPressed("a");
      controller.resetPressTracking();
      clockMs += 50;

      controller.cardPressed("a");

      expect(kinds()).toEqual(["activate", "activate"]);
    });

    it("reports a background press as an activate-pile", () => {
      controller.backgroundPressed("stock");

      expect(intents).toEqual([{ kind: "activate-pile", pileId: "stock" }]);
    });
  });

  describe("dragging", () => {
    it("picks up the stack the card leads", () => {
      stack = ["a", "b"];

      controller.dragStarted("a", { x: 5, y: 6 });

      expect(controller.drag?.cardIds).toEqual(["a", "b"]);
    });

    it("starts the stack at the position it was grabbed from", () => {
      controller.dragStarted("a", { x: 5, y: 6 });

      expect(controller.drag?.primary).toEqual({ x: 5, y: 6 });
    });

    it("picks nothing up when the card leads no stack", () => {
      stack = [];

      controller.dragStarted("a", { x: 5, y: 6 });

      expect(controller.drag).toBeNull();
    });

    it("follows the pointer", () => {
      controller.dragStarted("a", { x: 5, y: 6 });

      controller.dragMoved({ x: 9, y: 9 });

      expect(controller.drag?.primary).toEqual({ x: 9, y: 9 });
    });

    it("ignores a move with nothing in hand", () => {
      controller.dragMoved({ x: 9, y: 9 });

      expect(controller.drag).toBeNull();
    });

    it("reports the release as a drop on the target", () => {
      controller.dragStarted("a", { x: 5, y: 6 });

      controller.dragEnded("tableau-1");

      expect(intents).toEqual([
        { kind: "drop", cardIds: ["a"], targetPileId: "tableau-1" },
      ]);
    });

    it("reports a release over nothing as a drop with no target", () => {
      controller.dragStarted("a", { x: 5, y: 6 });

      controller.dragEnded(null);

      expect(intents[0]).toMatchObject({ targetPileId: null });
    });

    it("empties the hand before the drop is reported", () => {
      controller.dragStarted("a", { x: 5, y: 6 });

      controller.dragEnded("tableau-1");

      expect(controller.drag).toBeNull();
    });

    it("reports nothing when released with nothing in hand", () => {
      controller.dragEnded("tableau-1");

      expect(intents).toEqual([]);
    });
  });

  describe("flight", () => {
    /** The card ids of each flight in the air, oldest first. */
    function flownStacks(): string[][] {
      return controller.flights.map((flight) => [...flight.cardIds]);
    }

    it("flies the released stack to the pile that took it", () => {
      stack = ["a", "b"];
      controller.dragStarted("a", { x: 1, y: 1 });

      controller.dragEnded("tableau-1");

      expect(flownStacks()).toEqual([["a", "b"]]);
    });

    it("flies the released stack home when no pile took it", () => {
      stack = ["a", "b"];
      controller.dragStarted("a", { x: 1, y: 1 });

      controller.dragEnded(null);

      // Refused or not, the stack was left under the pointer and has the board
      // to cross to get back to the pile it came from.
      expect(flownStacks()).toEqual([["a", "b"]]);
    });

    it("lets the stack settle when the sprites have landed", () => {
      controller.beginFlight(["a"]);

      controller.endFlight(controller.flights[0]);

      expect(controller.flights).toEqual([]);
    });

    it("lifts nothing when told to fly an empty stack", () => {
      controller.beginFlight([]);

      expect(controller.flights).toEqual([]);
    });

    it("keeps a second stack in the air alongside the first", () => {
      controller.beginFlight(["a"]);

      controller.beginFlight(["b"]);

      // A single slot would drop the first out of the air to make room, and it
      // would snap to its pile's depth halfway across the board.
      expect(flownStacks()).toEqual([["a"], ["b"]]);
    });

    it("retires only the flight that landed", () => {
      controller.beginFlight(["a"]);
      controller.beginFlight(["b"]);

      controller.endFlight(controller.flights[0]);

      expect(flownStacks()).toEqual([["b"]]);
    });

    it("moves a card that flies again into the newer flight alone", () => {
      controller.beginFlight(["a", "b"]);

      controller.beginFlight(["b"]);

      // Otherwise the older flight landing would retire a card still crossing.
      expect(flownStacks()).toEqual([["a"], ["b"]]);
    });

    it("drops an older flight left with nothing in it", () => {
      controller.beginFlight(["a"]);

      controller.beginFlight(["a"]);

      expect(flownStacks()).toEqual([["a"]]);
    });
  });

  describe("reset", () => {
    it("clears everything and asks for a snap", () => {
      controller.cardOver("a");
      controller.backgroundOver("stock");
      controller.dragStarted("a", { x: 1, y: 1 });
      controller.beginFlight(["b"]);
      controller.snapAll = false;

      controller.reset();

      expect(controller.interaction).toEqual({
        hoveredCardId: null,
        hoveredBackgroundPileId: null,
        drag: null,
        flights: [],
        snapAll: true,
      });
    });

    it("forgets the press history, so a press after a new deal stands alone", () => {
      controller.cardPressed("a");
      controller.reset();
      clockMs += 50;

      controller.cardPressed("a");

      expect(kinds()).toEqual(["activate", "activate"]);
    });
  });
});
