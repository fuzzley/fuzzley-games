import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

/** The size a page is drawn at, in CSS pixels, and its pixels to each one. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
}

/** Why a function run in a page threw, as DevTools reports it. */
interface ExceptionDetails {
  readonly text: string;
  readonly exception?: { readonly description?: string };
}

/** The results of the DevTools commands the scripts read, by command. */
interface CommandResults {
  "Target.createBrowserContext": { browserContextId: string };
  "Target.createTarget": { targetId: string };
  "Target.attachToTarget": { sessionId: string };
  "Runtime.evaluate": {
    result: { value?: unknown };
    exceptionDetails?: ExceptionDetails;
  };
  "Page.captureScreenshot": { data: string };
}

/** The result of a DevTools command, typed for the ones the scripts read. */
export type ResultOf<M extends string> = M extends keyof CommandResults
  ? CommandResults[M]
  : unknown;

/** What DevTools sends: a reply to a command, or an event. */
interface Message {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
  readonly method?: string;
  readonly params?: unknown;
  readonly sessionId?: string;
}

/** The part of a `WebSocket` a {@link DevToolsConnection} uses. */
export interface DevToolsSocket {
  send(data: string): void;
  close(): void;
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
}

/**
 * A connection to Chrome's DevTools protocol, which sends commands to the
 * browser or, given a session, to one page.
 */
export class DevToolsConnection {
  private readonly socket: DevToolsSocket;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  private waiters: {
    method: string;
    sessionId: string;
    resolve: (params: unknown) => void;
  }[] = [];

  constructor(socket: DevToolsSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      this.receive(JSON.parse(String(event.data)) as Message);
    });
  }

  /** Opens a connection to the browser at a DevTools WebSocket URL. */
  static async open(url: string): Promise<DevToolsConnection> {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new DevToolsConnection(socket);
  }

  /**
   * Sends a command, to the browser or to the page a session names, and
   * returns its result.
   */
  send<M extends string>(
    method: M,
    params: object = {},
    sessionId?: string,
  ): Promise<ResultOf<M>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => {
          resolve(result as ResultOf<M>);
        },
        reject,
      });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  /** Returns a promise of the next event of a kind from a page. */
  next(method: string, sessionId: string): Promise<unknown> {
    return new Promise((resolve) => {
      this.waiters.push({ method, sessionId, resolve });
    });
  }

  /** Closes the connection. */
  close(): void {
    this.socket.close();
  }

  /** Settles the command a reply answers, or the waiters an event satisfies. */
  private receive(message: Message): void {
    if (message.id !== undefined) {
      const command = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) command?.reject(new Error(message.error.message));
      else command?.resolve(message.result);
      return;
    }
    const satisfied = this.waiters.filter(
      (waiter) =>
        waiter.method === message.method &&
        waiter.sessionId === message.sessionId,
    );
    this.waiters = this.waiters.filter((waiter) => !satisfied.includes(waiter));
    for (const waiter of satisfied) waiter.resolve(message.params);
  }
}

/**
 * A page in a browser context of its own, so it starts with nothing stored,
 * driven through DevTools. {@link withPage} opens one.
 */
export class Page {
  private readonly devtools: DevToolsConnection;
  private readonly sessionId: string;

  constructor(devtools: DevToolsConnection, sessionId: string) {
    this.devtools = devtools;
    this.sessionId = sessionId;
  }

  /** Sends a command to this page and returns its result. */
  send<M extends string>(method: M, params: object = {}): Promise<ResultOf<M>> {
    return this.devtools.send(method, params, this.sessionId);
  }

  /** Runs a function in the page before its own scripts, on every load. */
  async beforeLoad<A extends unknown[]>(
    fn: (...args: A) => void,
    ...args: A
  ): Promise<void> {
    await this.send("Page.addScriptToEvaluateOnNewDocument", {
      source: call(fn, args),
    });
  }

  /** Navigates the page and waits for it to load. */
  async navigate(url: string): Promise<void> {
    await this.load("Page.navigate", { url });
  }

  /** Reloads the page and waits for it to load. */
  async reload(): Promise<void> {
    await this.load("Page.reload");
  }

  /**
   * Runs a function in the page and returns what it resolves to. The function
   * is sent as its source, so it can use nothing from the module it is written
   * in, and its arguments and result must survive JSON.
   */
  async evaluate<A extends unknown[], T>(
    fn: (...args: A) => T,
    ...args: A
  ): Promise<Awaited<T>> {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression: call(fn, args),
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(
        exceptionDetails.exception?.description ?? exceptionDetails.text,
      );
    }
    return result.value as Awaited<T>;
  }

  /** Returns a PNG of what the page shows. */
  async screenshot(): Promise<Buffer> {
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
    });
    return Buffer.from(data, "base64");
  }

  private async load(method: string, params: object = {}): Promise<void> {
    const loaded = this.devtools.next("Page.loadEventFired", this.sessionId);
    await this.send(method, params);
    await loaded;
  }
}

/** Returns the source of a call of a function with arguments, sent as JSON. */
function call(fn: (...args: never) => unknown, args: unknown[]): string {
  return `(${String(fn)})(...${JSON.stringify(args)})`;
}

/**
 * Opens a page at a viewport, in a browser context of its own, hands it to
 * `use`, and closes the context once `use` settles.
 */
export async function withPage<T>(
  devtools: DevToolsConnection,
  viewport: Viewport,
  use: (page: Page) => Promise<T>,
): Promise<T> {
  const { browserContextId } = await devtools.send(
    "Target.createBrowserContext",
  );
  try {
    const { targetId } = await devtools.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await devtools.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const page = new Page(devtools, sessionId);
    await page.send("Emulation.setDeviceMetricsOverride", {
      ...viewport,
      mobile: false,
    });
    await page.send("Page.enable");
    return await use(page);
  } finally {
    await devtools.send("Target.disposeBrowserContext", { browserContextId });
  }
}

/** Where Chrome is usually installed, on each platform. */
export const CHROME_PATHS: Readonly<
  Partial<Record<NodeJS.Platform, readonly string[]>>
> = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium"],
};

/** What {@link findChrome} looks at, which a spec can stand in for. */
export interface ChromeSearch {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly platform: NodeJS.Platform;
  readonly exists: (path: string) => Promise<boolean>;
}

/** Returns whether a file exists. */
async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

/**
 * Returns the Chrome to run: the one asked for, `CHROME_PATH`, or the first
 * installed in a usual place.
 */
export async function findChrome(
  requested?: string,
  search: ChromeSearch = {
    env: process.env,
    platform: process.platform,
    exists,
  },
): Promise<string> {
  const asked = requested ?? search.env["CHROME_PATH"];
  if (asked) return asked;
  for (const path of CHROME_PATHS[search.platform] ?? []) {
    if (await search.exists(path)) return path;
  }
  throw new Error("Found no Chrome; pass --chrome or set CHROME_PATH.");
}

/** How long Chrome has to start before a script gives up. */
const LAUNCH_TIMEOUT_MS = 15_000;

/**
 * Starts a headless Chrome on a profile and returns it with the address of
 * its DevTools endpoint.
 */
async function launchChrome(
  chromePath: string,
  profile: string,
): Promise<{ chrome: ChildProcess; endpoint: string }> {
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  // Chrome writes the port it chose, and its endpoint's path, once it listens.
  const portFile = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const contents = await readFile(portFile, "utf8").catch(() => "");
    const [port, path] = contents.split("\n");
    if (port && path) {
      return { chrome, endpoint: `ws://127.0.0.1:${port}${path}` };
    }
    await sleep(100);
  }
  chrome.kill();
  throw new Error(`Chrome did not start within ${LAUNCH_TIMEOUT_MS} ms.`);
}

/** Says which Chrome {@link withChrome} runs, and what its profile is called. */
export interface ChromeOptions {
  /** The Chrome to run, as the command line names it, if it does. */
  readonly chrome?: string | undefined;
  /** What the throwaway profile's folder starts with, such as the script's game. */
  readonly name: string;
}

/**
 * Starts a headless Chrome on a throwaway profile, hands a connection to it
 * to `use`, and once `use` settles, stops Chrome and deletes the profile.
 */
export async function withChrome<T>(
  options: ChromeOptions,
  use: (devtools: DevToolsConnection) => Promise<T>,
): Promise<T> {
  const chromePath = await findChrome(options.chrome);
  const profile = await mkdtemp(join(tmpdir(), `${options.name}-capture-`));
  try {
    const { chrome, endpoint } = await launchChrome(chromePath, profile);
    const exited = once(chrome, "exit");
    try {
      const devtools = await DevToolsConnection.open(endpoint);
      try {
        return await use(devtools);
      } finally {
        devtools.close();
      }
    } finally {
      chrome.kill();
      await exited;
    }
  } finally {
    await rm(profile, { recursive: true, force: true, maxRetries: 10 });
  }
}
