// Runs probe-page.js in the game served on port 9151 (or PORT), in a headless Chrome of its own started as F1's trace.mjs starts it, the CPU slowed four times, once the run has gone on, writes what it measured as JSON and prints its step, render, update and tick a frame, and each layer's render and painter's draw over 0.04 ms; it exits 1 if the probe throws or errs. SHOT=1 writes a screenshot of its end too, and CHROME names the browser. The build must hand the probe its scene (build.sh's probe build).
// Usage: node probe.mjs <out.json> <init script> <go script> <ms to wait after going on> <probe-page.js> <options as JSON: frames, hide, logFrame, prune>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [out, initPath, goPath, waitArg, probePath, optsArg] =
  process.argv.slice(2);
const waitMs = Number(waitArg ?? 0);
const profile = mkdtempSync(join(tmpdir(), "q1-probe-"));
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
    url: `http://localhost:${process.env.PORT ?? "9151"}/`,
  });
  await loaded;
  const went = await page("Runtime.evaluate", {
    expression: `(${readFileSync(goPath, "utf8").trim().replace(/;$/, "")})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.error("went on:", JSON.stringify(went.result.value));
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const probed = await page("Runtime.evaluate", {
    expression: `(${readFileSync(probePath, "utf8").trim().replace(/;$/, "")})(${optsArg ?? "{}"})`,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = probed.result.value;
  if (probed.exceptionDetails || value?.error) {
    console.error(value?.error ?? JSON.stringify(probed.exceptionDetails));
    process.exitCode = 1;
  } else {
    writeFileSync(out, JSON.stringify(value, null, 1));
    const { step, time } = value;
    const top = Object.entries(time)
      .filter(([key, ms]) => key.includes(":") && ms > 0.04)
      .sort((a, b) => b[1] - a[1])
      .map(([key, ms]) => `${key}=${ms.toFixed(3)}`);
    console.log(
      `step ${step.toFixed(3)} render ${time.render.toFixed(3)} update ${time.update.toFixed(3)} tick ${time.tick.toFixed(3)} | ${top.join(" ")}`,
    );
  }
  if (process.env.SHOT === "1") {
    const shot = await page("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      out.replace(/\.json$/, ".png"),
      Buffer.from(shot.data, "base64"),
    );
  }
  socket.close();
} catch (error) {
  console.error(String(error?.message ?? error).split("\n")[0]);
  process.exitCode = 1;
} finally {
  chrome.kill();
  // A Chrome already gone, by a signal too, has fired its exit event.
  await new Promise((resolve) =>
    chrome.exitCode === null && chrome.signalCode === null
      ? chrome.once("exit", resolve)
      : resolve(),
  );
  rmSync(profile, { recursive: true, force: true, maxRetries: 10 });
}
