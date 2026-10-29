import { Component, input } from "@angular/core";
import type { ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { render, screen } from "@testing-library/angular";
import type { HostOptions } from "../host";
import {
  FakePhaserCanvas,
  type FakeCanvasHost,
  provideFakePhaserCanvas,
} from "../testing";
import type { SceneSource } from "./canvas_host";
import { PhaserCanvasComponent } from "./phaser_canvas.component";

/** The scene a canvas is first shown, which the fake host never calls. */
const FIRST: SceneSource = () => Promise.reject(new Error("never loaded"));

/** The scene shown next. */
const SECOND: SceneSource = () => Promise.reject(new Error("never loaded"));

const OPTIONS: HostOptions = { title: "Snake", background: "transparent" };

@Component({
  imports: [PhaserCanvasComponent],
  template: `
    <fz-phaser-canvas [scene]="scene()" [options]="options" [label]="label()">
      <p fzCanvasPlaceholder>Setting up the board</p>
    </fz-phaser-canvas>
  `,
})
class TestCanvasHostComponent {
  readonly scene = input(FIRST);
  readonly label = input<string>();
  readonly options = OPTIONS;
}

/** A canvas rendered in a spec, and the fake host it made. */
interface RenderedCanvas {
  readonly fixture: ComponentFixture<TestCanvasHostComponent>;
  readonly canvas: PhaserCanvasComponent;
  readonly element: HTMLElement;
  readonly host: FakeCanvasHost;
  /** Shows another scene in the canvas. */
  readonly show: (scene: SceneSource) => Promise<void>;
  /** Lets what the fake host settled reach the page. */
  readonly settle: () => Promise<void>;
}

/** Renders a canvas whose scenes wait to be told they are ready. */
async function renderCanvas(label?: string): Promise<RenderedCanvas> {
  const { fixture, rerender } = await render(TestCanvasHostComponent, {
    inputs: label === undefined ? {} : { label },
    providers: [provideFakePhaserCanvas({ readyAtOnce: false })],
  });
  const debug = fixture.debugElement.query(By.directive(PhaserCanvasComponent));
  return {
    fixture,
    canvas: debug.componentInstance as PhaserCanvasComponent,
    element: debug.nativeElement as HTMLElement,
    host: fixture.debugElement.injector.get(FakePhaserCanvas).host,
    show: async (scene) => {
      await rerender({ inputs: { scene }, partialUpdate: true });
    },
    settle: async () => {
      await Promise.resolve();
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PhaserCanvasComponent", () => {
  describe("its host", () => {
    it("is made once, to draw in an element of its own inside the canvas", async () => {
      const { element, host } = await renderCanvas();

      expect({
        inside: element.contains(host.parent),
        own: host.parent !== element,
      }).toEqual({ inside: true, own: true });
    });

    it("is made with the options given", async () => {
      const { host } = await renderCanvas();

      expect(host.options).toBe(OPTIONS);
    });

    it("is shown the scene given", async () => {
      const { host } = await renderCanvas();

      expect(host.shown.map(({ source }) => source)).toEqual([FIRST]);
    });

    it("is shown each new scene, in the same game", async () => {
      const rendered = await renderCanvas();

      await rendered.show(SECOND);

      const fake = rendered.fixture.debugElement.injector.get(FakePhaserCanvas);
      expect({
        hosts: fake.hosts.length,
        shown: rendered.host.shown.map(({ source }) => source),
      }).toEqual({ hosts: 1, shown: [FIRST, SECOND] });
    });

    it("reads the insets again when asked", async () => {
      const { canvas, host } = await renderCanvas();

      canvas.refreshInsets();

      expect(host.insetsRefreshed).toBe(1);
    });

    it("is destroyed with the canvas", async () => {
      const { fixture, host } = await renderCanvas();

      fixture.destroy();

      expect(host.destroyed).toBe(true);
    });
  });

  describe("its state", () => {
    it("is loading until the scene has drawn", async () => {
      const { element } = await renderCanvas();

      expect(element).toHaveAttribute("data-state", "loading");
    });

    it("is ready once the scene has drawn", async () => {
      const { element, host, settle } = await renderCanvas();

      host.latest.ready();
      await settle();

      expect(element).toHaveAttribute("data-state", "ready");
    });

    it("is failed when the scene can't be loaded", async () => {
      const { element, host, settle } = await renderCanvas();

      host.latest.fail();
      await settle();

      expect(element).toHaveAttribute("data-state", "failed");
    });

    it("is loading still when the scene hasn't drawn in eight seconds", async () => {
      const { element, settle } = await renderCanvas();

      vi.advanceTimersByTime(8_000);
      await settle();

      expect(element).toHaveAttribute("data-state", "loading");
    });

    it("is failed when the scene hasn't drawn in a minute", async () => {
      const { element, settle } = await renderCanvas();

      vi.advanceTimersByTime(60_000);
      await settle();

      expect(element).toHaveAttribute("data-state", "failed");
    });

    it("is loading still just before then", async () => {
      const { element, settle } = await renderCanvas();

      vi.advanceTimersByTime(59_900);
      await settle();

      expect(element).toHaveAttribute("data-state", "loading");
    });

    it("is ready after all when a scene given up on draws", async () => {
      const { element, host, settle } = await renderCanvas();
      vi.advanceTimersByTime(60_000);
      await settle();

      host.latest.ready();
      await settle();

      expect(element).toHaveAttribute("data-state", "ready");
    });

    it("is loading again when a new scene is shown", async () => {
      const { element, host, settle, show } = await renderCanvas();
      host.latest.ready();
      await settle();

      await show(SECOND);

      expect(element).toHaveAttribute("data-state", "loading");
    });

    it("ignores the scene it replaced", async () => {
      const { element, host, settle, show } = await renderCanvas();
      await show(SECOND);

      host.shown[0]!.ready();
      host.shown[0]!.fail();
      vi.advanceTimersByTime(8_000);
      host.latest.ready();
      await settle();

      expect(element).toHaveAttribute("data-state", "ready");
    });

    it("times nothing once the canvas is gone", async () => {
      const { fixture } = await renderCanvas();

      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("whether it is slow", () => {
    it("is not slow at first", async () => {
      const { canvas, element } = await renderCanvas();

      expect([canvas.slow(), element.hasAttribute("data-slow")]).toEqual([
        false,
        false,
      ]);
    });

    it("is slow once the scene hasn't drawn in eight seconds", async () => {
      const { canvas, element, settle } = await renderCanvas();

      vi.advanceTimersByTime(8_000);
      await settle();

      expect([canvas.slow(), element.hasAttribute("data-slow")]).toEqual([
        true,
        true,
      ]);
    });

    it("is not slow just before then", async () => {
      const { canvas, settle } = await renderCanvas();

      vi.advanceTimersByTime(7_900);
      await settle();

      expect(canvas.slow()).toBe(false);
    });

    it("is no longer slow once the scene draws", async () => {
      const { canvas, host, settle } = await renderCanvas();
      vi.advanceTimersByTime(8_000);
      await settle();

      host.latest.ready();
      await settle();

      expect(canvas.slow()).toBe(false);
    });

    it("is no longer slow once it fails", async () => {
      const { canvas, settle } = await renderCanvas();

      vi.advanceTimersByTime(60_000);
      await settle();

      expect(canvas.slow()).toBe(false);
    });

    it("is not slow when a new scene is shown", async () => {
      const { canvas, settle, show } = await renderCanvas();
      vi.advanceTimersByTime(8_000);
      await settle();

      await show(SECOND);

      expect(canvas.slow()).toBe(false);
    });
  });

  // Its stylesheet hides it by `data-state`, which jsdom, given no component
  // styles, can't show; a browser checks that.
  it("lays the placeholder over the canvas", async () => {
    const { element } = await renderCanvas();

    expect(screen.getByText("Setting up the board").parentElement).toBe(
      element,
    );
  });

  describe("to assistive technology", () => {
    it("is an image of the name it is given", async () => {
      await renderCanvas("Snake board");

      expect(
        screen.getByRole("img", { name: "Snake board" }),
      ).toBeInTheDocument();
    });

    it("is hidden without a name", async () => {
      const { host } = await renderCanvas();

      expect({
        image: screen.queryByRole("img"),
        hidden: host.parent.getAttribute("aria-hidden"),
      }).toEqual({ image: null, hidden: "true" });
    });

    it("is busy while the scene loads", async () => {
      await renderCanvas("Snake board");

      expect(screen.getByRole("img")).toHaveAttribute("aria-busy", "true");
    });

    it("is no longer busy once the scene has drawn", async () => {
      const { host, settle } = await renderCanvas("Snake board");

      host.latest.ready();
      await settle();

      expect(screen.getByRole("img")).toHaveAttribute("aria-busy", "false");
    });
  });
});
