// How every sheet of the uplift's art is laid out, so they read as one set:
// a title and a line under it, then sections down the page, each a heading,
// a note and whatever it draws, on panels in the palettes' own field colors.

import { rect, svgFile, text } from "./core.mjs";

/** @import { Palette } from "./palettes.mjs" */

/** The sheets' own page: paper, ink and rules, apart from any palette. */
export const SHEET = {
  width: 1600,
  margin: 40,
  paper: "#f4f5f7",
  ink: "#1b1f24",
  muted: "#5d6672",
  line: "#d9dde2",
};

/**
 * @typedef {object} Section
 * @property {string} heading
 * @property {string} [note] A sentence or two under the heading, wrapped.
 * @property {number} height How tall what it draws is.
 * @property {(x: number, y: number, width: number) => string} draw Draws it, given its top left corner and its width.
 */

/**
 * Returns words broken into lines no longer than a count of characters.
 *
 * @param {string} words
 * @param {number} most
 * @returns {string[]}
 */
export function wrapped(words, most) {
  /** @type {string[]} */
  const lines = [];
  let line = "";
  for (const word of words.split(/\s+/)) {
    if (line && line.length + 1 + word.length > most) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Returns lines of text, wrapped to a width, one under another.
 *
 * @param {number} x
 * @param {number} y The first line's baseline.
 * @param {string} words
 * @param {{ width?: number, size?: number, fill?: string, weight?: number }} [how]
 * @returns {{ svg: string, height: number }}
 */
export function paragraph(
  x,
  y,
  words,
  {
    width = SHEET.width - 2 * SHEET.margin,
    size = 14,
    fill = SHEET.muted,
    weight,
  } = {},
) {
  const lines = wrapped(words, Math.floor(width / (size * 0.52)));
  const leading = Math.round(size * 1.45);
  return {
    svg: lines
      .map((line, i) =>
        text(x, y + i * leading, line, {
          fill,
          "font-size": size,
          "font-weight": weight,
        }),
      )
      .join(""),
    height: lines.length * leading,
  };
}

/**
 * Returns a caption: a small line of text, muted unless told otherwise.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {{ fill?: string, size?: number, anchor?: "start" | "middle" | "end", weight?: number }} [how]
 * @returns {string}
 */
export function caption(
  x,
  y,
  words,
  { fill = SHEET.muted, size = 12, anchor = "start", weight } = {},
) {
  return text(x, y, words, {
    fill,
    "font-size": size,
    "text-anchor": anchor,
    "font-weight": weight,
  });
}

/**
 * Returns a panel in a palette's field color, with the palette's name in
 * its corner, for art to be drawn on.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Palette} palette
 * @param {{ label?: string | false }} [how] A label in place of the palette's name, or none.
 * @returns {string}
 */
export function panel(x, y, width, height, palette, { label } = {}) {
  const words = label === undefined ? palette.name : label;
  return [
    rect(x, y, width, height, palette.field, {
      rx: 10,
      stroke: palette.mode === "light" ? SHEET.line : palette.fieldLine,
      "stroke-width": 1,
    }),
    words
      ? text(x + 12, y + 20, words, {
          fill: palette.fieldMuted,
          "font-size": 11,
          "letter-spacing": 0.4,
        })
      : "",
  ].join("");
}

/**
 * Returns a sheet as an SVG file: its title, its lead, and its sections
 * one under another.
 *
 * @param {{ title: string, lead: string, sections: Section[], defs?: string, width?: number }} sheet
 * @returns {string}
 */
export function sheetFile({
  title,
  lead,
  sections,
  defs = "",
  width = SHEET.width,
}) {
  const inner = width - 2 * SHEET.margin;
  const parts = [];
  let y = SHEET.margin + 26;
  parts.push(
    text(SHEET.margin, y, title, {
      fill: SHEET.ink,
      "font-size": 28,
      "font-weight": 750,
    }),
  );
  y += 30;
  const leadText = paragraph(SHEET.margin, y, lead, { width: inner, size: 15 });
  parts.push(leadText.svg);
  y += leadText.height + 18;
  for (const section of sections) {
    parts.push(rect(SHEET.margin, y, inner, 1, SHEET.line));
    y += 34;
    parts.push(
      text(SHEET.margin, y, section.heading, {
        fill: SHEET.ink,
        "font-size": 19,
        "font-weight": 700,
      }),
    );
    y += 24;
    if (section.note) {
      const note = paragraph(SHEET.margin, y, section.note, { width: inner });
      parts.push(note.svg);
      y += note.height + 6;
    }
    parts.push(section.draw(SHEET.margin, y, inner));
    y += section.height + 30;
  }
  return svgFile(width, y + SHEET.margin - 20, parts.join("\n"), {
    defs,
    background: SHEET.paper,
  });
}
