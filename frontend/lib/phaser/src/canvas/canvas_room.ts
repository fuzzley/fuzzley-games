import {
  DestroyRef,
  ElementRef,
  type Signal,
  afterNextRender,
  assertInInjectionContext,
  computed,
  inject,
  signal,
} from "@angular/core";
import { type Viewport, canvasPixelRatio } from "../layout";
import { watchCanvasViewport } from "./canvas_viewport";

/**
 * Describes the canvas a component's element makes for the
 * `<fz-phaser-canvas>` that fills it, as the host sizes it, which a board's
 * placeholder lays its board out on until the scene has drawn.
 */
export interface CanvasRoom {
  /**
   * The canvas, as last measured: null before the element is first drawn,
   * or where the browser can't watch it.
   */
  readonly viewport: Signal<Viewport | null>;
  /**
   * The device pixels to a CSS pixel the canvas renders at, as last
   * measured, or the display's until then, which a placeholder drawn in CSS
   * sizes its cells by.
   */
  readonly pixelRatio: Signal<number>;
}

/**
 * Measures the canvas the element of the component it is called in makes,
 * as {@link watchCanvasViewport} does, from its first render until it is
 * destroyed.
 *
 * Call it in a component's or a directive's injection context, as a field's
 * initializer is, whose element it measures; anywhere else it throws.
 */
export function canvasRoom(): CanvasRoom {
  assertInInjectionContext(canvasRoom);
  const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  const destroyRef = inject(DestroyRef);
  const viewport = signal<Viewport | null>(null);
  afterNextRender(() => {
    const stop = watchCanvasViewport(element, (measured) => {
      viewport.set(measured);
    });
    if (stop) destroyRef.onDestroy(stop);
  });
  return {
    viewport: viewport.asReadonly(),
    pixelRatio: computed(
      () =>
        viewport()?.pixelRatio ??
        canvasPixelRatio(
          element.ownerDocument.defaultView?.devicePixelRatio ?? 1,
        ),
    ),
  };
}
