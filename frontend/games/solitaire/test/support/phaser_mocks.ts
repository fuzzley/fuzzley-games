import { vi, type Mock } from "vitest";
import * as Phaser from "phaser";

/** Shape of a shadow filter recorded by a mock sprite. */
export interface ShadowConfig {
  x: number;
  y: number;
  decay: number;
  intensity: number;
  color: number;
  blur: number;
  opacity: number;
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
  frame: string;
  active: boolean;
  displayWidth: number;
  displayHeight: number;
  input: { cursor: string } | null;
  interactiveConfig: { useHandCursor: boolean } | null;
  filtersEnabled: boolean;
  shadowsAdded: ShadowConfig[];
  filters: { external: { addShadow: (...args: number[]) => MockSprite } };
  setOrigin(x: number, y: number): MockSprite;
  setAlpha(alpha: number): MockSprite;
  setInteractive(config?: { useHandCursor: boolean }): MockSprite;
  enableFilters(): MockSprite;
  setFrame(frame: string): MockSprite;
  setPosition(x: number, y: number): MockSprite;
  setScale(scale: number): MockSprite;
  setDepth(depth: number): MockSprite;
  setData(key: string, value: unknown): MockSprite;
  getData(key: string): unknown;
  on(event: string, callback: (...args: unknown[]) => void): MockSprite;
  emit(event: string, ...args: unknown[]): void;
}

/** Overridable initial fields for a {@link MockSprite}. */
export type MockSpriteOptions = Partial<
  Pick<
    MockSprite,
    "x" | "y" | "frame" | "active" | "displayWidth" | "displayHeight"
  >
>;

/** Builds a {@link MockSprite} with recording setters and its own listeners. */
export function createMockSprite(options: MockSpriteOptions = {}): MockSprite {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const data = new Map<string, unknown>();

  const sprite: MockSprite = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    alpha: 1,
    originX: 0,
    originY: 0,
    depth: 0,
    scale: 1,
    frame: options.frame ?? "",
    active: options.active ?? true,
    displayWidth: options.displayWidth ?? 220,
    displayHeight: options.displayHeight ?? 307,
    input: null,
    interactiveConfig: null,
    filtersEnabled: false,
    shadowsAdded: [],
    filters: {
      external: {
        addShadow(...args: number[]): MockSprite {
          const [x, y, decay, intensity, color, blur, opacity] = args;
          sprite.shadowsAdded.push({
            x,
            y,
            decay,
            intensity,
            color,
            blur,
            opacity,
          });
          return sprite;
        },
      },
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
      sprite.frame = frame;
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

/** A mock Phaser Graphics object whose draw methods are spies. */
export interface MockGraphics {
  clear: Mock;
  lineStyle: Mock;
  strokeRect: Mock;
  strokeRoundedRect: Mock;
  setDepth: Mock;
  beginPath: Mock;
  moveTo: Mock;
  lineTo: Mock;
  arc: Mock;
  strokePath: Mock;
}

/** Builds a {@link MockGraphics} whose chainable methods return itself. */
export function createMockGraphics(): MockGraphics {
  const graphics: MockGraphics = {
    clear: vi.fn(() => graphics),
    lineStyle: vi.fn(() => graphics),
    strokeRect: vi.fn(() => graphics),
    strokeRoundedRect: vi.fn(() => graphics),
    setDepth: vi.fn(() => graphics),
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
  emit(event: string, ...args: unknown[]): void;
}

/** Builds a {@link MockInput} so tests can drive drag events via emit. */
export function createMockInput(): MockInput {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  return {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.set(event, callback);
    }),
    setDraggable: vi.fn(),
    emit(event: string, ...args: unknown[]): void {
      listeners.get(event)?.(...args);
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
    cameras: { main: { setBackgroundColor: Mock } };
  };
  Geom: { Rectangle: typeof MockRectangle };
} {
  return {
    Scene: class MockScene {
      add = {
        graphics: () => createMockGraphics(),
        sprite: vi.fn(
          (x?: number, y?: number, _texture?: string, frame?: string) =>
            createMockSprite({ x, y, frame }),
        ),
      };
      scale = createMockScaleManager();
      input = createMockInput();
      cameras = { main: { setBackgroundColor: vi.fn() } };
    },
    Geom: {
      Rectangle: Object.assign(MockRectangle, {
        Intersection: rectangleIntersection,
      }),
    },
  };
}
