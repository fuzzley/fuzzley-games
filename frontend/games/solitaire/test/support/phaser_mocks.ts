import { vi, type Mock } from "vitest";
import * as Phaser from "phaser";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";
import { cardAtlasTextureKey } from "@/engine/render/phaser/card_deck_atlas";

/**
 * Where a card frame is anchored, as every deck's manifest records it, and so
 * where Phaser puts a sprite's origin when it takes a new frame.
 */
const FRAME_ANCHOR = 0.5;

/** The size of a card frame in every deck's 2x atlas, in texels. */
const CARD_ART_WIDTH = 440;
const CARD_ART_HEIGHT = 614;

/**
 * Returns the size of a frame drawn from a texture, in texels: half the 2x
 * size for a 1x atlas, whose key ends in `@1x`, and the 2x size for any other.
 */
function frameSizeOf(textureKey: string): { width: number; height: number } {
  return textureKey.endsWith("@1x")
    ? { width: CARD_ART_WIDTH / 2, height: CARD_ART_HEIGHT / 2 }
    : { width: CARD_ART_WIDTH, height: CARD_ART_HEIGHT };
}

/**
 * Records a shadow filter a mock sprite was given, with fields named after
 * Phaser's `addShadow(x, y, decay, power, color, samples, intensity)`.
 */
export interface ShadowConfig {
  x: number;
  y: number;
  decay: number;
  power: number;
  color: number;
  samples: number;
  intensity: number;
  /** Which of the sprite's two filter lists the shadow was added to. */
  list: "internal" | "external";
  /**
   * The padding override the shadow was left with, or null once cleared so the
   * filter computes its own.
   */
  paddingOverride: number[] | null;
}

/**
 * Stands in for a Phaser sprite, recording what its setters do on plain fields
 * and dispatching its own pointer listeners through {@link MockSprite.emit}.
 */
export interface MockSprite {
  x: number;
  y: number;
  alpha: number;
  originX: number;
  originY: number;
  /** The origin in texels, as Phaser's `setDisplayOrigin` sets it. */
  displayOriginX: number;
  displayOriginY: number;
  depth: number;
  scale: number;
  /** The frame's own size, in texels. */
  width: number;
  height: number;
  /** Whether the sprite has been destroyed. */
  destroyed: boolean;
  /** The frame, as an object with a name, since the sources read its name. */
  frame: { name: string };
  /** The texture the sprite draws from, as Phaser's `sprite.texture.key`. */
  texture: { key: string };
  active: boolean;
  displayWidth: number;
  displayHeight: number;
  input: { cursor: string } | null;
  interactiveConfig: { useHandCursor: boolean } | null;
  filtersEnabled: boolean;
  shadowsAdded: ShadowConfig[];
  filters: {
    internal: { addShadow: (...args: number[]) => MockShadowFilter };
    external: { addShadow: (...args: number[]) => MockShadowFilter };
  };
  setOrigin(x: number, y: number): MockSprite;
  setDisplayOrigin(x: number, y: number): MockSprite;
  setAlpha(alpha: number): MockSprite;
  setInteractive(config?: { useHandCursor: boolean }): MockSprite;
  enableFilters(): MockSprite;
  setFrame(frame: string): MockSprite;
  setTexture(key: string, frame?: string): MockSprite;
  setPosition(x: number, y: number): MockSprite;
  setScale(scale: number): MockSprite;
  setDepth(depth: number): MockSprite;
  setData(key: string, value: unknown): MockSprite;
  getData(key: string): unknown;
  on(event: string, callback: (...args: unknown[]) => void): MockSprite;
  emit(event: string, ...args: unknown[]): void;
  destroy(): void;
}

/** Stands in for the filter handle {@link MockSprite}'s `addShadow` returns. */
export interface MockShadowFilter {
  setPaddingOverride(
    left: number | null,
    top?: number,
    right?: number,
    bottom?: number,
  ): MockShadowFilter;
}

/** Overrides the initial fields of a {@link MockSprite}. */
export type MockSpriteOptions = Partial<
  Pick<
    MockSprite,
    "x" | "y" | "active" | "displayWidth" | "displayHeight" | "width" | "height"
  >
> & {
  /** The frame's name, which is the only part of it a caller ever sets. */
  frame?: string;
  /** The texture the sprite is created from. */
  texture?: string;
};

/** Builds a {@link MockSprite} with recording setters and its own listeners. */
export function createMockSprite(options: MockSpriteOptions = {}): MockSprite {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const data = new Map<string, unknown>();

  /** Records a shadow and hands back a filter whose padding stays recorded. */
  function addShadow(
    list: "internal" | "external",
    args: number[],
  ): MockShadowFilter {
    const [x, y, decay, power, color, samples, intensity] = args;
    const recorded: ShadowConfig = {
      x,
      y,
      decay,
      power,
      color,
      samples,
      intensity,
      list,
      // Phaser filters start with a zero override rather than no override.
      paddingOverride: [0, 0, 0, 0],
    };
    sprite.shadowsAdded.push(recorded);

    return {
      setPaddingOverride(left, top = 0, right = 0, bottom = 0) {
        recorded.paddingOverride =
          left === null ? null : [left, top, right, bottom];
        return this;
      },
    };
  }

  const frameSize = frameSizeOf(options.texture ?? "");
  const sprite: MockSprite = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    alpha: 1,
    originX: 0,
    originY: 0,
    displayOriginX: 0,
    displayOriginY: 0,
    depth: 0,
    scale: 1,
    width: options.width ?? frameSize.width,
    height: options.height ?? frameSize.height,
    destroyed: false,
    frame: { name: options.frame ?? "" },
    texture: { key: options.texture ?? "" },
    active: options.active ?? true,
    displayWidth: options.displayWidth ?? 220,
    displayHeight: options.displayHeight ?? 307,
    input: null,
    interactiveConfig: null,
    filtersEnabled: false,
    shadowsAdded: [],
    filters: {
      internal: { addShadow: (...args) => addShadow("internal", args) },
      external: { addShadow: (...args) => addShadow("external", args) },
    },
    setOrigin(x: number, y: number): MockSprite {
      sprite.originX = x;
      sprite.originY = y;
      return sprite;
    },
    setDisplayOrigin(x: number, y: number): MockSprite {
      sprite.displayOriginX = x;
      sprite.displayOriginY = y;
      return sprite;
    },
    setAlpha(alpha: number): MockSprite {
      sprite.alpha = alpha;
      return sprite;
    },
    setInteractive(config?: { useHandCursor: boolean }): MockSprite {
      sprite.interactiveConfig = config ?? null;
      sprite.input = { cursor: "default" };
      return sprite;
    },
    enableFilters(): MockSprite {
      sprite.filtersEnabled = true;
      return sprite;
    },
    setFrame(frame: string): MockSprite {
      sprite.frame = { name: frame };
      // Phaser moves the origin to the new frame's anchor, as setTexture does.
      sprite.originX = FRAME_ANCHOR;
      sprite.originY = FRAME_ANCHOR;
      return sprite;
    },
    setTexture(key: string, frame?: string): MockSprite {
      sprite.texture = { key };
      // Phaser keeps the current frame when none is named.
      if (frame !== undefined) sprite.frame = { name: frame };
      // Phaser sizes the sprite to its new frame.
      Object.assign(sprite, frameSizeOf(key));
      // Phaser also moves the origin to the new frame's centred anchor, which
      // the sources have to undo.
      sprite.originX = FRAME_ANCHOR;
      sprite.originY = FRAME_ANCHOR;
      return sprite;
    },
    setPosition(x: number, y: number): MockSprite {
      sprite.x = x;
      sprite.y = y;
      return sprite;
    },
    setScale(scale: number): MockSprite {
      sprite.scale = scale;
      return sprite;
    },
    setDepth(depth: number): MockSprite {
      sprite.depth = depth;
      return sprite;
    },
    setData(key: string, value: unknown): MockSprite {
      data.set(key, value);
      return sprite;
    },
    getData(key: string): unknown {
      return data.get(key);
    },
    on(event: string, callback: (...args: unknown[]) => void): MockSprite {
      const existing = listeners.get(event) ?? [];
      existing.push(callback);
      listeners.set(event, existing);
      return sprite;
    },
    emit(event: string, ...args: unknown[]): void {
      for (const callback of listeners.get(event) ?? []) {
        callback(...args);
      }
    },
    destroy(): void {
      sprite.destroyed = true;
    },
  };

  return sprite;
}

/** Casts a {@link MockSprite} to the Phaser sprite type expected by sources. */
export function asSprite(sprite: MockSprite): Phaser.GameObjects.Sprite {
  return sprite as unknown as Phaser.GameObjects.Sprite;
}

/**
 * Stands in for a Phaser Graphics object, with spies for drawing and plain
 * fields for where it was put and whether it shows.
 */
export interface MockGraphics {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
  clear: Mock;
  lineStyle: Mock;
  strokeRect: Mock;
  strokeRoundedRect: Mock;
  setDepth: Mock;
  setPosition: Mock;
  setVisible: Mock;
  beginPath: Mock;
  moveTo: Mock;
  lineTo: Mock;
  arc: Mock;
  strokePath: Mock;
}

/** Builds a {@link MockGraphics} whose chainable methods return itself. */
export function createMockGraphics(): MockGraphics {
  const graphics: MockGraphics = {
    x: 0,
    y: 0,
    depth: 0,
    visible: true,
    clear: vi.fn(() => graphics),
    lineStyle: vi.fn(() => graphics),
    strokeRect: vi.fn(() => graphics),
    strokeRoundedRect: vi.fn(() => graphics),
    setDepth: vi.fn((depth: number) => {
      graphics.depth = depth;
      return graphics;
    }),
    setPosition: vi.fn((x: number, y: number) => {
      graphics.x = x;
      graphics.y = y;
      return graphics;
    }),
    setVisible: vi.fn((visible: boolean) => {
      graphics.visible = visible;
      return graphics;
    }),
    beginPath: vi.fn(() => graphics),
    moveTo: vi.fn(() => graphics),
    lineTo: vi.fn(() => graphics),
    arc: vi.fn(() => graphics),
    strokePath: vi.fn(() => graphics),
  };
  return graphics;
}

/** Stands in for the parts of Phaser.Geom.Rectangle the sources use. */
export class MockRectangle {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}
}

/**
 * Computes the intersection of two rectangles into `out`, matching the
 * behavior of Phaser.Geom.Rectangle.Intersection.
 */
export function rectangleIntersection(
  rect1: MockRectangle,
  rect2: MockRectangle,
  out: MockRectangle,
): MockRectangle {
  const left = Math.max(rect1.x, rect2.x);
  const top = Math.max(rect1.y, rect2.y);
  const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  if (left >= right || top >= bottom) {
    out.x = 0;
    out.y = 0;
    out.width = 0;
    out.height = 0;
  } else {
    out.x = left;
    out.y = top;
    out.width = right - left;
    out.height = bottom - top;
  }
  return out;
}

/**
 * Returns a mock of the phaser module holding only Geom.Rectangle, enough for
 * sources that compute rectangle overlaps.
 *
 * Load it from an async `vi.mock("phaser", ...)` factory, so the node test
 * environment never loads the real phaser module.
 */
export function geomPhaserMock(): {
  Geom: { Rectangle: typeof MockRectangle };
} {
  return {
    Geom: {
      Rectangle: Object.assign(MockRectangle, {
        Intersection: rectangleIntersection,
      }),
    },
  };
}

/** Stands in for a Phaser input system, recording and dispatching listeners. */
export interface MockInput {
  on: Mock;
  setDraggable: Mock;
  setPollAlways: Mock;
  /** The cursor last put on the canvas, as Phaser's `setCursor` puts it. */
  canvasCursor: string;
  setCursor(interactiveObject: { cursor: string | boolean }): void;
  /** Phaser's own default: hit test only when the pointer itself moves. */
  pollRate: number;
  emit(event: string, ...args: unknown[]): void;
}

/** Builds a {@link MockInput} so tests can drive drag events via emit. */
export function createMockInput(): MockInput {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const input: MockInput = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.set(event, callback);
    }),
    setDraggable: vi.fn(),
    setPollAlways: vi.fn(() => {
      input.pollRate = 0;
    }),
    canvasCursor: "",
    setCursor(interactiveObject: { cursor: string | boolean }): void {
      // Phaser leaves the canvas alone for an object with no cursor of its own.
      if (typeof interactiveObject.cursor === "string") {
        input.canvasCursor = interactiveObject.cursor;
      }
    },
    pollRate: -1,
    emit(event: string, ...args: unknown[]): void {
      listeners.get(event)?.(...args);
    },
  };
  return input;
}

/** Stands in for a Phaser scene's event emitter, enough for lifecycle hooks. */
export interface MockSceneEvents {
  once: Mock;
  on: Mock;
  off: Mock;
  /** Dispatches an event to its listeners, dropping any registered via once. */
  emit(event: string, ...args: unknown[]): void;
}

/** Builds a {@link MockSceneEvents} so tests can drive scene lifecycle events. */
export function createMockSceneEvents(): MockSceneEvents {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const onceListeners = new Map<string, ((...args: unknown[]) => void)[]>();

  const add = (
    map: Map<string, ((...args: unknown[]) => void)[]>,
    event: string,
    callback: (...args: unknown[]) => void,
  ) => {
    const existing = map.get(event) ?? [];
    existing.push(callback);
    map.set(event, existing);
  };

  return {
    once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      add(onceListeners, event, callback);
    }),
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      add(listeners, event, callback);
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      for (const map of [listeners, onceListeners]) {
        map.set(
          event,
          (map.get(event) ?? []).filter((existing) => existing !== callback),
        );
      }
    }),
    emit(event: string, ...args: unknown[]): void {
      for (const callback of listeners.get(event) ?? []) {
        callback(...args);
      }
      const once = onceListeners.get(event) ?? [];
      onceListeners.delete(event);
      for (const callback of once) {
        callback(...args);
      }
    },
  };
}

/**
 * Records a sprite drawn into or erased from a {@link MockDynamicTexture}, as
 * it was when the texture rendered it.
 */
export interface DynamicTextureStroke {
  /** Whether the sprite was drawn, or used to erase. */
  op: "draw" | "erase";
  /** The texture and frame the sprite showed. */
  texture: string;
  frame: string;
  /** Where its origin was. */
  x: number;
  y: number;
  /** The shadow filters it carried. */
  shadows: ShadowConfig[];
}

/**
 * Stands in for a Phaser DynamicTexture, queueing what it is told to draw and
 * recording it as its contents once rendered.
 */
export interface MockDynamicTexture {
  readonly key: string;
  width: number;
  height: number;
  /** What the texture holds, as drawn since it was last cleared. */
  contents: DynamicTextureStroke[];
  /** How many times it has rendered what it was told to draw. */
  renderCount: number;
  /** Resizes the texture in place, as Phaser does. */
  setSize(width: number, height: number): MockDynamicTexture;
  clear(): MockDynamicTexture;
  draw(sprite: MockSprite): MockDynamicTexture;
  erase(sprite: MockSprite): MockDynamicTexture;
  render(): MockDynamicTexture;
}

/** Builds a {@link MockDynamicTexture} of the given size. */
function createMockDynamicTexture(
  key: string,
  width: number,
  height: number,
): MockDynamicTexture {
  // Phaser buffers commands and only carries them out on render.
  const queued: (() => void)[] = [];

  /** Queues a sprite to be recorded as it is when the texture renders. */
  function queueStroke(op: "draw" | "erase", sprite: MockSprite): void {
    queued.push(() => {
      texture.contents.push({
        op,
        texture: sprite.texture.key,
        frame: sprite.frame.name,
        x: sprite.x,
        y: sprite.y,
        shadows: [...sprite.shadowsAdded],
      });
    });
  }

  const texture: MockDynamicTexture = {
    key,
    width,
    height,
    contents: [],
    renderCount: 0,
    setSize(newWidth, newHeight) {
      texture.width = newWidth;
      texture.height = newHeight;
      return texture;
    },
    clear() {
      queued.push(() => {
        texture.contents = [];
      });
      return texture;
    },
    draw(sprite) {
      queueStroke("draw", sprite);
      return texture;
    },
    erase(sprite) {
      queueStroke("erase", sprite);
      return texture;
    },
    render() {
      for (const command of queued.splice(0)) command();
      texture.renderCount++;
      return texture;
    },
  };
  return texture;
}

/** Stands in for a Phaser texture cache, holding just the registered keys. */
export interface MockTextures {
  exists(key: string): boolean;
  /** Registers a texture, as a completed load would. */
  add(key: string): void;
  /** Releases a texture, as the renderer freeing its GPU memory would. */
  remove(key: string): void;
  /**
   * Registers a texture to draw into, or returns null if the key is taken, as
   * Phaser does.
   */
  addDynamicTexture(
    key: string,
    width: number,
    height: number,
  ): MockDynamicTexture | null;
  /** Returns the texture to draw into registered under a key, if any. */
  dynamicTexture(key: string): MockDynamicTexture | undefined;
}

/** Builds a {@link MockTextures} pre-loaded with the given keys. */
export function createMockTextures(...keys: string[]): MockTextures {
  const present = new Set(keys);
  const dynamic = new Map<string, MockDynamicTexture>();
  return {
    exists: (key: string) => present.has(key),
    add: (key: string) => {
      present.add(key);
    },
    remove: (key: string) => {
      present.delete(key);
      dynamic.delete(key);
    },
    addDynamicTexture: (key: string, width: number, height: number) => {
      if (present.has(key)) return null;
      const texture = createMockDynamicTexture(key, width, height);
      present.add(key);
      dynamic.set(key, texture);
      return texture;
    },
    dynamicTexture: (key: string) => dynamic.get(key),
  };
}

/** Stands in for a Phaser renderer's event emitter. */
export interface MockRenderer {
  on: Mock;
  off: Mock;
  /** Dispatches an event to the listeners still registered for it. */
  emit(event: string, ...args: unknown[]): void;
}

/** Builds a {@link MockRenderer} so tests can raise renderer events. */
export function createMockRenderer(): MockRenderer {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      const existing = listeners.get(event) ?? new Set();
      existing.add(callback);
      listeners.set(event, existing);
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(callback);
    }),
    emit(event: string, ...args: unknown[]): void {
      for (const callback of listeners.get(event) ?? []) {
        callback(...args);
      }
    },
  };
}

/**
 * Builds the stand-in for a scene's `make` factory, which creates sprites
 * without adding them to the display list.
 */
export function createMockMake(): { sprite: Mock } {
  return {
    sprite: vi.fn((config: { key?: string; frame?: string }) =>
      createMockSprite({ texture: config.key, frame: config.frame }),
    ),
  };
}

/**
 * Stands in for a Phaser loader, recording what was asked for and leaving the
 * test to finish each load.
 */
export interface MockLoader {
  multiatlas: Mock;
  once: Mock;
  start: Mock;
  /** The texture keys `multiatlas` has been asked for, in order. */
  readonly requested: string[];
  /**
   * Fires the loader's completion listeners.
   *
   * @param textures The cache to register the requested keys in first, as a
   *   successful load would; false completes without them, as a failed load
   *   does.
   */
  complete(textures?: MockTextures | false): void;
}

/** Builds a {@link MockLoader} whose completion a test drives. */
export function createMockLoader(): MockLoader {
  const requested: string[] = [];
  const completionListeners: (() => void)[] = [];

  return {
    requested,
    multiatlas: vi.fn((key: string) => {
      requested.push(key);
    }),
    once: vi.fn((event: string, callback: () => void) => {
      if (event === LOADER_COMPLETE_EVENT) completionListeners.push(callback);
    }),
    start: vi.fn(),
    complete(textures?: MockTextures | false): void {
      if (textures) {
        for (const key of requested) textures.add(key);
      }
      const listeners = completionListeners.splice(0);
      for (const callback of listeners) callback();
    },
  };
}

/** Stands in for a Phaser scale manager, recording and firing listeners. */
export interface MockScaleManager {
  on: Mock;
  off: Mock;
  emit(event: string, ...args: unknown[]): void;
  /** Returns how many listeners an event has, for leak checks. */
  listenerCount(event: string): number;
  width: number;
  height: number;
  /** Device pixels per CSS pixel, which the board reads as its pixel ratio. */
  displayScale: { x: number; y: number };
}

/** Builds a {@link MockScaleManager} so tests can drive resize via emit. */
export function createMockScaleManager(): MockScaleManager {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      const existing = listeners.get(event) ?? new Set();
      existing.add(callback);
      listeners.set(event, existing);
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(callback);
    }),
    emit(event: string, ...args: unknown[]): void {
      for (const callback of listeners.get(event) ?? []) {
        callback(...args);
      }
    },
    listenerCount(event: string): number {
      return listeners.get(event)?.size ?? 0;
    },
    width: 0,
    height: 0,
    displayScale: { x: 1, y: 1 },
  };
}

/**
 * Returns a mock of the phaser module for exercising BoardScene: a Scene base
 * class with recording members, and a Geom.Rectangle stand-in.
 *
 * Load it from an async `vi.mock("phaser", ...)` factory, so the node test
 * environment never loads the real phaser module.
 */
export function boardScenePhaserMock(): {
  Scene: new (...args: unknown[]) => {
    add: { graphics: () => MockGraphics; sprite: Mock };
    make: { sprite: Mock };
    scale: MockScaleManager;
    input: MockInput;
    events: MockSceneEvents;
    cameras: { main: { setBackgroundColor: Mock } };
    textures: MockTextures;
    load: MockLoader;
    renderer: MockRenderer;
  };
  Scenes: {
    Events: { SHUTDOWN: string; DESTROY: string; POST_UPDATE: string };
  };
  Loader: { Events: { COMPLETE: string } };
  Renderer: { Events: { RESTORE_WEBGL: string } };
  Geom: { Rectangle: typeof MockRectangle };
} {
  return {
    Scene: class MockScene {
      add = {
        graphics: () => createMockGraphics(),
        sprite: vi.fn(
          (x?: number, y?: number, texture?: string, frame?: string) =>
            createMockSprite({ x, y, texture, frame }),
        ),
      };
      make = createMockMake();
      scale = createMockScaleManager();
      input = createMockInput();
      events = createMockSceneEvents();
      cameras = { main: { setBackgroundColor: vi.fn() } };
      // The deck the board boots on is already loaded, so a spec can call
      // create without preload; anything else it has to fetch for itself.
      textures = createMockTextures(BOOT_TEXTURE_KEY);
      load = createMockLoader();
      renderer = createMockRenderer();
    },
    Scenes: {
      Events: {
        SHUTDOWN: SHUTDOWN_EVENT,
        DESTROY: DESTROY_EVENT,
        POST_UPDATE: POST_UPDATE_EVENT,
      },
    },
    Loader: { Events: { COMPLETE: LOADER_COMPLETE_EVENT } },
    Renderer: { Events: { RESTORE_WEBGL: RESTORE_WEBGL_EVENT } },
    Geom: {
      Rectangle: Object.assign(MockRectangle, {
        Intersection: rectangleIntersection,
      }),
    },
  };
}

/** The scene shutdown event name, matching Phaser's own. */
export const SHUTDOWN_EVENT = "shutdown";

/**
 * The scene destroy event name, matching Phaser's own, which a scene raises
 * without shutting down first when it is removed or its game is destroyed.
 */
export const DESTROY_EVENT = "destroy";

/**
 * The event raised after a frame is drawn, matching Phaser's own, on which a
 * board announces it is ready.
 */
export const POST_UPDATE_EVENT = "postupdate";

/** The loader event a board scene waits on before swapping a deck in. */
export const LOADER_COMPLETE_EVENT = "complete";

/**
 * The renderer event raised once a lost WebGL context is back, matching
 * Phaser's own.
 */
export const RESTORE_WEBGL_EVENT = "restorewebgl";

/**
 * The texture a mock scene starts with loaded: the deck
 * {@link TestPresentation} reports by default, as the board's own preload or an
 * earlier board would have left it.
 *
 * At 1x, because a mock scene's viewport falls back to the board's design size
 * at a pixel ratio of 1, which is a layout scale of 1.
 */
export const BOOT_TEXTURE_KEY = cardAtlasTextureKey({
  deckId: DEFAULT_CARD_DECK,
  artScale: 1,
});
