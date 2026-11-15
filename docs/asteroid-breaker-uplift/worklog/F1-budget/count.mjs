// Counts the WebGL calls a frame makes (draws, the quads they draw, program and texture switches, uniforms, buffer uploads) over two seconds of the game served on port 9141 (or PORT), in a headless Chrome of its own started as trace.mjs starts it; CHROME names the browser.
// Usage: node count.mjs <out.json> <init script> <go script> [ms to wait after going on before counting]
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [out, initPath, goPath, waitArg] = process.argv.slice(2);
const COUNTER = `(() => {
  const counts = {};
  const wrap = (proto, names) => {
    for (const name of names) {
      const original = proto[name];
      if (typeof original !== "function") continue;
      proto[name] = function (...args) {
        counts[name] = (counts[name] ?? 0) + 1;
        // A draw's indices, six to a quad, say how many quads it drew.
        if (name === "drawElements") counts.quads = (counts.quads ?? 0) + args[1] / 6;
        return original.apply(this, args);
      };
    }
  };
  const names = ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced", "useProgram", "bindTexture", "bufferSubData", "bufferData", "bindFramebuffer", "scissor", "uniform1f", "uniform1i", "uniform2f", "uniform3f", "uniform4f", "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv", "uniformMatrix4fv", "uniformMatrix3fv", "texSubImage2D", "texImage2D", "clear"];
  for (const ctx of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) if (ctx) wrap(ctx.prototype, names);
  let frames = 0;
  const tick = () => { frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  globalThis.__glCounts = { reset() { for (const k of Object.keys(counts)) delete counts[k]; frames = 0; }, read() { return { frames, counts: { ...counts } }; } };
})();`;

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
  await page("Page.addScriptToEvaluateOnNewDocument", { source: COUNTER });
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

  await page("Runtime.evaluate", {
    expression: "globalThis.__glCounts.reset()",
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const read = await page("Runtime.evaluate", {
    expression: "globalThis.__glCounts.read()",
    returnByValue: true,
  });
  const { frames, counts } = read.result.value;
  const perFrame = Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Number((v / frames).toFixed(1))]),
  );
  writeFileSync(out, JSON.stringify({ frames, perFrame }, null, 1));
  console.log(JSON.stringify({ frames, perFrame }));
  socket.close();
} finally {
  chrome.kill();
  await new Promise((resolve) =>
    chrome.exitCode === null ? chrome.once("exit", resolve) : resolve(),
  );
  rmSync(profile, { recursive: true, force: true, maxRetries: 10 });
}
