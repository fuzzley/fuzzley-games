// Plays the game served on port 9141 (or PORT) in a headless Chrome of its own and takes a run of screenshots, to look at its flourishes; CLIP=x,y,width,height takes only that part of the page, and CHROME names the browser.
// Usage: node look.mjs <out prefix> <init script> <go script> <width> <height> <reduce: 0|1> <shots> <ms between> [ms before the first]
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [
  prefix,
  initPath,
  goPath,
  width,
  height,
  reduce,
  shots,
  between,
  before,
] = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), "f1-look-"));
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
  const errors = [];
  listeners.push((message) => {
    if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      );
    if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "error"
    )
      errors.push(
        message.params.args.map((a) => a.value ?? a.description).join(" "),
      );
  });
  await page("Runtime.enable");
  await page("Page.enable");
  await page("Emulation.setDeviceMetricsOverride", {
    width: Number(width),
    height: Number(height),
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page("Emulation.setFocusEmulationEnabled", { enabled: true });
  await page("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduce === "1" ? "reduce" : "no-preference",
      },
    ],
  });
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
  await new Promise((resolve) => setTimeout(resolve, Number(before ?? 0)));
  const times = [];
  const started = Date.now();
  for (let i = 0; i < Number(shots); i++) {
    // CLIP="x,y,width,height" takes only that part of the page, which is quicker.
    const clip = process.env.CLIP?.split(",").map(Number);
    const shot = await page("Page.captureScreenshot", {
      format: "png",
      ...(clip
        ? {
            clip: {
              x: clip[0],
              y: clip[1],
              width: clip[2],
              height: clip[3],
              scale: 1,
            },
          }
        : {}),
    });
    times.push(Date.now() - started);
    writeFileSync(
      `${prefix}-${String(i).padStart(2, "0")}.png`,
      Buffer.from(shot.data, "base64"),
    );
    await new Promise((resolve) => setTimeout(resolve, Number(between)));
  }
  console.error("shot at (ms):", times.join(" "));
  console.error(
    errors.length === 0 ? "no errors" : `errors: ${errors.join(" | ")}`,
  );
  socket.close();
} finally {
  chrome.kill();
  await new Promise((resolve) =>
    chrome.exitCode === null ? chrome.once("exit", resolve) : resolve(),
  );
  rmSync(profile, { recursive: true, force: true, maxRetries: 10 });
}
