// The two panels the Brick Breaker uplift plan (../plan.md) stands beside
// the field where a window is wide: "The bench" on the left, with the level,
// its stars, the lives waiting and the level after it, and "In play" on the
// right, with the streak, the effects in play and the kinds of brick in the
// level. `sheet-field.mjs` and `../mocks/make-mocks.mjs` draw them.

import { ball, kit, placeBall, placeBrick } from "./kit.mjs";
import {
  CAPSULES,
  LEGEND,
  brickArt,
  capsule,
  heading,
  panelBox,
  star,
  symbol,
  wallThumb,
} from "./scene.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */

const { text, rect, circle, line, polyline, arc, mix, num } = kit;

/**
 * What a kind of brick is called in a panel, and what it says of it.
 *
 * @type {Record<string, [string, string]>}
 */
export const KIND_WORDS = {
  plain: ["Brick", "breaks at a hit"],
  tough: ["Tough brick", "a pip for each hit left"],
  steel: ["Steel brick", "never breaks"],
  blast: ["Blast brick", "hits the eight around it"],
  gift: ["Gift brick", "always drops a capsule"],
  ghost: ["Ghost brick", "unseen until it is hit"],
  regrow: ["Regrowing brick", "back in 10 seconds"],
  plated: ["Plated brick", "turns a ball from below"],
  cage: ["Cage", "two hits free a friend"],
  key: ["Key brick", "the last one opens the gates"],
  gate: ["Gate", "steel until the keys are gone"],
  portal: ["Portal", "in one, out of its twin"],
  bumper: ["Bumper", "round: turns a ball any way"],
  slider: ["Slider", "slides a cell at a time"],
};

/**
 * Returns the kinds of brick a level's picture holds, in the catalog's
 * order, but the plain brick, which every level has.
 *
 * @param {string[]} rows
 * @returns {string[]}
 */
export function kindsIn(rows) {
  const found = new Set(
    rows.flatMap((picture) => [...picture].map((c) => LEGEND[c]?.kind)),
  );
  return Object.keys(KIND_WORDS).filter(
    (kind) => kind !== "plain" && found.has(kind),
  );
}

/**
 * Draws the bench: a plank on two legs, and the lives waiting on it.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y The plank's top.
 * @param {number} w
 * @param {number} lives How many wait.
 * @param {number} r A fuzzball's radius.
 * @returns {string}
 */
export function bench(pal, x, y, w, lives, r) {
  const wood = mix(pal.field, pal.text, 0.28);
  const dark = mix(pal.field, pal.text, 0.16);
  /** @type {string[]} */
  const out = [
    rect(x + w * 0.12, y + 6, 8, r * 1.1, { rx: 3, fill: dark }),
    rect(x + w * 0.88 - 8, y + 6, 8, r * 1.1, { rx: 3, fill: dark }),
    rect(x, y, w, 9, { rx: 4.5, fill: wood }),
  ];
  const step = Math.min(r * 2.5, (w - 2 * r) / Math.max(1, lives - 0.4));
  for (let i = 0; i < lives; i++) {
    out.push(
      placeBall(ball(pal), x + r * 1.5 + i * step, y - r * 0.92, r * 0.8),
    );
  }
  return out.join("");
}

/**
 * @typedef {object} BenchPanel
 * @property {number} number The level's number.
 * @property {string} name
 * @property {string} set Its set's name.
 * @property {number} inSet Its place in its set, from 1.
 * @property {number} setSize
 * @property {boolean[]} stars Which of the level's three stars are held.
 * @property {number} mark The streak its third star asks for.
 * @property {number} lives How many lives wait on the bench.
 * @property {{ number: number, name: string, rows: string[], tints?: string[] } | null} next
 * @property {string} best
 * @property {string} [place] Its set's place.
 */

/**
 * Draws the left panel, "The bench".
 *
 * @param {Palette} pal
 * @param {number} w
 * @param {number} h
 * @param {BenchPanel} info
 * @returns {string}
 */
export function benchPanel(pal, w, h, info) {
  const compact = h < 400;
  const pad = compact ? 14 : 20;
  /** @type {string[]} */
  const out = [panelBox(pal, 0, 0, w, h)];
  let y = pad + 12;
  out.push(
    heading(pal, pad, y, `Level ${info.number} · ${info.set}`),
    text(pad, y + (compact ? 26 : 32), info.name, {
      size: compact ? 18 : 24,
      weight: 700,
      fill: pal.text,
    }),
  );
  y += compact ? 40 : 50;
  // The set, a pip a level.
  const pip = (w - 2 * pad - (info.setSize - 1) * 4) / info.setSize;
  for (let i = 0; i < info.setSize; i++) {
    const at = i + 1;
    out.push(
      rect(pad + i * (pip + 4), y, pip, 7, {
        rx: 3.5,
        fill:
          at < info.inSet
            ? pal.accent
            : at === info.inSet
              ? pal.text
              : mix(pal.field, pal.text, 0.16),
      }),
    );
  }
  y += compact ? 28 : 40;

  // The stars.
  const goals = ["Clear the level", "Lose no life", `A streak of ${info.mark}`];
  if (compact) {
    goals.forEach((_, i) => {
      out.push(star(pal, pad + 11 + i * 28, y + 2, 10, info.stars[i]));
    });
    out.push(
      text(pad + 92, y + 6, `streak ${info.mark}`, {
        size: 11.5,
        fill: pal.muted,
      }),
    );
    y += 30;
  } else {
    out.push(heading(pal, pad, y, "Stars"));
    goals.forEach((words, i) => {
      const rowY = y + 28 + i * 28;
      out.push(
        star(pal, pad + 10, rowY - 4.5, 9.5, info.stars[i]),
        text(pad + 30, rowY, words, {
          size: 14,
          fill: info.stars[i] ? pal.text : pal.muted,
        }),
      );
    });
    out.push(
      text(w - pad, y + 28, info.best, {
        size: 12,
        fill: pal.muted,
        anchor: "end",
      }),
    );
    y += 120;
  }

  // The bench.
  out.push(heading(pal, pad, y, "The bench"));
  const r = compact ? 15 : 21;
  out.push(
    bench(pal, pad, y + (compact ? 48 : 66), w - 2 * pad, info.lives, r),
    text(pad, y + (compact ? 84 : 112), `${info.lives} waiting`, {
      size: compact ? 12 : 14,
      fill: pal.text,
    }),
  );
  if (!compact) {
    out.push(
      text(w - pad, y + 112, "a life at 20,000", {
        size: 12,
        fill: pal.muted,
        anchor: "end",
      }),
    );
  }
  y += compact ? 100 : 150;

  // The level after this one.
  if (info.next && !compact) {
    out.push(heading(pal, pad, y, "Next"));
    const thumb = wallThumb(
      pal,
      info.next.rows,
      info.next.tints,
      pad,
      y + 14,
      150,
    );
    out.push(
      thumb.svg,
      text(pad + 166, y + 36, `${info.next.number}`, {
        size: 13,
        fill: pal.muted,
      }),
      text(pad + 166, y + 58, info.next.name, {
        size: 17,
        weight: 700,
        fill: pal.text,
      }),
    );
    const kinds = kindsIn(info.next.rows).slice(0, 3);
    kinds.forEach((kind, i) => {
      out.push(
        text(pad + 166, y + 82 + i * 18, KIND_WORDS[kind][0], {
          size: 12,
          fill: pal.muted,
        }),
      );
    });
  }
  return out.join("\n");
}

/**
 * @typedef {object} PlayPanel
 * @property {number} streak The bricks broken since the paddle.
 * @property {{ id: string, share: number, left: string }[]} effects The effects in play.
 * @property {string[]} rows The level's picture, for its kinds.
 * @property {string[]} falls The capsules that fall in the level.
 * @property {number} [friends] How many friends are in play.
 */

/** From how many bricks each multiplier starts (src/rules/tuning.ts). */
const STREAK = [
  [5, 2],
  [10, 3],
  [20, 4],
];

/**
 * Returns the multiplier a streak has come to.
 *
 * @param {number} streak
 * @returns {number}
 */
export function timesOf(streak) {
  return STREAK.reduce((times, [from, to]) => (streak >= from ? to : times), 1);
}

/**
 * Draws the right panel, "In play".
 *
 * @param {Palette} pal
 * @param {number} w
 * @param {number} h
 * @param {PlayPanel} info
 * @returns {string}
 */
export function playPanel(pal, w, h, info) {
  const compact = h < 400;
  const pad = compact ? 14 : 20;
  /** @type {string[]} */
  const out = [panelBox(pal, 0, 0, w, h)];
  let y = pad + 12;

  // The streak: its multiplier, large, and a meter to the next.
  const times = timesOf(info.streak);
  out.push(
    heading(pal, pad, y, "Streak"),
    text(pad, y + (compact ? 44 : 58), `×${times}`, {
      size: compact ? 36 : 50,
      weight: 800,
      fill: times > 1 ? pal.warning : pal.muted,
    }),
    text(
      pad + (compact ? 62 : 86),
      y + (compact ? 30 : 38),
      `${info.streak} bricks`,
      {
        size: compact ? 13 : 16,
        weight: 700,
        fill: pal.text,
      },
    ),
    text(
      pad + (compact ? 62 : 86),
      y + (compact ? 46 : 58),
      "since the paddle",
      {
        size: compact ? 11 : 12.5,
        fill: pal.muted,
      },
    ),
  );
  y += compact ? 60 : 78;
  const bar = w - 2 * pad;
  const most = 20;
  out.push(
    rect(pad, y, bar, 8, { rx: 4, fill: mix(pal.field, pal.text, 0.14) }),
    rect(pad, y, (bar * Math.min(most, info.streak)) / most, 8, {
      rx: 4,
      fill: pal.warning,
    }),
  );
  for (const [from, to] of STREAK) {
    const x = pad + (bar * from) / most;
    out.push(
      line([x, y - 3], [x, y + 11], {
        stroke: info.streak >= from ? pal.warning : pal.muted,
        sw: 2,
        cap: "butt",
      }),
      text(x, y + 26, `×${to}`, {
        size: 11.5,
        weight: 700,
        fill: info.streak >= from ? pal.warning : pal.muted,
        anchor: from === most ? "end" : "middle",
      }),
    );
  }
  y += compact ? 46 : 62;

  // The effects in play, each with a ring that empties.
  out.push(heading(pal, pad, y, "In play"));
  const ring = compact ? 13 : 17;
  if (compact) {
    info.effects.forEach((effect, i) => {
      const cx = pad + ring + i * (ring * 2 + 44);
      const cy = y + 14 + ring;
      out.push(effectRing(pal, effect, cx, cy, ring));
      out.push(
        text(cx + ring + 6, cy + 4.5, effect.left, {
          size: 12,
          fill: pal.text,
        }),
      );
    });
    y += 60;
  } else {
    info.effects.forEach((effect, i) => {
      const cy = y + 34 + i * 44;
      out.push(
        effectRing(pal, effect, pad + ring, cy, ring),
        text(pad + ring * 2 + 14, cy + 5, CAPSULES[effect.id].name, {
          size: 15,
          weight: 600,
          fill: pal.text,
        }),
        text(w - pad, cy + 5, effect.left, {
          size: 13,
          fill: pal.muted,
          anchor: "end",
        }),
      );
    });
    if (info.effects.length === 0) {
      out.push(
        text(pad, y + 38, "No capsule in effect", {
          size: 13,
          fill: pal.muted,
        }),
      );
    }
    y += 26 + Math.max(1, info.effects.length) * 44 + 12;
  }

  if (compact) return out.join("\n");

  // The kinds of brick in the level.
  out.push(heading(pal, pad, y, "In this level"));
  const kinds = kindsIn(info.rows).slice(0, 4);
  kinds.forEach((kind, i) => {
    const rowY = y + 16 + i * 46;
    const cell = Object.values(LEGEND).find((entry) => entry.kind === kind) ?? {
      kind,
    };
    out.push(
      rect(pad, rowY, w - 2 * pad, 40, { rx: 8, fill: pal.page }),
      placeBrick(brickArt(pal, cell, "blue"), pad + 8, rowY + 6, 56),
      text(pad + 76, rowY + 18, KIND_WORDS[kind][0], {
        size: 13.5,
        weight: 700,
        fill: pal.text,
      }),
      text(pad + 76, rowY + 33, KIND_WORDS[kind][1], {
        size: 11.5,
        fill: pal.muted,
      }),
    );
  });
  y += 16 + kinds.length * 46 + 22;

  // The capsules that fall here.
  if (info.falls.length && y + 60 < h) {
    out.push(heading(pal, pad, y, "Capsules here"));
    info.falls.forEach((id, i) => {
      out.push(
        `<g transform="translate(${num(pad + (i % 7) * 40)} ${num(y + 14 + Math.floor(i / 7) * 24)}) scale(0.225)">${capsule(pal, id)}</g>`,
      );
    });
  }
  return out.join("\n");
}

/**
 * Draws an effect's ring, as much of it as its time has left, about its
 * capsule's symbol.
 *
 * @param {Palette} pal
 * @param {{ id: string, share: number }} effect
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {string}
 */
export function effectRing(pal, effect, cx, cy, r) {
  const color = CAPSULES[effect.id].tone === "good" ? pal.accent : pal.danger;
  return (
    circle(cx, cy, r, { stroke: mix(pal.field, color, 0.28), sw: r * 0.2 }) +
    polyline(arc(cx, cy, r, -90, -90 + 360 * effect.share, 24), {
      stroke: color,
      sw: r * 0.2,
    }) +
    symbol(effect.id, cx, cy, r * 1.05, color)
  );
}
