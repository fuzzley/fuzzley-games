// The points scored, written in the page's font: each character drawn into
// an atlas of the points' own, filled in the shots' color and outlined in
// the field's, at each step of a pixel a canvas sets a character at, and a
// label set from those frames as a canvas sets a line of the same text, so
// the label stamped from them, outlines first, is the picture a Phaser
// `Text` of it draws.

import { keysOf, recordOf } from "@fz/core/records";
import { wholePixels } from "../field/field_metrics";

/**
 * How tall the points are written, and how wide the outline round them, in
 * field units.
 */
export const POINTS_TEXT = { size: 0.95, outline: 0.28 } as const;

/** How bold the points are written, as CSS weighs a font. */
const POINTS_WEIGHT = 700;

/**
 * The text a line's height is measured by, as Phaser's `Text` measures it:
 * the ink of the highest and the deepest characters a line may hold.
 *
 * It is Phaser's `testString` byte for byte, mojibake and all (an "É" in
 * UTF-8 read as Windows-1252), so a label's box is a `Text`'s; mended, it
 * would not be.
 */
const LINE_TEST = "|MÃ‰qgy";

/**
 * The device pixels left clear around a character's outline in its frames,
 * for the edge a canvas smooths, a pixel either way.
 */
const GLYPH_MARGIN = 1;

/**
 * How many steps of a device pixel each character is drawn at, one frame each.
 *
 * Chrome's canvas rounds where a character starts along its line to the
 * nearest quarter of a pixel, and draws it for that quarter.
 */
export const PEN_STEPS = 4;

/** The empty pixels between two frames, or two labels' rooms, so none bleeds into the next. */
const GUTTER = 2;

/**
 * Every character a label of points is written in, by the name its frames
 * take, or null for one with no ink to draw: a space.
 */
const NAMES = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "+": "plus",
  ",": "comma",
  " ": null,
  "×": "times",
} as const;

/** A character a label of points is written in. */
export type PointsCharacter = keyof typeof NAMES;

/** Every character a label of points is written in. */
export const POINTS_CHARACTERS: readonly PointsCharacter[] = keysOf(NAMES);

/**
 * Says which font the points are written in: the board's family, a new
 * record each time the page loads a face of it the points were written
 * without.
 */
export interface PointsFont {
  /** The CSS font family. */
  readonly family: string;
}

/** Says what a canvas measures of a text, as its `measureText()` does. */
export interface MeasuredText {
  readonly width: number;
  readonly actualBoundingBoxLeft: number;
  readonly actualBoundingBoxRight: number;
  readonly actualBoundingBoxAscent: number;
  readonly actualBoundingBoxDescent: number;
}

/** Names the frames a character is written in, at each step of a pixel. */
export interface GlyphFrames {
  /**
   * Its fill's, the first where its pen lies on a whole pixel, each after it
   * a step further on.
   */
  readonly fills: readonly string[];
  /** Its outline's, likewise. */
  readonly outlines: readonly string[];
}

/**
 * Says how a character of the points is set at the unit they are lettered
 * at, in device pixels: its frames, and how the font measured it.
 */
export interface Glyph {
  readonly character: PointsCharacter;
  /** Its frames, or null for a character with no ink: a space. */
  readonly frames: GlyphFrames | null;
  /** Its frames' width and height. */
  readonly width: number;
  readonly height: number;
  /** Where the pen sets it on the baseline, from its frames' top left corner, at the first step. */
  readonly x: number;
  readonly y: number;
  /** How far the pen moves on past it. */
  readonly advance: number;
  /**
   * How much farther the font sets each character after it than the advance
   * says: its kerning, which is mostly none.
   */
  readonly kerning: Readonly<Record<PointsCharacter, number>>;
}

/**
 * Says how the points are lettered at a unit, as the font measured them, in
 * device pixels.
 */
export interface PointsLettering {
  /** The CSS font family they are written in. */
  readonly family: string;
  /** The CSS font they are written in, its size among it. */
  readonly font: string;
  /** The field's unit they are lettered at, in whole device pixels. */
  readonly unit: number;
  /** How far the font's line reaches above the baseline, as Phaser's `Text` measures it. */
  readonly ascent: number;
  /** How far it reaches below the baseline. */
  readonly descent: number;
  /** How wide the line they are outlined with is. */
  readonly outline: number;
  /** Each character's glyph. */
  readonly glyphs: Readonly<Record<PointsCharacter, Glyph>>;
}

/**
 * Describes a frame of the points' atlas: a character filled or outlined,
 * at a step of a pixel, and where it lies.
 */
export interface GlyphFrame {
  readonly name: string;
  readonly character: PointsCharacter;
  /** Whether it is the character's outline, stroked, rather than its fill. */
  readonly outlined: boolean;
  /** Where its frame's top left corner lies in the atlas. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Where the pen writes its character in the atlas, its step past its frame's own. */
  readonly penX: number;
  readonly penY: number;
}

/** Says where each frame of the points' atlas lies, and how big the atlas is. */
export interface PointsAtlasLayout {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly GlyphFrame[];
}

/**
 * Describes where a label of points lies, character by character, at the
 * unit they are lettered at: a record a painter keeps and writes over.
 */
export interface PointsLayout {
  /** How many characters it sets, which its lists hold, and maybe more past. */
  length: number;
  /** Its box's width, in whole pixels, and its height, as a `Text` of it is boxed. */
  width: number;
  height: number;
  /** Each character's fill's frame and its outline's, or null for a space. */
  readonly fills: (string | null)[];
  readonly outlines: (string | null)[];
  /** Where each character's frames' top left corner lies from the box's, in whole pixels. */
  readonly xs: number[];
  readonly ys: number[];
}

/** Describes a label's room on the sheet the labels are stamped on. */
export interface PointsRoom {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Says how the sheet the labels of points are stamped on is laid out: a
 * room for each label, and where its box lies in it.
 */
export interface PointsSheet {
  readonly width: number;
  readonly height: number;
  /** Each label's room, which holds every frame stamped for a label it may show. */
  readonly rooms: readonly PointsRoom[];
  /** Where a label's box lies in its room, from the room's top left corner. */
  readonly boxX: number;
  readonly boxY: number;
}

/**
 * Returns the CSS font a page loads the points' face by, in a family: their
 * weight, at any size, as a face holds every size.
 */
export function pointsFace(family: string): string {
  return pointsFont(family, 1);
}

/**
 * Returns the unit the points are lettered at for a field's unit: rounded
 * down to a whole device pixel, one at least, however large, so they zoom
 * by less than a pixel a unit and stay sharp on the largest screen.
 */
export function letteringUnit(unit: number): number {
  return Math.max(1, wholePixels(unit));
}

/** Returns the CSS font the points are lettered in, in a family, at a unit. */
export function letteringFont(family: string, unit: number): string {
  return pointsFont(family, POINTS_TEXT.size * unit);
}

/**
 * Returns how the points are lettered in a family at a unit, from what a
 * canvas set to their font ({@link letteringFont}) measures of each
 * character, of each pair and of a line.
 */
export function letterPoints(
  family: string,
  unit: number,
  measure: (text: string) => MeasuredText,
): PointsLettering {
  const outline = POINTS_TEXT.outline * unit;
  // A pixel past the outline's half, which lies outside the character.
  const reach = outline / 2 + GLYPH_MARGIN;
  // The last step sets a character most of a pixel further on.
  const stepped = (PEN_STEPS - 1) / PEN_STEPS;
  const measured = recordOf(POINTS_CHARACTERS, measure);
  const glyphs = recordOf(POINTS_CHARACTERS, (character): Glyph => {
    const ink = measured[character];
    const name = NAMES[character];
    const x = Math.ceil(ink.actualBoundingBoxLeft + reach);
    const y = Math.ceil(ink.actualBoundingBoxAscent + reach);
    return {
      character,
      frames: name === null ? null : framesNamed(name),
      width: x + Math.ceil(ink.actualBoundingBoxRight + reach + stepped),
      height: y + Math.ceil(ink.actualBoundingBoxDescent + reach),
      x,
      y,
      advance: ink.width,
      kerning: recordOf(
        POINTS_CHARACTERS,
        (after) =>
          measure(character + after).width - ink.width - measured[after].width,
      ),
    };
  });
  const line = measure(LINE_TEST);
  return {
    family,
    font: letteringFont(family, unit),
    unit,
    ascent: line.actualBoundingBoxAscent,
    descent: line.actualBoundingBoxDescent,
    outline,
    glyphs,
  };
}

/**
 * Returns where each frame of the points' atlas lies, and where its pen
 * writes: a row of the characters' fills at each step of a pixel, then a
 * row of their outlines at each, each character in turn along it.
 */
export function packPoints(lettering: PointsLettering): PointsAtlasLayout {
  const inked = inkedGlyphs(lettering);
  const rowHeight = Math.max(...inked.map(({ glyph }) => glyph.height));
  const frames: GlyphFrame[] = [];
  let width = 1;
  let y = 0;
  for (const outlined of [false, true]) {
    for (let step = 0; step < PEN_STEPS; step++) {
      let x = 0;
      for (const { glyph, frames: names } of inked) {
        const name = (outlined ? names.outlines : names.fills)[step];
        if (name === undefined) {
          throw new RangeError(
            `"${glyph.character}" has no frame at step ${String(step)}.`,
          );
        }
        frames.push({
          name,
          character: glyph.character,
          outlined,
          x,
          y,
          width: glyph.width,
          height: glyph.height,
          penX: x + glyph.x + step / PEN_STEPS,
          penY: y + glyph.y,
        });
        x += glyph.width + GUTTER;
      }
      width = Math.max(width, x - GUTTER);
      y += rowHeight + GUTTER;
    }
  }
  return { width, height: y - GUTTER, frames };
}

/** Returns a record to lay labels of points out in, which holds as many characters as asked. */
export function pointsLayout(characters: number): PointsLayout {
  const each = <T>(value: T): T[] =>
    Array.from({ length: characters }, () => value);
  return {
    length: 0,
    width: 0,
    height: 0,
    fills: each<string | null>(null),
    outlines: each<string | null>(null),
    xs: each(0),
    ys: each(0),
  };
}

/**
 * Lays a label of points out into a record, as Phaser's `Text` sets a line
 * of it: in a box as wide as its line and outline, to a whole pixel, and as
 * tall as the font's line and the outline; each character's pen on from the
 * last by the last's advance and their kerning, from half an outline in from
 * the box's left on a whole pixel, and taken to the nearest step of a pixel,
 * as a canvas takes it; its baseline half an outline and the ascent down from
 * the box's top, on a whole pixel.
 *
 * @throws {RangeError} For a character the points aren't written in, or a
 *   label longer than the record holds.
 */
export function layOutPoints(
  label: string,
  lettering: PointsLettering,
  into: PointsLayout,
): void {
  if (label.length > into.xs.length) {
    throw new RangeError(`"${label}" is longer than its layout holds.`);
  }
  const { outline, ascent, descent, glyphs } = lettering;
  const start = Math.round(outline / 2);
  const baseline = Math.round(outline / 2 + ascent);
  let line = 0;
  for (let i = 0; i < label.length; i++) {
    const glyph = glyphOf(label.charAt(i), glyphs);
    // Half a step and up goes to the next, as a canvas rounds a pen.
    const steps = Math.floor((start + line) * PEN_STEPS + 0.5);
    const whole = Math.floor(steps / PEN_STEPS);
    const step = steps - whole * PEN_STEPS;
    into.fills[i] = glyph.frames?.fills[step] ?? null;
    into.outlines[i] = glyph.frames?.outlines[step] ?? null;
    into.xs[i] = whole - glyph.x;
    into.ys[i] = baseline - glyph.y;
    line += advanceAt(label, i, glyphs);
  }
  into.length = label.length;
  into.width = Math.ceil(outline + line);
  into.height = ascent + descent + outline;
}

/**
 * Returns the sheet labels of points are stamped on, so many labels of so
 * many characters at most: a room for each, which holds every frame of any
 * such label and its box, laid in a grid about as wide as it is tall, with a
 * gutter between, so no label's stamps reach another's.
 */
export function pointsSheet(
  lettering: PointsLettering,
  labels: number,
  characters: number,
): PointsSheet {
  const { outline, ascent, descent, glyphs } = lettering;
  const inked = inkedGlyphs(lettering).map(({ glyph }) => glyph);
  // The most the pen moves on past a character, with its kerning.
  const pitch = Math.max(
    ...POINTS_CHARACTERS.map(
      (character) =>
        glyphs[character].advance +
        Math.max(0, ...Object.values(glyphs[character].kerning)),
    ),
  );
  const start = Math.round(outline / 2);
  const baseline = Math.round(outline / 2 + ascent);
  const boxX = Math.max(0, ...inked.map(({ x }) => x - start));
  const boxY = Math.max(0, ...inked.map(({ y }) => y - baseline));
  const right = Math.max(
    Math.ceil(outline + characters * pitch),
    // A pen taken to its step moves on an eighth of a pixel at most.
    Math.ceil(
      start +
        (characters - 1) * pitch +
        1 +
        Math.max(...inked.map(({ width, x }) => width - x)),
    ),
  );
  const bottom = Math.max(
    Math.ceil(ascent + descent + outline),
    baseline + Math.max(...inked.map(({ height, y }) => height - y)),
  );
  const width = boxX + right;
  const height = boxY + bottom;
  const across = Math.max(1, Math.round(Math.sqrt((labels * height) / width)));
  const down = Math.ceil(labels / across);
  return {
    width: across * (width + GUTTER) - GUTTER,
    height: down * (height + GUTTER) - GUTTER,
    rooms: Array.from({ length: labels }, (_, i) => ({
      x: (i % across) * (width + GUTTER),
      y: Math.floor(i / across) * (height + GUTTER),
      width,
      height,
    })),
    boxX,
    boxY,
  };
}

/** Returns the CSS font the points are written in, in a family, at a size in device pixels. */
function pointsFont(family: string, size: number): string {
  return `${String(POINTS_WEIGHT)} ${String(size)}px ${family}`;
}

/** Returns the names of a character's frames, by the name it gives them, at each step. */
function framesNamed(name: string): GlyphFrames {
  const steps = Array.from({ length: PEN_STEPS }, (_, step) => step);
  return {
    fills: steps.map((step) => `points-${name}-${String(step)}`),
    outlines: steps.map((step) => `points-${name}-outline-${String(step)}`),
  };
}

/** Returns each glyph with ink, and its frames, in the characters' order. */
function inkedGlyphs(
  lettering: PointsLettering,
): readonly { readonly glyph: Glyph; readonly frames: GlyphFrames }[] {
  return POINTS_CHARACTERS.flatMap((character) => {
    const glyph = lettering.glyphs[character];
    return glyph.frames ? [{ glyph, frames: glyph.frames }] : [];
  });
}

/**
 * Returns how far the pen moves on past a label's character at an index: its
 * advance, and its kerning with the next.
 */
function advanceAt(
  label: string,
  i: number,
  glyphs: Readonly<Record<PointsCharacter, Glyph>>,
): number {
  const glyph = glyphOf(label.charAt(i), glyphs);
  if (i + 1 === label.length) return glyph.advance;
  const next = glyphOf(label.charAt(i + 1), glyphs);
  return glyph.advance + glyph.kerning[next.character];
}

/**
 * Returns the glyph a character of the points is written in.
 *
 * @throws {RangeError} For a character the points aren't written in.
 */
function glyphOf(
  character: string,
  glyphs: Readonly<Record<PointsCharacter, Glyph>>,
): Glyph {
  if (!isPointsCharacter(character)) {
    throw new RangeError(`The points aren't written with "${character}".`);
  }
  return glyphs[character];
}

/** Returns whether a character is one the points are written in. */
function isPointsCharacter(character: string): character is PointsCharacter {
  return Object.hasOwn(NAMES, character);
}
