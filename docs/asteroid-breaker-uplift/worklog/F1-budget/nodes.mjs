// Says where Phaser's render of the display list went in profiled traces, by the Phaser classes its samples are in under the camera's render (or, with UNDER=layer, under the innermost layer, every layer's samples together, as a sampled stack can't tell one layer from another), DEPTH of them (2 unless it says), in milliseconds a frame, written as JSON for compare.mjs under "outside".
// Each sampled line of phaser.esm.js is named by the class declared above it in this checkout's copy, so the builds compared must use the same Phaser as this checkout.
// Usage: node nodes.mjs <out.json> <dist folder> <trace.json>... (PORT names the page's port, 9141 unless it says)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, basename, dirname } from "node:path";
const require = createRequire(
  new URL("../../../../frontend/package.json", import.meta.url),
);
const { SourceMapConsumer } = require("source-map-js");
const PHASER = join(
  dirname(require.resolve("phaser/package.json")),
  "dist",
  "phaser.esm.js",
);

const [out, dist, ...files] = process.argv.slice(2);
// The line each Phaser class is declared on, to name the class a sampled line is in.
const classes = [];
readFileSync(PHASER, "utf8")
  .split("\n")
  .forEach((text, i) => {
    const match = /^var (\w+) = new Class\(/.exec(text);
    if (match) classes.push([i + 1, match[1]]);
  });
const classAt = (line) => {
  let lo = 0,
    hi = classes.length - 1,
    found = "?";
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (classes[mid][0] <= line) {
      found = classes[mid][1];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
};
const maps = new Map();
function consumerFor(url) {
  if (maps.has(url)) return maps.get(url);
  const path = join(dist, "assets", `${basename(new URL(url).pathname)}.map`);
  const consumer = existsSync(path)
    ? new SourceMapConsumer(JSON.parse(readFileSync(path, "utf8")))
    : null;
  maps.set(url, consumer);
  return consumer;
}
const sums = {
  part: new Map(),
  source: new Map(),
  rules: new Map(),
  outside: new Map(),
};
let framesAll = 0;
let sampledAll = 0;
for (const file of files) {
  const trace = JSON.parse(readFileSync(file, "utf8"));
  const events = Array.isArray(trace) ? trace : trace.traceEvents;
  const counts = new Map();
  for (const e of events)
    if (e.name === "FireAnimationFrame")
      counts.set(
        `${e.pid}:${e.tid}`,
        (counts.get(`${e.pid}:${e.tid}`) ?? 0) + 1,
      );
  const [mainKey, frames] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const pid = Number(mainKey.split(":")[0]);
  framesAll += frames;
  const nodes = new Map();
  const selfUs = new Map();
  for (const e of events) {
    if (e.name !== "ProfileChunk" || e.pid !== pid) continue;
    const { cpuProfile, timeDeltas } = e.args.data;
    for (const node of cpuProfile?.nodes ?? []) nodes.set(node.id, node);
    const samples = cpuProfile?.samples ?? [];
    for (let i = 0; i < samples.length; i++) {
      const us = timeDeltas[i + 1] ?? timeDeltas[i] ?? 0;
      // The sampler's own start stalls the page for most of a second, which would fall to whichever sample comes before it: a gap that long is left out.
      if (us > 20_000) continue;
      selfUs.set(samples[i], (selfUs.get(samples[i]) ?? 0) + us);
    }
  }
  const mapped = new Map();
  const mapNode = (node) => {
    if (mapped.has(node.id)) return mapped.get(node.id);
    const { url, lineNumber, columnNumber, functionName } = node.callFrame;
    let source = [
      "(idle)",
      "(program)",
      "(garbage collector)",
      "(root)",
    ].includes(functionName)
      ? functionName
      : url
        ? "(other script)"
        : `(${functionName || "native"})`;
    let fn = functionName;
    if (url && url.includes(`localhost:${process.env.PORT ?? "9141"}`)) {
      const at = consumerFor(url)?.originalPositionFor({
        line: lineNumber + 1,
        column: columnNumber,
      });
      if (at?.source) {
        source = at.source
          .replace(/^.*?(node_modules\/|src\/|lib\/)/, "$1")
          .replace(/^node_modules\/(phaser)\/.*/, "phaser")
          .replace(/^.*\/lib\/([a-z-]+)\/src\//, "@fz/$1/");
        fn = at.name ?? functionName;
        if (at.source.includes("node_modules/phaser"))
          fn = `${classAt(at.line)}:${fn}`;
      } else source = basename(url);
    }
    const result = { source, fn };
    mapped.set(node.id, result);
    return result;
  };
  const parents = new Map();
  for (const node of nodes.values()) {
    if (node.parent !== undefined) parents.set(node.id, node.parent);
    for (const child of node.children ?? []) parents.set(child, node.id);
  }
  const isGame = (source) =>
    source.startsWith("src/") || source.startsWith("@fz/");
  const add = (map, key, us) => map.set(key, (map.get(key) ?? 0) + us);
  for (const [id, us] of selfUs) {
    const node = nodes.get(id);
    if (!node) continue;
    const { source } = mapNode(node);
    if (source === "(idle)") continue;
    sampledAll += us;
    add(sums.source, source, us);
    const stack = [];
    for (let at = id; at !== undefined; at = parents.get(at))
      stack.unshift(mapNode(nodes.get(at)));
    const games = stack.filter((f) => isGame(f.source));
    let part = `(outside the game's code: ${source.startsWith("(") ? source : "phaser and the browser"})`;
    if (games.length > 0) {
      const sceneAt = games.findLastIndex(
        (f) => f.source === "src/scene/belt_scene.ts",
      );
      const pick =
        sceneAt >= 0 && sceneAt + 1 < games.length
          ? games[sceneAt + 1]
          : sceneAt >= 0
            ? games[sceneAt]
            : games[0];
      part = `${pick.source} ${pick.fn}`;
    }
    add(sums.part, part, us);
    if (games.length === 0) {
      const phaser = stack.filter((f) => f.source === "phaser");
      const renders = phaser
        .map((f, i) => [f, i])
        .filter(([f]) => /:render$/.test(f.fn ?? ""));
      if (renders.length >= 3) {
        const names = [];
        for (const f of phaser.slice(renders[2][1] + 1)) {
          const name = f.fn.split(":")[0];
          if (names.at(-1) !== name) names.push(name);
        }
        // Under the camera's render: the classes the display list's objects are drawn through, to DEPTH of them.
        const from =
          process.env.UNDER === "layer" && names.includes("Layer")
            ? names.lastIndexOf("Layer") + 1
            : names.indexOf("Camera") + 1;
        const below = names.slice(from, from + Number(process.env.DEPTH ?? 2));
        add(sums.outside, below.join(" > ") || "(the render itself)", us);
      }
    }
    // The rules' own steps: the first rules frame under the outermost one, so the field's step shows its parts.
    const rules = stack.filter((f) => f.source.startsWith("src/rules/"));
    if (rules.length > 0)
      add(
        sums.rules,
        `${(rules[1] ?? rules[0]).source} ${(rules[1] ?? rules[0]).fn}`,
        us,
      );
  }
}
const perFrame = (map) =>
  Object.fromEntries(
    [...map]
      .map(([k, us]) => [k, us / 1000 / framesAll])
      .sort((a, b) => b[1] - a[1]),
  );
writeFileSync(
  out,
  JSON.stringify(
    {
      traces: files.length,
      frames: framesAll,
      sampled: sampledAll / 1000 / framesAll,
      part: perFrame(sums.part),
      rules: perFrame(sums.rules),
      source: perFrame(sums.source),
      outside: perFrame(sums.outside),
    },
    null,
    1,
  ),
);
console.log(
  `${files.length} traces, ${framesAll} frames, ${(sampledAll / 1000 / framesAll).toFixed(3)} ms a frame sampled`,
);
