/**
 * Builds the feel sketch into one page, `mocks/feel.html`, that plays from a
 * file or a phone with nothing beside it.
 *
 * Run it from anywhere: `node docs/fuzz-flux/sketch/feel/bundle.mjs`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DARK, LIGHT } from "../../art/fuzz.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

/** The modules of the page, each after the ones it takes from. */
const MODULES = [
  "art/fuzz.mjs",
  "sound/synth.mjs",
  "sound/sounds.mjs",
  "sketch/engine.mjs",
  "levels/drafts.mjs",
  "sketch/feel/feel.mjs",
];

/**
 * Returns a module's source as a function that hands back what it exports,
 * its imports taken from the modules made before it.
 * @param {string} file The module, from the design's folder.
 * @returns {string}
 */
function wrap(file) {
  const names = new Set();
  const source = readFileSync(join(root, file), "utf8")
    .replace(
      /^import\s*\{([^}]*)\}\s*from\s*"([^"]+)";?$/gm,
      (_, list, from) => {
        const target = relative(root, resolve(dirname(join(root, file)), from));
        const taken = list
          .split(",")
          .map((/** @type {string} */ name) =>
            name.trim().replace(/\s+as\s+/, ": "),
          )
          .filter(Boolean);
        return `const { ${taken.join(", ")} } = modules[${JSON.stringify(target)}];`;
      },
    )
    .replace(
      /^export (const|let|function|class) ([A-Za-z0-9_$]+)/gm,
      (_, word, name) => {
        names.add(name);
        return `${word} ${name}`;
      },
    );
  if (/^(import|export)\b/m.test(source))
    throw new Error(
      `${file} has an import or export this script does not know`,
    );
  return `modules[${JSON.stringify(file)}] = (() => {\n${source}\nreturn { ${[...names].join(", ")} };\n})();`;
}

/**
 * Returns a palette's roles as CSS custom properties.
 * @param {import('../../art/fuzz.mjs').Palette} palette
 * @returns {string}
 */
function vars(palette) {
  return [
    "page",
    "panel",
    "line",
    "text",
    "muted",
    "accent",
    "warning",
    "danger",
    "spark",
  ]
    .map((role) => `--${role}: ${palette.roles[role]};`)
    .join(" ");
}

const tuned = JSON.parse(
  readFileSync(join(root, "sketch/results.json"), "utf8"),
).levels;

const css = `
  :root { ${vars(DARK)} color-scheme: dark; }
  body.light { ${vars(LIGHT)} color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: var(--page); color: var(--text);
    font: 16px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    overscroll-behavior: none; -webkit-user-select: none; user-select: none;
  }
  main { width: 100%; max-width: 560px; height: 100%; display: flex; flex-direction: column; padding: 8px 8px 10px; gap: 6px; }
  header { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 8px 12px; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px 10px; }
  h1 { font-size: 15px; line-height: 1.15; margin: 0; font-weight: 650; flex: 1 1 110px; min-width: 0; }
  h1 small { display: block; font-size: 11px; font-weight: 500; color: var(--muted); }
  #goals { display: flex; gap: 10px; }
  .goal { display: inline-flex; align-items: center; gap: 2px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .goal.done { color: var(--accent); }
  .goal.bump { animation: bump 240ms cubic-bezier(.3, 1.6, .5, 1); }
  @keyframes bump { 0% { transform: scale(1); } 40% { transform: scale(1.28); } 100% { transform: scale(1); } }
  .moves { display: flex; flex-direction: column; align-items: center; line-height: 1; min-width: 44px; }
  .moves b { font-size: 24px; font-variant-numeric: tabular-nums; }
  .moves small { font-size: 11px; color: var(--muted); }
  #moves.low { color: var(--warning); }
  #wind { display: inline-flex; flex-direction: column; align-items: center; font-size: 11px; color: var(--muted); line-height: 1.1; }
  #wind[hidden] { display: none; }
  #wind svg { transform: rotate(var(--turn, 0deg)); transition: transform 380ms cubic-bezier(.3, 1.4, .5, 1); color: var(--accent); }
  #line { margin: 0; min-height: 2.7em; text-align: center; color: var(--muted); font-size: 14px; padding: 0 6px; }
  .stage { position: relative; flex: 1; min-height: 0; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
  nav { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  button {
    font: inherit; font-size: 14px; color: var(--text); background: var(--panel); border: 1px solid var(--line);
    border-radius: 999px; padding: 9px 14px; min-height: 44px; cursor: pointer;
  }
  button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
  #veil { position: fixed; inset: 0; background: color-mix(in srgb, var(--page) 78%, transparent); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 5; }
  #veil[hidden] { display: none; }
  #card { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 18px 20px; max-width: 420px; width: 100%; max-height: 90%; overflow: auto; text-align: center; animation: rise 260ms cubic-bezier(.3, 1.4, .5, 1); }
  @keyframes rise { from { transform: translateY(16px) scale(.96); opacity: 0; } to { transform: none; opacity: 1; } }
  #card h2 { margin: 0 0 8px; font-size: 22px; }
  #card h3 { margin: 12px 0 6px; font-size: 14px; color: var(--muted); font-weight: 600; text-align: left; }
  #card p { margin: 8px 0; }
  #card svg { vertical-align: middle; }
  .grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; }
  .grid button { padding: 0; min-height: 40px; border-radius: 10px; }
  .stars { font-size: 40px; letter-spacing: 6px; margin: 2px 0; }
  .star { color: var(--line); display: inline-block; }
  .star.on { color: var(--spark); animation: star 420ms cubic-bezier(.3, 1.8, .5, 1) backwards; }
  .star.on:nth-child(1) { animation-delay: 540ms; } .star.on:nth-child(2) { animation-delay: 880ms; } .star.on:nth-child(3) { animation-delay: 1220ms; }
  @keyframes star { from { transform: scale(0) rotate(-40deg); } to { transform: none; } }
  #hand { position: absolute; left: 0; top: 0; width: 26px; height: 26px; margin: -4px 0 0 -8px; border-radius: 50% 50% 50% 8px; background: var(--text); opacity: .9; pointer-events: none; animation: hand 1500ms ease-in-out infinite; box-shadow: 0 2px 8px #0006; }
  #hand[hidden] { display: none; }
  @keyframes hand {
    0%, 15% { transform: translate(var(--x0), var(--y0)) scale(1.15); opacity: 0; }
    25% { transform: translate(var(--x0), var(--y0)) scale(1); opacity: .9; }
    60%, 75% { transform: translate(var(--x1), var(--y1)) scale(1); opacity: .9; }
    100% { transform: translate(var(--x1), var(--y1)) scale(1.15); opacity: 0; }
  }
  @media (min-aspect-ratio: 5/4) {
    main { max-width: 1100px; display: grid; grid-template-columns: 210px 1fr 170px; grid-template-rows: auto 1fr; gap: 12px; padding: 14px; }
    header { grid-column: 1; grid-row: 1; flex-direction: column; align-items: stretch; text-align: center; gap: 12px; padding: 14px; }
    #goals { flex-direction: column; align-items: center; font-size: 20px; }
    .moves b { font-size: 34px; }
    #line { grid-column: 1; grid-row: 2; text-align: left; font-size: 15px; }
    .stage { grid-column: 2; grid-row: 1 / 3; }
    nav { grid-column: 3; grid-row: 1 / 3; flex-direction: column; flex-wrap: nowrap; justify-content: flex-start; }
  }
  @media (prefers-reduced-motion: reduce) { #hand, .goal.bump, .star.on, #card { animation: none; } }
`;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="robots" content="noindex" />
    <title>Fuzz Flux: the feel sketch</title>
    <style>${css}</style>
  </head>
  <body>
    <main>
      <header>
        <h1><small id="level"></small><span id="name">Fuzz Flux</span></h1>
        <span id="wind" hidden>
          <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0 -9V8M-6 2L0 9L6 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span id="wind-in"></span>
        </span>
        <span id="goals" aria-label="Goals"></span>
        <span class="moves"><b id="moves">0</b><small>moves</small></span>
      </header>
      <p id="line"></p>
      <div class="stage">
        <canvas id="board" tabindex="0" aria-label="The board. Use the arrow keys to move, and Space to pick up a fuzzball."></canvas>
        <div id="hand" hidden></div>
      </div>
      <nav>
        <button data-do="hint">Hint</button>
        <button data-do="restart">Restart</button>
        <button data-do="levels">Choose a level</button>
        <button data-do="sound" aria-pressed="true">Sound</button>
        <button data-do="fast" aria-pressed="false">Fast</button>
        <button data-do="calm" aria-pressed="false">Less motion</button>
        <button data-do="light" aria-pressed="false">Light</button>
      </nav>
    </main>
    <div id="veil" hidden><div id="card" role="dialog" aria-modal="true"></div></div>
    <script>
      "use strict";
      globalThis.FUZZ_FLUX_TUNED = ${JSON.stringify(tuned)};
      const modules = {};
      ${MODULES.map(wrap).join("\n")}
    </script>
  </body>
</html>
`;

const out = join(root, "mocks/feel.html");
writeFileSync(out, page);
console.log(
  `${relative(process.cwd(), out)}: ${(page.length / 1024).toFixed(0)} KB`,
);
