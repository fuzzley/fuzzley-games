/**
 * Drives a headless Chrome over its debugging protocol, enough to open a
 * page, run script in it and take its picture, with nothing installed.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A page open in a headless Chrome.
 * @typedef {object} Page
 * @property {(expression: string) => Promise<any>} run Runs script in the page and returns its value.
 * @property {(clip?: { x: number, y: number, width: number, height: number }) => Promise<Buffer>} shot Returns the page's picture as a PNG.
 * @property {(type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', x: number, y: number) => Promise<void>} pointer Presses, moves or lifts the pointer.
 * @property {string[]} errors What the page threw or logged as an error.
 * @property {() => Promise<void>} close Closes the page and its Chrome.
 */

/**
 * Opens a page in a headless Chrome of its own.
 * @param {string} url
 * @param {{ width: number, height: number, scale?: number, mobile?: boolean, reducedMotion?: boolean }} view
 * @returns {Promise<Page>}
 */
export async function open(url, view) {
  const profile = mkdtempSync(join(tmpdir(), "fuzz-flux-chrome-"));
  const chrome = spawn(
    process.env.CHROME ?? "google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  /** @type {string} */
  const endpoint = await new Promise((done, fail) => {
    let text = "";
    const timer = setTimeout(
      () => fail(new Error(`Chrome did not start: ${text}`)),
      20000,
    );
    chrome.stderr.on("data", (chunk) => {
      text += chunk;
      const found = /DevTools listening on (ws:\/\/\S+)/.exec(text);
      if (found) {
        clearTimeout(timer);
        done(found[1]);
      }
    });
    chrome.on("exit", () => fail(new Error(`Chrome exited: ${text}`)));
  });

  const socket = new WebSocket(endpoint);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  let next = 0;
  /** @type {Map<number, { done: (value: any) => void, fail: (reason: Error) => void }>} */
  const waiting = new Map();
  /** @type {string[]} */
  const errors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) {
      const call = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) call?.fail(new Error(message.error.message));
      else call?.done(message.result);
    } else if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      errors.push(
        `${details.exception?.description ?? details.text} (line ${details.lineNumber})`,
      );
    } else if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "error"
    ) {
      errors.push(
        message.params.args
          .map(
            (/** @type {{ value?: unknown, description?: string }} */ arg) =>
              arg.value ?? arg.description,
          )
          .join(" "),
      );
    }
  });
  /**
   * Sends one command and returns its result.
   * @param {string} method
   * @param {object} [params]
   * @param {string} [sessionId]
   * @returns {Promise<any>}
   */
  const send = (method, params = {}, sessionId) =>
    new Promise((done, fail) => {
      const id = ++next;
      waiting.set(id, { done, fail });
      socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });

  const { targetId } = await send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: view.width,
      height: view.height,
      deviceScaleFactor: view.scale ?? 1,
      mobile: view.mobile ?? false,
    },
    sessionId,
  );
  if (view.reducedMotion) {
    await send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
      sessionId,
    );
  }
  await send("Page.navigate", { url }, sessionId);
  await new Promise((done) => setTimeout(done, 600));

  return {
    errors,
    run: async (expression) => {
      const { result, exceptionDetails } = await send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      if (exceptionDetails)
        throw new Error(
          exceptionDetails.exception?.description ?? exceptionDetails.text,
        );
      return result.value;
    },
    pointer: async (type, x, y) => {
      await send(
        "Input.dispatchMouseEvent",
        {
          type,
          x,
          y,
          button: "left",
          buttons: type === "mouseReleased" ? 0 : 1,
          clickCount: 1,
          pointerType: "mouse",
        },
        sessionId,
      );
    },
    shot: async (clip) => {
      const { data } = await send(
        "Page.captureScreenshot",
        { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) },
        sessionId,
      );
      return Buffer.from(data, "base64");
    },
    close: async () => {
      socket.close();
      chrome.kill("SIGTERM");
      await new Promise((done) => chrome.once("exit", done));
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
