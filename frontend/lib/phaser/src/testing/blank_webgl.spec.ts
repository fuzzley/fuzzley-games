import { blankWebGLContext } from "./blank_webgl";

/** Returns a blank context on a canvas of its own. */
function blankContext(): WebGLRenderingContext {
  return blankWebGLContext(document.createElement("canvas"));
}

/** Returns the names of the context events a canvas raises from now on. */
function eventsOn(canvas: HTMLCanvasElement): string[] {
  const events: string[] = [];
  for (const type of ["webglcontextlost", "webglcontextrestored"]) {
    canvas.addEventListener(type, (event) => {
      events.push(`${event.type}${event.cancelable ? " (cancelable)" : ""}`);
    });
  }
  return events;
}

/** Returns the context's own means of losing and restoring itself. */
function loseContextOf(context: WebGLRenderingContext): WEBGL_lose_context {
  const extension = context.getExtension("WEBGL_lose_context");
  if (!extension) throw new Error("No WEBGL_lose_context");
  return extension;
}

describe("blankWebGLContext", () => {
  it("gives its canvas, and the canvas's size as its own", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 30;
    canvas.height = 20;

    const context = blankWebGLContext(canvas);

    expect([
      context.canvas,
      context.drawingBufferWidth,
      context.drawingBufferHeight,
    ]).toEqual([canvas, 30, 20]);
  });

  it("numbers each constant as WebGL does", () => {
    const context = blankContext();

    expect([context.TEXTURE_2D, context.INT, context.FLOAT_VEC4]).toEqual([
      0x0de1, 0x1404, 0x8b52,
    ]);
  });

  it("numbers a constant outside WebGL 1 apart from WebGL's own, the same each time", () => {
    const context = blankContext();

    const first = Reflect.get(context, "TEXTURE_3D") as number;

    expect([first >= 0x7fff0000, Reflect.get(context, "TEXTURE_3D")]).toEqual([
      true,
      first,
    ]);
  });

  it("answers the limits Phaser reads, and 0 for the rest", () => {
    const context = blankContext();

    const answers = [
      context.getParameter(context.MAX_TEXTURE_SIZE),
      context.getParameter(context.MAX_TEXTURE_IMAGE_UNITS),
      context.getParameter(context.STENCIL_BITS),
      context.getParameter("not a constant" as unknown as number),
    ];

    expect(answers).toEqual([4096, 16, 0, 0]);
  });

  it("compiles every shader and links every program, with nothing active", () => {
    const context = blankContext();
    const shader = context.createShader(context.VERTEX_SHADER);
    const program = context.createProgram();

    const answers = [
      context.getShaderParameter(shader!, context.COMPILE_STATUS),
      context.getShaderParameter(shader!, context.DELETE_STATUS),
      context.getProgramParameter(program, context.LINK_STATUS),
      context.getProgramParameter(program, context.VALIDATE_STATUS),
      context.getProgramParameter(program, context.ACTIVE_UNIFORMS),
      context.getShaderInfoLog(shader!),
      context.getProgramInfoLog(program),
    ];

    expect(answers).toEqual([true, false, true, true, 0, "", ""]);
  });

  it("calls every framebuffer complete, and every call a success", () => {
    const context = blankContext();

    const answers = [
      context.checkFramebufferStatus(context.FRAMEBUFFER),
      context.getError(),
    ];

    expect(answers).toEqual([context.FRAMEBUFFER_COMPLETE, context.NO_ERROR]);
  });

  it("offers no extension but WEBGL_lose_context", () => {
    const context = blankContext();

    const answers = [
      context.getSupportedExtensions(),
      context.getExtension("OES_vertex_array_object"),
      typeof context.getExtension("WEBGL_lose_context")?.loseContext,
    ];

    expect(answers).toEqual([[], null, "function"]);
  });

  it("answers what Phaser reads of its attributes, locations and precision", () => {
    const context = blankContext();
    const program = context.createProgram();

    const answers = {
      attributes: context.getContextAttributes()?.alpha,
      attribute: context.getAttribLocation(program, "inPosition"),
      uniform: typeof context.getUniformLocation(program, "uMain"),
      precision: context.getShaderPrecisionFormat(
        context.FRAGMENT_SHADER,
        context.HIGH_FLOAT,
      )?.precision,
    };

    expect(answers).toEqual({
      attributes: true,
      attribute: 0,
      uniform: "object",
      precision: 23,
    });
  });

  it("does nothing when drawn with", () => {
    const context = blankContext();

    expect(() => {
      context.bindTexture(context.TEXTURE_2D, context.createTexture());
      context.clear(context.COLOR_BUFFER_BIT);
      context.drawArrays(context.TRIANGLES, 0, 3);
    }).not.toThrow();
  });

  it("loses itself, telling its canvas in an event it may cancel", () => {
    const canvas = document.createElement("canvas");
    const context = blankWebGLContext(canvas);
    const events = eventsOn(canvas);

    loseContextOf(context).loseContext();

    expect([context.isContextLost(), events]).toEqual([
      true,
      ["webglcontextlost (cancelable)"],
    ]);
  });

  it("restores itself once lost, telling its canvas", () => {
    const canvas = document.createElement("canvas");
    const context = blankWebGLContext(canvas);
    loseContextOf(context).loseContext();
    const events = eventsOn(canvas);

    loseContextOf(context).restoreContext();

    expect([context.isContextLost(), events]).toEqual([
      false,
      ["webglcontextrestored"],
    ]);
  });

  it("loses itself only once until it is restored", () => {
    const canvas = document.createElement("canvas");
    const context = blankWebGLContext(canvas);
    const events = eventsOn(canvas);

    loseContextOf(context).loseContext();
    loseContextOf(context).loseContext();

    expect(events).toEqual(["webglcontextlost (cancelable)"]);
  });

  it("restores only a context it lost", () => {
    const canvas = document.createElement("canvas");
    const context = blankWebGLContext(canvas);
    const events = eventsOn(canvas);

    loseContextOf(context).restoreContext();

    expect(events).toEqual([]);
  });
});
