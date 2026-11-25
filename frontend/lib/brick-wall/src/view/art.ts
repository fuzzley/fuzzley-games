// What every wall game's art draws alike: a brick's cell at a scale, which
// each of its frames fills so a brick's frames stack, and a frame drawn in
// it; whether a scale draws a brick's finest detail, by `@fz/phaser/bricks`'
// rule; a dot; and the shard a broken brick bursts into, in white for a tint
// to color as its brick.

import { showsDetail } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  circle,
  polygon,
  widthOf,
} from "@fz/phaser/shapes";

/** How wide a shard is, in field units. */
export const SHARD = 0.3;

/**
 * Returns a brick's cell at a scale, which each of its frames fills, so its
 * frames stack: a unit square, in whole device pixels, one at least.
 */
export function cellArea(scale: ArtScale): Area {
  const side = Math.max(1, Math.round(scale.unit));
  return { x: 0, y: 0, width: side, height: side };
}

/** Returns a frame the size of a brick's cell at a scale, drawn in it. */
export function cellFrame(
  name: string,
  scale: ArtScale,
  draw: (cell: Area) => readonly DrawCommand[],
): ArtFrame {
  const cell = cellArea(scale);
  return { name, width: cell.width, height: cell.height, commands: draw(cell) };
}

/**
 * Returns whether a scale draws a brick's finest detail, such as a crack or
 * a rivet: a unit 30 CSS pixels wide or more, by `showsDetail()`'s rule for
 * a tile a unit wide.
 */
export function detailed(scale: ArtScale): boolean {
  return showsDetail(scale, 1);
}

/** Returns a frame of a dot that fills it, some device pixels wide, in a color. */
export function dotFrame(name: string, side: number, color: number): ArtFrame {
  const half = side / 2;
  return {
    name,
    width: side,
    height: side,
    commands: [circle({ x: half, y: half }, half, { color })],
  };
}

/** Returns a shard at a scale: a sliver of a triangle in white, which a tint colors as its brick. */
export function shardFrame(name: string, scale: ArtScale): ArtFrame {
  const side = widthOf(SHARD, scale);
  return {
    name,
    width: side,
    height: side,
    commands: [
      polygon(
        [
          { x: 0, y: side },
          { x: side, y: 0.6 * side },
          { x: 0.35 * side, y: 0 },
        ],
        { color: 0xffffff },
      ),
    ],
  };
}
