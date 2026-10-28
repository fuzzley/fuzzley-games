import { WEBGL_CONSTANTS } from "./webgl_constants";

/** Each constant's name by its number, the first name where two share one. */
const NAMES = new Map<number, string>(
  Object.entries(WEBGL_CONSTANTS)
    .reverse()
    .map(([name, value]) => [value, name]),
);

/** The context's limits and names, which Phaser reads as it boots. */
const PARAMETERS: Readonly<Record<string, unknown>> = {
  MAX_TEXTURE_IMAGE_UNITS: 16,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16,
  MAX_TEXTURE_SIZE: 4096,
  MAX_CUBE_MAP_TEXTURE_SIZE: 4096,
  MAX_RENDERBUFFER_SIZE: 4096,
  MAX_VERTEX_ATTRIBS: 16,
  MAX_VERTEX_UNIFORM_VECTORS: 256,
  MAX_FRAGMENT_UNIFORM_VECTORS: 256,
  MAX_VARYING_VECTORS: 15,
  MAX_VIEWPORT_DIMS: new Int32Array([4096, 4096]),
  ALIASED_LINE_WIDTH_RANGE: new Float32Array([1, 1]),
  ALIASED_POINT_SIZE_RANGE: new Float32Array([1, 64]),
  VERSION: "WebGL 1.0 (blank)",
  SHADING_LANGUAGE_VERSION: "WebGL GLSL ES 1.0 (blank)",
  VENDOR: "blank",
  RENDERER: "blank",
};

/** Where numbers start for a constant outside WebGL 1, clear of the real ones. */
const OTHER_CONSTANTS_FROM = 0x7fff0000;

/** Says whether a property's name is a constant's, such as `TEXTURE_2D`. */
const CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/;

/** Does nothing, as every drawing call on a blank context does. */
const doNothing = (): undefined => undefined;

/**
 * Returns a WebGL context that draws nothing, for Phaser's WebGL renderer to
 * boot and run on in jsdom: every call does nothing, but those Phaser reads an
 * answer from, and every constant is WebGL's own number.
 *
 * Every shader compiles and every program links, with nothing active, every
 * framebuffer is complete, and it offers no extension but
 * `WEBGL_lose_context`, which loses and restores it as a browser's does: lost
 * at once, it raises `webglcontextlost` on its canvas on a later task, and
 * restored on a later task, `webglcontextrestored`.
 */
export function blankWebGLContext(
  canvas: HTMLCanvasElement,
): WebGLRenderingContext {
  let lost = false;
  const others = new Map<string, number>();
  const constant = (name: string): number => {
    const known = WEBGL_CONSTANTS[name] ?? others.get(name);
    if (known !== undefined) return known;
    const made = OTHER_CONSTANTS_FROM + others.size;
    others.set(name, made);
    return made;
  };
  const named = (value: unknown): string =>
    typeof value === "number" ? (NAMES.get(value) ?? "") : "";

  let restoring = false;
  const loseContext = {
    loseContext: (): void => {
      if (lost) return;
      lost = true;
      setTimeout(() => {
        canvas.dispatchEvent(
          new Event("webglcontextlost", { cancelable: true }),
        );
      });
    },
    restoreContext: (): void => {
      if (!lost || restoring) return;
      restoring = true;
      setTimeout(() => {
        lost = false;
        restoring = false;
        canvas.dispatchEvent(new Event("webglcontextrestored"));
      });
    },
  };

  const answers: Readonly<Record<string, (...args: unknown[]) => unknown>> = {
    getParameter: (name) => PARAMETERS[named(name)] ?? 0,
    getProgramParameter: (_program, name) =>
      named(name) === "LINK_STATUS" || named(name) === "VALIDATE_STATUS"
        ? true
        : 0,
    getShaderParameter: (_shader, name) => named(name) === "COMPILE_STATUS",
    getShaderInfoLog: () => "",
    getProgramInfoLog: () => "",
    getShaderPrecisionFormat: () => ({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    }),
    checkFramebufferStatus: () => constant("FRAMEBUFFER_COMPLETE"),
    getSupportedExtensions: () => [],
    getExtension: (name) =>
      name === "WEBGL_lose_context" ? loseContext : null,
    getContextAttributes: () => ({
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: true,
    }),
    isContextLost: () => lost,
    getError: () => constant("NO_ERROR"),
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
  };

  const context = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === "canvas") return canvas;
        if (key === "drawingBufferWidth") return canvas.width;
        if (key === "drawingBufferHeight") return canvas.height;
        if (typeof key !== "string") return undefined;
        if (CONSTANT_NAME.test(key)) return constant(key);
        const answer = answers[key];
        if (answer) return answer;
        // A buffer, texture, shader, program or framebuffer to hand back.
        if (key.startsWith("create")) return () => ({});
        return doNothing;
      },
    },
  );
  // A stand-in for the browser's context, which Phaser only calls into.
  return context as unknown as WebGLRenderingContext;
}
