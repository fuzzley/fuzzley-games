// What a texture drawn on as a scene runs, a bake, was handed, read in
// order, since a headless scene draws no pixels there to look at.

import type { PixelRect } from "@fz/phaser/layout";
import { vi } from "vitest";

/**
 * Describes a command a bake was handed, in the bake's own pixels: a fill,
 * a stamp of a frame, a draw of what it was handed to draw, a clear, of
 * the whole bake where it names no rectangle, or a render of what it was
 * handed.
 */
export type BakeCommand =
  | {
      readonly kind: "fill";
      readonly color: number;
      readonly rect: PixelRect;
    }
  | {
      readonly kind: "stamp";
      readonly frame: string;
      readonly x: number;
      readonly y: number;
      readonly scale: number;
    }
  | {
      readonly kind: "draw";
      readonly drawn: unknown;
      readonly x: number;
      readonly y: number;
    }
  | { readonly kind: "clear"; readonly rect: PixelRect | null }
  | { readonly kind: "render" };

/** The commands of a bake that are read, as a dynamic texture takes them: a bake's own, or every bake's on their prototype. */
export interface Bake {
  fill(
    color: number,
    alpha?: number,
    x?: number,
    y?: number,
    width?: number,
    height?: number,
  ): unknown;
  stamp(
    key: string,
    frame?: string | number,
    x?: number,
    y?: number,
    config?: { readonly scale?: number },
  ): unknown;
  draw(entries: unknown, x?: number, y?: number): unknown;
  clear(x?: number, y?: number, width?: number, height?: number): unknown;
  render(): unknown;
}

/** How many calls of each kind of command to pass over, from the first. */
type CallsPast = Readonly<Record<keyof Bake, number>>;

/**
 * Records every command a bake is handed from now on, each still drawn as
 * it was, until the mocks are restored; or every bake's, handed their
 * prototype, a scene's first bakes among them where it is called before
 * the scene starts. Returns what reads, in order, those a bake of a key
 * was handed. Where a spec already spies on the commands, it reads them
 * through those spies, from the calls they hold now on.
 */
export function recordBakes(bakes: Bake): (key: string) => BakeCommand[] {
  const fill = vi.spyOn(bakes, "fill");
  const stamp = vi.spyOn(bakes, "stamp");
  const draw = vi.spyOn(bakes, "draw");
  const clear = vi.spyOn(bakes, "clear");
  const render = vi.spyOn(bakes, "render");
  const past: CallsPast = {
    fill: fill.mock.calls.length,
    stamp: stamp.mock.calls.length,
    draw: draw.mock.calls.length,
    clear: clear.mock.calls.length,
    render: render.mock.calls.length,
  };
  return (key) => {
    const ordered: [number, BakeCommand][] = [];
    fill.mock.calls.forEach(
      ([color, , x = 0, y = 0, width = 0, height = 0], at) => {
        if (at < past.fill || keyOf(fill.mock.contexts[at]) !== key) return;
        ordered.push([
          fill.mock.invocationCallOrder[at] ?? 0,
          { kind: "fill", color, rect: { x, y, width, height } },
        ]);
      },
    );
    stamp.mock.calls.forEach(([, frame, x = 0, y = 0, config], at) => {
      if (at < past.stamp || keyOf(stamp.mock.contexts[at]) !== key) return;
      ordered.push([
        stamp.mock.invocationCallOrder[at] ?? 0,
        {
          kind: "stamp",
          frame: String(frame),
          x,
          y,
          scale: config?.scale ?? 1,
        },
      ]);
    });
    draw.mock.calls.forEach(([drawn, x = 0, y = 0], at) => {
      if (at < past.draw || keyOf(draw.mock.contexts[at]) !== key) return;
      ordered.push([
        draw.mock.invocationCallOrder[at] ?? 0,
        { kind: "draw", drawn, x, y },
      ]);
    });
    clear.mock.calls.forEach(([x, y, width, height], at) => {
      if (at < past.clear || keyOf(clear.mock.contexts[at]) !== key) return;
      ordered.push([
        clear.mock.invocationCallOrder[at] ?? 0,
        {
          kind: "clear",
          rect:
            x === undefined || y === undefined
              ? null
              : { x, y, width: width ?? 0, height: height ?? 0 },
        },
      ]);
    });
    render.mock.contexts.forEach((bake, at) => {
      if (at < past.render || keyOf(bake) !== key) return;
      ordered.push([
        render.mock.invocationCallOrder[at] ?? 0,
        { kind: "render" },
      ]);
    });
    return ordered.sort(([a], [b]) => a - b).map(([, command]) => command);
  };
}

/** Returns the stamps among a bake's commands. */
export function stampsIn(
  commands: readonly BakeCommand[],
): Extract<BakeCommand, { kind: "stamp" }>[] {
  return commands.flatMap((command) =>
    command.kind === "stamp" ? [command] : [],
  );
}

/** Returns the draws among a bake's commands. */
export function drawsIn(
  commands: readonly BakeCommand[],
): Extract<BakeCommand, { kind: "draw" }>[] {
  return commands.flatMap((command) =>
    command.kind === "draw" ? [command] : [],
  );
}

/** Returns the fills among a bake's commands. */
export function fillsIn(
  commands: readonly BakeCommand[],
): Extract<BakeCommand, { kind: "fill" }>[] {
  return commands.flatMap((command) =>
    command.kind === "fill" ? [command] : [],
  );
}

/** Returns the key of the bake a command was called on, or null for what has none. */
function keyOf(bake: unknown): string | null {
  return typeof bake === "object" &&
    bake !== null &&
    "key" in bake &&
    typeof bake.key === "string"
    ? bake.key
    : null;
}
