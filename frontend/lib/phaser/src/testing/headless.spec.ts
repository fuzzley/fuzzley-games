import { installHeadlessPhaser } from "./headless";

describe("installHeadlessPhaser", () => {
  beforeAll(() => {
    installHeadlessPhaser();
  });

  it("gives a canvas a 2D context that keeps what is set on it", () => {
    const context = document.createElement("canvas").getContext("2d")!;

    context.fillStyle = "#123456";

    expect(context.fillStyle).toBe("#123456");
  });

  it("gives the context its canvas", () => {
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    expect(context?.canvas).toBe(canvas);
  });

  it("answers what Phaser reads from a context", () => {
    const context = document.createElement("canvas").getContext("2d")!;

    const answers = {
      pixels: context.getImageData(0, 0, 2, 3).data.length,
      created: context.createImageData(1, 2).data.length,
      text: context.measureText("snake").width,
      gradient: typeof context.createLinearGradient(0, 0, 1, 1).addColorStop,
    };

    expect(answers).toEqual({
      pixels: 24,
      created: 8,
      text: 0,
      gradient: "function",
    });
  });

  it("does nothing when drawn on", () => {
    const context = document.createElement("canvas").getContext("2d")!;

    expect(() => {
      context.fillRect(0, 0, 10, 10);
      context.createRadialGradient(0, 0, 1, 0, 0, 2).addColorStop(0, "red");
      context.createPattern(new Image(), "repeat");
    }).not.toThrow();
  });

  it("gives a canvas a WebGL context that draws nothing", () => {
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("webgl");

    expect([context?.canvas, context?.TEXTURE_2D]).toEqual([canvas, 0x0de1]);
  });

  it("gives a canvas the one WebGL context, however it is asked for", () => {
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("webgl");

    expect(canvas.getContext("experimental-webgl")).toBe(context);
  });

  it("gives a canvas no context of another kind", () => {
    const context = document
      .createElement("canvas")
      .getContext("bitmaprenderer");

    expect(context).toBeNull();
  });

  it("says the window has WebGL, as Phaser asks before it tries", () => {
    expect("WebGLRenderingContext" in window).toBe(true);
  });

  it("loads an image written as a data: URL", async () => {
    const image = new Image();
    const loaded = new Promise((resolve) => {
      image.addEventListener("load", resolve);
    });

    image.src = "data:image/png;base64,iVBORw0KGgo=";

    await expect(loaded).resolves.toBeInstanceOf(Event);
  });

  it("keeps an image's address as it was written", () => {
    const image = new Image();

    image.src = "https://example.com/apple.png";

    expect(image.src).toBe("https://example.com/apple.png");
  });

  it("installs once however often it is called", () => {
    const descriptor = (): PropertyDescriptor | undefined =>
      Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    const installed = descriptor();

    installHeadlessPhaser();

    expect(descriptor()).toEqual(installed);
  });
});
