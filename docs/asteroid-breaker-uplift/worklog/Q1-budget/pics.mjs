// Plays the game served on port 9151 (or PORT) in a headless Chrome of its own on a clock of its own, so two builds draw the same moments: requestAnimationFrame's callbacks run only as it steps them, and performance.now() is its time, held still while the page loads and settles, then moved on a sixtieth of a second a frame. It goes on from the Paused card with Enter, steps 18 frames, holds the gun if told to, and screenshots the canvas at each frame given, counted from there. The page's own CSS animations and a moment crowded with blasts can still differ between two captures of one build, so a difference is checked against a second capture of the same build. CHROME names the browser.
// Usage: node pics.mjs <out prefix> <init script> <palette> <width> <height> <reduce: 0|1> <fire: 0|1> <frames, by commas>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [prefix, initPath, palette, width, height, reduce, fire, marks] =
  process.argv.slice(2);
// The page's clock: requestAnimationFrame's callbacks run only as __frames() calls them, each at a time it moves on by.
const CLOCK = `(() => {
  let now = 1000;
  let next = 1;
  let queue = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    queue.set(next, callback);
    return next++;
  };
  window.cancelAnimationFrame = (handle) => queue.delete(handle);
  window.__frames = (count, step) => {
    for (let i = 0; i < count; i++) {
      now += step;
      const due = queue;
      queue = new Map();
      for (const callback of due.values()) callback(now);
    }
    return now;
  };
})();`;
const profile = mkdtempSync(join(tmpdir(), "q1-pics-"));
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const evaluate = async (expression) =>
    (
      await page("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
    ).result.value;
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
    source: `${CLOCK}\nlocalStorage.setItem("fuzzley-theme", ${JSON.stringify(palette)});\n${readFileSync(initPath, "utf8")}`,
  });
  const loaded = next("Page.loadEventFired");
  await page("Page.navigate", {
    url: `http://localhost:${process.env.PORT ?? "9151"}/`,
  });
  await loaded;
  // Loads with the page's time held still, then lets fonts and sounds settle.
  let ready = 0;
  for (let i = 0; i < 600 && ready < 100; i++) {
    await evaluate("__frames(1, 0)");
    await sleep(30);
    if (
      await evaluate(
        `!!document.querySelector('fz-phaser-canvas[data-state="ready"]') && document.querySelector("app-board")?.hasAttribute("data-field")`,
      )
    )
      ready += 1;
  }
  if (ready < 100) throw new Error("The board never drew.");
  const key = (type, code, name) =>
    evaluate(
      `document.querySelector("app-board").dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, { code: ${JSON.stringify(code)}, key: ${JSON.stringify(name)}, bubbles: true }))`,
    );
  await key("keydown", "Enter", "Enter");
  await key("keyup", "Enter", "Enter");
  await evaluate("__frames(18, 1000 / 60)");
  if (fire === "1") await key("keydown", "Space", " ");
  const clip = await evaluate(
    `(() => { const r = document.querySelector("fz-phaser-canvas canvas").getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 }; })()`,
  );
  let at = 0;
  for (const mark of marks.split(",").map(Number)) {
    await evaluate(`__frames(${mark - at}, 1000 / 60)`);
    at = mark;
    // Lets the canvas's frame reach the screen before it is taken.
    await sleep(100);
    const shot = await page("Page.captureScreenshot", { format: "png", clip });
    writeFileSync(`${prefix}-${mark}.png`, Buffer.from(shot.data, "base64"));
  }
  console.log(`${prefix}: ${marks}`);
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
process.exit(0);
