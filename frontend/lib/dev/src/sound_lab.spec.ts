import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { type Server, createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { headTags } from "@fz/style/vite";
import { type Plugin, type ViteDevServer, build, createServer } from "vite";
import {
  SOUND_LAB_PATH,
  pageModules,
  soundLab,
  soundLabHtml,
} from "./sound_lab.ts";

/** A game's lab module, typed, as Vite's compiler must strip it. */
const LAB = "const loud: number = 1;\nexport { loud };\n";

/** A plugin that turns Vite's compiler off, as Analog's does unless the config sets it. */
const COMPILER_OFF: Plugin = {
  name: "compiler-off",
  config: () => ({ oxc: false }),
};

/** The lab as the specs' game describes it. */
const PAGE = { entry: "tools/lab.ts", title: "Sound lab: <Game>" };

let root: string;
let vite: ViteDevServer | null = null;
let http: Server | null = null;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fz-sound-lab-"));
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><title>Game</title>",
  );
});

afterEach(async () => {
  await vite?.close();
  vite = null;
  const server = http;
  if (server !== null) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
  http = null;
  await rm(root, { recursive: true, force: true });
});

/**
 * Serves the specs' game with the lab under a base, after a plugin that
 * turns Vite's compiler off and any others given, and returns its address.
 */
async function serve(
  base: string,
  plugins: readonly Plugin[] = [],
): Promise<string> {
  await writeFile(join(root, "lab.ts"), LAB);
  vite = await createServer({
    root,
    base,
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    plugins: [COMPILER_OFF, ...plugins, soundLab({ ...PAGE, entry: "lab.ts" })],
  });
  const server = createHttpServer(vite.middlewares);
  http = server;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

describe("soundLabHtml", () => {
  it("loads the lab's module from the game's folder", () => {
    const html = soundLabHtml(PAGE);

    expect(html).toContain(
      '<script type="module" src="/tools/lab.ts"></script>',
    );
  });

  it("writes the title as text", () => {
    const html = soundLabHtml(PAGE);

    expect(html).toContain("<title>Sound lab: &lt;Game&gt;</title>");
  });
});

describe("pageModules", () => {
  it("matches the game's entry under its folder", () => {
    const modules = pageModules("/games/rocks", "tools/lab.ts");

    expect(modules.test("/games/rocks/tools/lab.ts")).toBe(true);
  });

  it("matches the page's own modules", () => {
    const modules = pageModules("/games/rocks", "tools/lab.ts");

    expect(
      modules.test(join(import.meta.dirname, "zzfx.ts").replaceAll("\\", "/")),
    ).toBe(true);
  });

  it("matches nothing else, the game's own code among it", () => {
    const modules = pageModules("/games/rocks", "tools/lab.ts");

    expect(modules.test("/games/rocks/src/main.ts")).toBe(false);
  });
});

describe("soundLab", () => {
  it("serves the page at sound-lab/ under the dev server's base", async () => {
    const at = await serve("/play/rocks/");

    const response = await fetch(`${at}/play/rocks/${SOUND_LAB_PATH}`);

    expect(response.headers.get("content-type")).toBe("text/html");
    expect(await response.text()).toContain('src="/play/rocks/lab.ts"');
  });

  it("has the palette loaded once, from the tag @fz/style's plugin writes in every page", async () => {
    const at = await serve("/play/rocks/", [headTags()]);

    const html = await (
      await fetch(`${at}/play/rocks/${SOUND_LAB_PATH}`)
    ).text();

    const scripts = [...html.matchAll(/<script\b[^>]*theme\.js[^>]*>/g)].map(
      ([tag]) => tag,
    );

    expect(scripts).toEqual(['<script src="/play/rocks/theme.js">']);
  });

  it("moves the page's path without its slash to the page", async () => {
    const at = await serve("/play/rocks/");

    const response = await fetch(`${at}/play/rocks/sound-lab`, {
      redirect: "manual",
    });

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/play/rocks/sound-lab/");
  });

  it("compiles the lab's module where the compiler was turned off, as Analog's plugin turns it", async () => {
    const at = await serve("/");

    const code = await (await fetch(`${at}/lab.ts`)).text();

    expect(code).toContain("const loud = 1");
  });

  it("leaves every other address to the server", async () => {
    const at = await serve("/");

    const response = await fetch(`${at}/index.html`);

    expect(await response.text()).toContain("<title>Game</title>");
  });

  it("puts nothing of the page in a build", async () => {
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [soundLab(PAGE)],
    });

    const built = await readdir(join(root, "dist"), { recursive: true });

    expect(built).toEqual(["index.html"]);
  });
});
