// Splits each trace's frames into where their time goes, in median milliseconds a frame: the page's animation frame (the game's script and Phaser's, with the WebGL calls it makes), the page's other main-thread work (style, layout, pre-paint, paint, commit), and the GPU process's main thread, all its tasks (gpuMain) and those that run the command buffers (gpuTasks), each frame's from one animation frame's start to the next.
// Usage: node split.mjs <trace.json>...
import { readFileSync } from "node:fs";

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const rows = {
  animationFrame: [],
  layoutAndPaint: [],
  gpuMain: [],
  gpuTasks: [],
};
for (const file of process.argv.slice(2)) {
  const trace = JSON.parse(readFileSync(file, "utf8"));
  const events = Array.isArray(trace) ? trace : trace.traceEvents;
  const names = new Map();
  for (const e of events)
    if (e.ph === "M" && (e.name === "thread_name" || e.name === "process_name"))
      names.set(
        e.name === "thread_name" ? `${e.pid}:${e.tid}` : `p${e.pid}`,
        e.args.name,
      );
  const counts = new Map();
  for (const e of events)
    if (e.name === "FireAnimationFrame")
      counts.set(
        `${e.pid}:${e.tid}`,
        (counts.get(`${e.pid}:${e.tid}`) ?? 0) + 1,
      );
  const [pid, tid] = [...counts]
    .sort((a, b) => b[1] - a[1])[0][0]
    .split(":")
    .map(Number);
  const gpuKey = [...names].find(
    ([k, v]) =>
      v === "CrGpuMain" && names.get(`p${k.split(":")[0]}`) === "GPU Process",
  )?.[0];
  const [gpid, gtid] = (gpuKey ?? "-1:-1").split(":").map(Number);
  const fires = events
    .filter(
      (e) =>
        e.pid === pid &&
        e.tid === tid &&
        e.ph === "X" &&
        e.name === "FireAnimationFrame",
    )
    .sort((a, b) => a.ts - b.ts);
  const OTHER = new Set([
    "UpdateLayoutTree",
    "Layout",
    "RecalculateStyles",
    "PrePaint",
    "Layerize",
    "Paint",
    "Commit",
    "UpdateLayer",
    "UpdateLayerTree",
    "HitTest",
  ]);
  const others = events.filter(
    (e) => e.pid === pid && e.tid === tid && e.ph === "X" && OTHER.has(e.name),
  );
  const gpu = events.filter(
    (e) =>
      e.pid === gpid &&
      e.tid === gtid &&
      e.ph === "X" &&
      e.name === "ThreadControllerImpl::RunTask",
  );
  const gpuTasks = events.filter(
    (e) =>
      e.pid === gpid && e.tid === gtid && e.ph === "X" && e.name === "GPUTask",
  );
  const within = (list, from, to) =>
    list
      .filter((e) => e.ts >= from && e.ts < to)
      .reduce((sum, e) => sum + e.dur, 0) / 1000;
  for (let i = 0; i + 1 < fires.length; i++) {
    const [from, to] = [fires[i].ts, fires[i + 1].ts];
    rows.animationFrame.push(fires[i].dur / 1000);
    rows.layoutAndPaint.push(within(others, from, to));
    rows.gpuMain.push(within(gpu, from, to));
    rows.gpuTasks.push(within(gpuTasks, from, to));
  }
}
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(rows).map(([k, v]) => [k, median(v).toFixed(2)]),
    ),
  ),
);
