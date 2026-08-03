import { vi, type Mock } from "vitest";
import * as Phaser from "phaser";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";

/**
 * A shadow filter recorded by a mock sprite. Field names follow Phaser's
 * `addShadow(x, y, decay, power, color, samples, intensity)` parameters.
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
   * The padding override the shadow was left with. Null means the override was
   * cleared so the filter computes the room it needs.
   */
  paddingOverride: number[] | null;
}

/**
 * A lightweight stand-in for a Phaser sprite. Setter methods record their
 * effect on plain fields so tests can assert resulting state, and it registers
 * and dispatches its own pointer listeners so tests can drive interaction with
 * {@link MockSprite.emit} instead of reaching into mock call internals.
 */
export interface MockSprite {
  x: number;
  y: number;
  alpha: number;
  originX: number;
  originY: number;
  depth: number;
  scale: number;
  /**
   * Modelled as Phaser has it — an object with a name, not a bare string —
   * because production code reads `sprite.frame.name` to keep a sprite on the
   * frame it is showing while its texture changes underneath it.
   */
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
}

/** The filter handle {@link MockSprite}'s `addShadow` returns. */
export interface MockShadowFilter {
  setPaddingOverride(
    left: number | null,
    top?: number,
    right?: number,
    bottom?: number,
  ): MockShadowFilter;
}

/** Overridable initial fields for a {@link MockSprite}. */
export type MockSpriteOptions = Partial<
  Pick<MockSprite, "x" | "y" | "active" | "displayWidth" | "displayHeight">
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

  const sprite: MockSprite = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    alpha: 1,
    originX: 0,
    originY: 0,
    depth: 0,
    scale: 1,
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
      return sprite;
    },
    setTexture(key: string, frame?: string): MockSprite {
      sprite.texture = { key };
      // Phaser keeps the current frame when none is named, and so does this:
      // a swap that dropped the frame would leave the sprite showing the whole
      // atlas page, which is the bug worth being able to catch.
      if (frame !== undefined) sprite.frame = { name: frame };
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
  };

  return sprite;
}

/** Casts a {@link MockSprite} to the Phaser sprite type expected by sources. */
export function asSprite(sprite: MockSprite): Phaser.GameObjects.Sprite {
  return sprite as unknown as Phaser.GameObjects.Sprite;
}

/**
 * A mock Phaser Graphics object whose draw methods are spies. Transform and
 * visibility setters record onto plain fields so tests can assert where a
 * border ended up rather than that a setter was called.
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

/** A rectangle with the surface of Phaser.Geom.Rectangle used by sources. */
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
 * Returns a partial mock of the phaser module exposing only Geom.Rectangle,
 * enough for sources that compute rectangle overlaps. Load it from an async
 * `vi.mock("phaser", ...)` factory so the phaser module is not required at
 * runtime in the node test environment.
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

/** A mock Phaser input system that records and dispatches its listeners. */
export interface MockInput {
  on: Mock;
  setDraggable: Mock;
  setPollAlways: Mock;
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
    pollRate: -1,
    emit(event: string, ...args: unknown[]): void {
      listeners.get(event)?.(...args);
    },
  };
  return input;
}

/** A mock Phaser scene event emitter, enough for lifecycle hooks. */
export interface MockSceneEvents {
  once: Mock;
  on: Mock;
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

/** A mock Phaser texture cache, holding just the keys that are registered. */
export interface MockTextures {
  exists(key: string): boolean;
  /** Registers a texture, as a completed load would. */
  add(key: string): void;
}

/** Builds a {@link MockTextures} pre-loaded with the given keys. */
export function createMockTextures(...keys: string[]): MockTextures {
  const present = new Set(keys);
  return {
    exists: (key: string) => present.has(key),
    add: (key: string) => {
      present.add(key);
    },
  };
}

/**
 * A mock Phaser loader.
 *
 * Records what was asked for and leaves finishing it to the test, because when
 * a load completes — and whether it produces a texture at all — is exactly what
 * the deck swap has to get right.
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
   * @param textures Registers the requested keys first, as a successful load
   *   would. Pass false to complete without them, which is what a failed load
   *   looks like from here.
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

/** A mock Phaser scale manager that records and dispatches its listeners. */
export interface MockScaleManager {
  on: Mock;
  emit(event: string, ...args: unknown[]): void;
  width: number;
  height: number;
}

/** Builds a {@link MockScaleManager} so tests can drive resize via emit. */
export function createMockScaleManager(): MockScaleManager {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  return {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.set(event, callback);
    }),
    emit(event: string, ...args: unknown[]): void {
      listeners.get(event)?.(...args);
    },
    width: 0,
    height: 0,
  };
}

/**
 * Returns a mock of the phaser module suitable for exercising BoardScene: a
 * Scene base class exposing recording add/scale/input members plus a
 * Geom.Rectangle stand-in. Load it from an async `vi.mock("phaser", ...)`
 * factory so the real phaser module is not required in the node environment.
 */
export function boardScenePhaserMock(): {
  Scene: new (...args: unknown[]) => {
    add: { graphics: () => MockGraphics; sprite: Mock };
    scale: MockScaleManager;
    input: MockInput;
    events: MockSceneEvents;
    cameras: { main: { setBackgroundColor: Mock } };
    textures: MockTextures;
    load: MockLoader;
  };
  Scenes: { Events: { SHUTDOWN: string } };
  Loader: { Events: { COMPLETE: string } };
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
      scale = createMockScaleManager();
      input = createMockInput();
      events = createMockSceneEvents();
      cameras = { main: { setBackgroundColor: vi.fn() } };
      // The deck the board boots on is already loaded by the time a board
      // scene is created; anything else it has to fetch for itself.
      textures = createMockTextures(BOOT_TEXTURE_KEY);
      load = createMockLoader();
    },
    Scenes: { Events: { SHUTDOWN: SHUTDOWN_EVENT } },
    Loader: { Events: { COMPLETE: LOADER_COMPLETE_EVENT } },
    Geom: {
      Rectangle: Object.assign(MockRectangle, {
        Intersection: rectangleIntersection,
      }),
    },
  };
}

/** The scene shutdown event name, matching Phaser's own. */
export const SHUTDOWN_EVENT = "shutdown";

/** The loader event a board scene waits on before swapping a deck in. */
export const LOADER_COMPLETE_EVENT = "complete";

/**
 * The texture a mock scene starts with loaded.
 *
 * Matches the deck {@link TestPresentation} reports by default, so a board
 * scene built over the two finds its own deck already in the cache — the same
 * way a real one does, the loading scene having fetched it first.
 */
export const BOOT_TEXTURE_KEY = `cards:${DEFAULT_CARD_DECK}`;
