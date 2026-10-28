import { TestBed } from "@angular/core/testing";
import { PHASER_CANVAS_HOST, type SceneSource } from "../canvas";
import type { HostOptions } from "../host";
import {
  FakePhaserCanvas,
  type FakeCanvasOptions,
  provideFakePhaserCanvas,
} from "./fake_canvas";

const OPTIONS: HostOptions = { title: "Snake", background: "transparent" };

const SOURCE: SceneSource = () => Promise.reject(new Error("never loaded"));

/** Returns the fake canvases a TestBed provides, and makes a host from them. */
function fakeCanvas(options?: FakeCanvasOptions): FakePhaserCanvas {
  TestBed.configureTestingModule({
    providers: [provideFakePhaserCanvas(options)],
  });
  TestBed.inject(PHASER_CANVAS_HOST)(document.createElement("div"), OPTIONS);
  return TestBed.inject(FakePhaserCanvas);
}

describe("provideFakePhaserCanvas", () => {
  it("records each host a canvas makes", () => {
    const fake = fakeCanvas();

    expect(fake.host.options).toBe(OPTIONS);
  });

  it("says a scene is ready as soon as it is shown", async () => {
    const onReady = vi.fn();

    await fakeCanvas().host.show(SOURCE, onReady);

    expect(onReady).toHaveBeenCalledOnce();
  });

  it("waits to be told, when asked to", () => {
    const host = fakeCanvas({ readyAtOnce: false }).host;
    const onReady = vi.fn();
    void host.show(SOURCE, onReady);

    host.latest.ready();

    expect(onReady).toHaveBeenCalledOnce();
  });

  it("fails a scene when told to", async () => {
    const host = fakeCanvas({ readyAtOnce: false }).host;
    const shown = host.show(SOURCE, vi.fn());

    host.latest.fail();

    await expect(shown).rejects.toThrow("couldn't be loaded");
  });

  it("has no latest scene before one is shown", () => {
    const host = fakeCanvas().host;

    expect(() => host.latest).toThrow("shown no scene");
  });

  it("has no host before a canvas makes one", () => {
    TestBed.configureTestingModule({ providers: [provideFakePhaserCanvas()] });

    expect(() => TestBed.inject(FakePhaserCanvas).host).toThrow(
      "No canvas has made a host",
    );
  });
});
