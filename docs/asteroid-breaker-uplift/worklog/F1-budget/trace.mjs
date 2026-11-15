// Traces four seconds (or TRACE_MS) of the game served on port 9141 (or PORT) in a headless Chrome of its own (ANGLE on EGL), so no other page shares its GPU process, the CPU slowed four times, and writes the trace, a screenshot of its end and the bar's figures then (.json, .png, .txt); PROFILE=1 samples the stacks too, and CHROME names the browser.
// Usage: node trace.mjs <out.json> <init script> <go script> [ms to wait after going on before tracing]
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [out, initPath, goPath, waitArg] = process.argv.slice(2);
const waitMs = Number(waitArg ?? 0);
const profile = mkdtempSync(join(tmpdir(), "f1-trace-"));
const chrome = spawn(
  process.env.CHROME ?? "/opt/google/chrome/chrome",
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--use-angle=gl-egl",
    "--ozone-platform=headless",
    "--disable-background-timer-throttling",
    "--disable-dev-shm-usage",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

try {
  const endpoint = await new Promise((resolve, reject) => {
    let text = "";
    chrome.stderr.on("data", (chunk) => {
      text += chunk;
      const match = /DevTools listening on (ws:\S+)/.exec(text);
      if (match) resolve(match[1]);
    });
    chrome.on("exit", () => reject(new Error(`Chrome exited: ${text}`)));
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error)
        waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  const next = (method) =>
    new Promise((resolve) => {
      const listener = (message) => {
        if (message.method !== method) return;
        listeners.splice(listeners.indexOf(listener), 1);
        resolve(message.params);
      };
      listeners.push(listener);
    });

  const { targetId } = await send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const page = (method, params) => send(method, params, sessionId);
  await page("Page.enable");
  await page("Emulation.setDeviceMetricsOverride", {
    width: 2100,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page("Emulation.setFocusEmulationEnabled", { enabled: true });
  await page("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page("Page.addScriptToEvaluateOnNewDocument", {
    source: readFileSync(initPath, "utf8"),
  });
  const loaded = next("Page.loadEventFired");
  await page("Page.navigate", {
    url: `http://localhost:${process.env.PORT ?? "9141"}/`,
  });
  await loaded;
  const went = await page("Runtime.evaluate", {
    expression: `(${readFileSync(goPath, "utf8").trim().replace(/;$/, "")})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.error("went on:", JSON.stringify(went.result.value));
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const events = [];
  listeners.push((message) => {
    if (message.method === "Tracing.dataCollected")
      events.push(...message.params.value);
  });
  await send("Tracing.start", {
    transferMode: "ReportEvents",
    traceConfig: {
      includedCategories: [
        "devtools.timeline",
        "disabled-by-default-devtools.timeline",
        "disabled-by-default-devtools.timeline.frame",
        "toplevel",
        "v8.execute",
        "v8",
        "blink.user_timing",
        // PROFILE=1 samples the stacks too, for parts.mjs and nodes.mjs to say where the time goes.
        ...(process.env.PROFILE === "1"
          ? ["disabled-by-default-v8.cpu_profiler"]
          : []),
      ],
      excludedCategories: ["*"],
    },
  });
  // TRACE_MS sets how long the trace runs; four seconds unless it says.
  await new Promise((resolve) =>
    setTimeout(resolve, Number(process.env.TRACE_MS ?? 4000)),
  );
  const complete = next("Tracing.tracingComplete");
  await send("Tracing.end");
  await complete;
  // The bar's figures as the trace ends (the wave, the score, the ships or crew left, in its words for screen readers), to tell a run that went otherwise, such as one whose pod was lost.
  const bar = await page("Runtime.evaluate", {
    expression:
      "document.querySelector('dl.metrics')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''",
    returnByValue: true,
  });
  writeFileSync(out.replace(/\.json$/, ".txt"), String(bar.result.value));
  const shot = await page("Page.captureScreenshot", { format: "png" });
  writeFileSync(
    out.replace(/\.json$/, ".png"),
    Buffer.from(shot.data, "base64"),
  );
  writeFileSync(out, JSON.stringify({ traceEvents: events }));
  console.error(`wrote ${events.length} events to ${out}`);
  socket.close();
} finally {
  chrome.kill();
  await new Promise((resolve) =>
    chrome.exitCode === null ? chrome.once("exit", resolve) : resolve(),
  );
  rmSync(profile, { recursive: true, force: true, maxRetries: 10 });
}
