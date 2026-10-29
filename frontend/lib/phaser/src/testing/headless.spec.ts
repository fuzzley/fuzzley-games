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

  it("gives a canvas a picture that names its size", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 12;
    canvas.height = 34;

    expect(canvas.toDataURL()).toBe("data:image/png;size=12x34,");
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

  it("gives a canvas the one 2D context however often it is asked", () => {
    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    expect(canvas.getContext("2d")).toBe(context);
  });

  it("gives a canvas no context of a kind other than the one it gave", () => {
    const canvas = document.createElement("canvas");
    canvas.getContext("2d");

    expect(canvas.getContext("webgl")).toBeNull();
  });

  it("gives a canvas no context of another kind", () => {
    const context = document
      .createElement("canvas")
      .getContext("bitmaprenderer");

    expect(context).toBeNull();
  });

  it("says the window has WebGL and the 2D canvas, as Phaser asks before it tries", () => {
    expect([
      "WebGLRenderingContext" in window,
      "CanvasRenderingContext2D" in window,
    ]).toEqual([true, true]);
  });

  it("lays a canvas out at its CSS size, at the page's top left", () => {
    const canvas = document.createElement("canvas");
    canvas.style.width = "390.4px";
    canvas.style.height = "844px";

    const { left, top, width, height } = canvas.getBoundingClientRect();

    expect([left, top, width, height]).toEqual([0, 0, 390.4, 844]);
  });

  it("lays a canvas with no CSS size out at the size of its pixels", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 30;
    canvas.height = 20;
    canvas.style.width = "100%";

    const { right, bottom } = canvas.getBoundingClientRect();

    expect([right, bottom]).toEqual([30, 20]);
  });

  it("finds the canvas laid out under a point, or else the page's body", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 30;
    canvas.height = 20;
    document.body.append(canvas);

    const found = [
      document.elementFromPoint(10, 10),
      document.elementFromPoint(40, 10),
    ];

    expect(found).toEqual([canvas, document.body]);
    canvas.remove();
  });

  it("answers a request itself, so nothing reaches the network", async () => {
    const request = new XMLHttpRequest();
    request.open("GET", "https://example.com/apple.json");
    const status = new Promise<number>((resolve) => {
      request.onload = () => {
        resolve(request.status);
      };
    });

    request.send();

    await expect(status).resolves.toBe(404);
  });

  it("installs once however often it is called", () => {
    const descriptor = (): PropertyDescriptor | undefined =>
      Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    const installed = descriptor();

    installHeadlessPhaser();

    expect(descriptor()).toEqual(installed);
  });
});
