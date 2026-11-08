import { Component } from "@angular/core";
import { render } from "@testing-library/angular";
import { NO_INSETS } from "../insets";
import type { Viewport } from "../layout";
import {
  FakeResizeObserver,
  resize,
  watchResizes,
} from "../testing/fake_resize_observer";
import { canvasRoom } from "./canvas_room";

/** Stands in for a board, which measures the canvas its element makes. */
@Component({ selector: "fz-test-board", template: "" })
class TestBoardComponent {
  readonly room = canvasRoom();
}

/** Renders a board laid out at a size in CSS pixels as it is first drawn. */
async function renderBoard(
  width = 800,
  height = 600,
): Promise<{
  board: HTMLElement;
  component: TestBoardComponent;
  destroy: () => void;
}> {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, height),
  );
  const { fixture } = await render(TestBoardComponent);
  return {
    board: fixture.nativeElement as HTMLElement,
    component: fixture.componentInstance,
    destroy: () => {
      fixture.destroy();
    },
  };
}

/** Puts the page on a display of a pixel ratio. */
function displayAt(devicePixelRatio: number): void {
  vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(devicePixelRatio);
}

describe("canvasRoom", () => {
  watchResizes();

  it("measures the canvas the element makes as it is first drawn", async () => {
    displayAt(2);

    const { component } = await renderBoard(800, 600);

    expect(component.room.viewport()).toEqual<Viewport>({
      width: 1600,
      height: 1200,
      pixelRatio: 2,
      insets: NO_INSETS,
    });
  });

  it("measures it again each time its size changes", async () => {
    const { board, component } = await renderBoard(800, 600);

    resize(board, 1280, 720, { width: 1280, height: 720 });

    expect(component.room.viewport()?.width).toBe(1280);
  });

  it("gives the ratio the canvas renders at, which holds a large canvas to its budget above 2x", async () => {
    displayAt(2.5);

    const { component } = await renderBoard(1707, 960);

    expect(component.room.pixelRatio()).toBe(2);
  });

  it("gives no canvas, and the display's ratio, where the browser can't watch the element", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    displayAt(2.5);

    const { component } = await renderBoard(1707, 960);

    expect({
      viewport: component.room.viewport(),
      pixelRatio: component.room.pixelRatio(),
    }).toEqual({ viewport: null, pixelRatio: 2.5 });
  });

  it("can't be called outside an injection context", () => {
    expect(() => canvasRoom()).toThrow(/canvasRoom\(\)/);
  });

  it("stops measuring once the element's component is destroyed", async () => {
    const { destroy } = await renderBoard();

    destroy();

    expect(FakeResizeObserver.made.map((made) => made.watched.size)).toEqual([
      0,
    ]);
  });
});
