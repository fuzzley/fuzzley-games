import { describe, it, expect, beforeEach } from "vitest";
import { DragController } from "@/engine/render/input/drag_controller";
import { TableIntent } from "@/engine/render/input/table_intents";

describe("DragController", () => {
  let intents: TableIntent[];
  /** Cards the next handled intent should report as moved. */
  let moved: readonly string[];
  /** The stack any card is treated as leading. */
  let stack: readonly string[];
  let clockMs: number;
  let controller: DragController;

  beforeEach(() => {
    intents = [];
    moved = [];
    stack = ["a"];
    clockMs = 1000;
    controller = new DragController(
      (intent) => {
        intents.push(intent);
        return moved;
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
    it("tracks the cards a drop moved", () => {
      moved = ["a", "b"];
      controller.dragStarted("a", { x: 1, y: 1 });

      controller.dragEnded("tableau-1");

      expect(controller.flight?.cardIds).toEqual(["a", "b"]);
    });

    it("tracks nothing when the drop moved nothing", () => {
      moved = [];
      controller.dragStarted("a", { x: 1, y: 1 });

      controller.dragEnded("tableau-1");

      expect(controller.flight).toBeNull();
    });

    it("tracks the cards a secondary activate moved", () => {
      moved = ["a"];
      controller.cardPressed("a");
      clockMs += 50;

      controller.cardPressed("a");

      expect(controller.flight?.cardIds).toEqual(["a"]);
    });

    it("lets the stack settle when the sprites have landed", () => {
      moved = ["a"];
      controller.dragStarted("a", { x: 1, y: 1 });
      controller.dragEnded("tableau-1");

      controller.endFlight();

      expect(controller.flight).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears everything and asks for a snap", () => {
      moved = ["a"];
      controller.cardOver("a");
      controller.backgroundOver("stock");
      controller.dragStarted("a", { x: 1, y: 1 });
      controller.snapAll = false;

      controller.reset();

      expect(controller.interaction).toEqual({
        hoveredCardId: null,
        hoveredBackgroundPileId: null,
        drag: null,
        flight: null,
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
