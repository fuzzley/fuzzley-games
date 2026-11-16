// Says where profiled traces' time goes under a part of the code, in ms a frame, through the build's source maps: for
// each sample whose stack holds a frame whose "source fn" matches a pattern, the frames just under the deepest match
// (its callees, by source, fn and line, DEPTH of them, 1 unless it says) and the sample's own frame, the top N of each
// (30 unless it says). It maps any script served from localhost through the dist folder's maps.
// Usage: node hot.mjs <dist folder> <pattern> <trace.json>...
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, basename } from "node:path";
const require = createRequire(
  new URL("../../../../frontend/package.json", import.meta.url),
);
const { SourceMapConsumer } = require("source-map-js");

const [dist, pattern, ...files] = process.argv.slice(2);
const re = new RegExp(pattern);
const depth = Number(process.env.DEPTH ?? 1);
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
const callee = new Map();
const own = new Map();
let framesAll = 0;
let under = 0;
const add = (map, key, us) => map.set(key, (map.get(key) ?? 0) + us);
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
      if (us > 20_000) continue;
      selfUs.set(samples[i], (selfUs.get(samples[i]) ?? 0) + us);
    }
  }
  const mapped = new Map();
  const mapNode = (node) => {
    if (mapped.has(node.id)) return mapped.get(node.id);
    const { url, lineNumber, columnNumber, functionName } = node.callFrame;
    let source = url ? basename(url) : `(${functionName || "native"})`;
    let fn = functionName;
    let line = lineNumber + 1;
    if (url && url.includes("localhost")) {
      const at = consumerFor(url)?.originalPositionFor({
        line: lineNumber + 1,
        column: columnNumber,
      });
      if (at?.source) {
        source = at.source
          .replace(/^.*?(node_modules\/|src\/|lib\/)/, "$1")
          .replace(/^node_modules\/phaser\/dist\/phaser\.esm\.js$/, "phaser")
          .replace(/^.*\/lib\/([a-z-]+)\/src\//, "@fz/$1/");
        fn = at.name ?? functionName;
        line = at.line;
      }
    }
    const result = { source, fn, line, key: `${source} ${fn}` };
    mapped.set(node.id, result);
    return result;
  };
  const parents = new Map();
  for (const node of nodes.values()) {
    if (node.parent !== undefined) parents.set(node.id, node.parent);
    for (const child of node.children ?? []) parents.set(child, node.id);
  }
  for (const [id, us] of selfUs) {
    const stack = [];
    for (let at = id; at !== undefined; at = parents.get(at))
      stack.unshift(mapNode(nodes.get(at)));
    const last = stack.findLastIndex((f) => re.test(f.key));
    if (last < 0) continue;
    under += us;
    const below = stack.slice(last + 1, last + 1 + depth);
    add(
      callee,
      below.length
        ? below.map((f) => `${f.source}:${f.line} ${f.fn}`).join(" > ")
        : "(self)",
      us,
    );
    const self = stack[stack.length - 1];
    add(own, `${self.source}:${self.line} ${self.fn}`, us);
  }
}
const show = (title, map, n = 30) => {
  console.log(`== ${title}`);
  for (const [k, us] of [...map].sort((a, b) => b[1] - a[1]).slice(0, n))
    console.log(`${(us / 1000 / framesAll).toFixed(4)}  ${k}`);
};
console.log(
  `${files.length} traces, ${framesAll} frames, ${(under / 1000 / framesAll).toFixed(4)} ms a frame under ${pattern}`,
);
show("callee", callee, Number(process.env.N ?? 30));
show("own", own, Number(process.env.N ?? 30));
