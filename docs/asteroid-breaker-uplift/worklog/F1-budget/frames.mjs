// Prints the median frame's scripting and rendering on a trace's page, from one animation frame's start to the next.
// Usage: node frames.mjs <trace.json>... (PORT names the page's port, 9141 unless it says)
import { readFileSync } from "node:fs";

const SCRIPTING = new Set([
  "FireAnimationFrame",
  "FunctionCall",
  "EvaluateScript",
  "TimerFire",
  "EventDispatch",
  "RunMicrotasks",
  "v8.callFunction",
  "MajorGC",
  "MinorGC",
  "V8.GCScavenger",
  "V8.GCCompactor",
]);
const RENDERING = new Set([
  "UpdateLayoutTree",
  "Layout",
  "RecalculateStyles",
  "PrePaint",
  "Layerize",
  "HitTest",
  "UpdateLayer",
  "UpdateLayerTree",
  "IntersectionObserverController::computeIntersections",
]);
const PAINTING = new Set(["Paint", "Commit", "CompositeLayers", "PaintImage"]);

const port = process.env.PORT ?? "9141";
const frames = [];
for (const file of process.argv.slice(2)) {
  const trace = JSON.parse(readFileSync(file, "utf8"));
  const events = Array.isArray(trace) ? trace : trace.traceEvents;
  const started = events.find((e) => e.name === "TracingStartedInBrowser");
  // The page's main thread: as the trace's start names it, or, in a trace that names no frames, the thread that ran the most animation frames.
  let pid, tid;
  const frame = started?.args?.data?.frames?.find((f) =>
    f.url.includes(`localhost:${port}`),
  );
  if (frame) {
    pid = frame.processId;
    tid = events.find(
      (e) =>
        e.ph === "M" &&
        e.name === "thread_name" &&
        e.pid === pid &&
        e.args.name === "CrRendererMain",
    ).tid;
  } else {
    const counts = new Map();
    for (const e of events)
      if (e.name === "FireAnimationFrame")
        counts.set(
          `${e.pid}:${e.tid}`,
          (counts.get(`${e.pid}:${e.tid}`) ?? 0) + 1,
        );
    [pid, tid] = [...counts]
      .sort((a, b) => b[1] - a[1])[0][0]
      .split(":")
      .map(Number);
  }
  const main = events
    .filter(
      (e) =>
        e.pid === pid && e.tid === tid && e.ph === "X" && e.dur !== undefined,
    )
    .sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const kind = (name) =>
    SCRIPTING.has(name) || name.startsWith("V8.GC")
      ? "scripting"
      : RENDERING.has(name)
        ? "rendering"
        : PAINTING.has(name)
          ? "painting"
          : null;
  // Each counted event that no other counted event holds.
  const top = [];
  let reach = -Infinity;
  for (const e of main) {
    const k = kind(e.name);
    if (!k) continue;
    if (e.ts + e.dur <= reach) continue;
    top.push({
      ts: e.ts,
      end: e.ts + e.dur,
      cpu: (e.tdur ?? e.dur) / 1000,
      kind: k,
    });
    reach = Math.max(reach, e.ts + e.dur);
  }
  const starts = main
    .filter((e) => e.name === "FireAnimationFrame")
    .map((e) => e.ts);
  for (let i = 0; i + 1 < starts.length; i++) {
    const sums = { scripting: 0, rendering: 0, painting: 0 };
    let cpu = 0;
    for (const t of top)
      if (t.ts >= starts[i] && t.ts < starts[i + 1]) {
        sums[t.kind] += (t.end - t.ts) / 1000;
        if (t.kind !== "painting") cpu += t.cpu;
      }
    frames.push({
      ...sums,
      both: sums.scripting + sums.rendering,
      cpu,
      gap: (starts[i + 1] - starts[i]) / 1000,
    });
  }
}
const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fix = (n) => n.toFixed(2);
console.log(
  JSON.stringify({
    frames: frames.length,
    scriptingAndRendering: fix(median(frames.map((f) => f.both))),
    scripting: fix(median(frames.map((f) => f.scripting))),
    rendering: fix(median(frames.map((f) => f.rendering))),
    painting: fix(median(frames.map((f) => f.painting))),
    frameGap: fix(median(frames.map((f) => f.gap))),
    // The same frames' scripting and rendering in the main thread's own time, which the machine's other work and the throttle's pauses don't count.
    threadTime: fix(median(frames.map((f) => f.cpu))),
  }),
);
