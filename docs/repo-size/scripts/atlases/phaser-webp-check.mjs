/**
 * Loads one card atlas page as PNG and as several WebP encodings through
 * Phaser's `load.multiatlas()`, as the Solitaire Collection loads its decks,
 * draws each in headless Chrome with the WebGL renderer and the canvas
 * renderer, and compares what each draws with what the PNG draws.
 *
 *   node docs/repo-size/scripts/atlases/phaser-webp-check.mjs [--atlas classic/1x]
 *
 * The page is served from a server of this script's on 127.0.0.1, with
 * Phaser's own build from frontend/node_modules. Each encoding is drawn
 * twice over an opaque felt green: texel for texel, and shrunk to 0.7, so
 * bilinear sampling mixes neighbouring texels, transparent ones included.
 * The pixels are read back from the drawing buffer (WebGL) or the canvas
 * (canvas renderer). Last, it times how long an image element takes to
 * decode each encoding.
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import sharp from "../../../../frontend/node_modules/sharp/dist/index.mjs";
import {
  withChrome,
  withPage,
} from "../../../../frontend/lib/dev/src/chrome.ts";

const REPO = resolve(import.meta.dirname, "../../../..");
const ATLAS = "frontend/games/solitaire/src/engine/render/assets/sprites/atlas";

/** The encodings drawn, each made from the committed PNG. */
const VARIANTS = {
  png: null,
  "webp-lossless": { lossless: true, effort: 6 },
  "webp-lossless-exact": { lossless: true, effort: 6, exact: true },
  "webp-near-60": { nearLossless: true, quality: 60, effort: 6 },
  "webp-q90": {
    quality: 90,
    alphaQuality: 100,
    effort: 6,
    smartSubsample: true,
  },
  "webp-q80": {
    quality: 80,
    alphaQuality: 100,
    effort: 6,
    smartSubsample: true,
  },
};

/**
 * Builds the variants' games in the page, draws each, and returns how far
 * each strays from the PNG's drawing.
 *
 * @param {string[]} names The variants, the PNG first.
 * @param {{w: number, h: number}} size The page's size.
 * @returns {Promise<unknown>}
 */
async function drawInPage(names, size) {
  const Phaser = /** @type {any} */ (globalThis).Phaser;
  const nextFrame = () => new Promise((done) => requestAnimationFrame(done));

  /**
   * Runs one game on a renderer and returns the pixels each variant draws at
   * each scale.
   *
   * @param {number} type
   */
  async function drawAll(type) {
    const parent = document.createElement("div");
    document.body.append(parent);
    /** @type {any} */
    let scene;
    const created = new Promise((done) => {
      new Phaser.Game({
        type,
        parent,
        width: size.w,
        height: size.h,
        backgroundColor: "#1f5f3a",
        banner: false,
        render: { antialias: true, preserveDrawingBuffer: true },
        scene: {
          preload() {
            for (const name of names) {
              this.load.multiatlas(name, `/manifest/${name}.json`);
            }
          },
          create() {
            scene = this;
            done(undefined);
          },
        },
      });
    });
    await created;
    const errors = [];
    const images = names.map((name) => {
      if (!scene.textures.exists(name)) errors.push(`${name} did not load`);
      return scene.add
        .image(0, 0, name, "__BASE")
        .setOrigin(0)
        .setVisible(false);
    });

    /** @type {Record<string, Record<string, Uint8Array>>} */
    const drawn = {};
    for (const scale of [1, 0.7]) {
      for (const [index, name] of names.entries()) {
        images.forEach((image, other) =>
          image.setVisible(other === index).setScale(scale),
        );
        for (let i = 0; i < 4; i++) await nextFrame();
        const canvas = scene.game.canvas;
        let pixels;
        if (scene.game.renderer.gl) {
          const gl = scene.game.renderer.gl;
          pixels = new Uint8Array(size.w * size.h * 4);
          gl.readPixels(
            0,
            0,
            size.w,
            size.h,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
        } else {
          pixels = canvas
            .getContext("2d")
            .getImageData(0, 0, size.w, size.h).data;
        }
        (drawn[scale] ??= {})[name] = pixels;
      }
    }
    const renderer = scene.game.renderer.gl ? "WEBGL" : "CANVAS";
    const glInfo = scene.game.renderer.gl
      ? scene.game.renderer.gl.getParameter(scene.game.renderer.gl.VERSION)
      : "";
    scene.game.destroy(true);

    const results = [];
    for (const [scale, byName] of Object.entries(drawn)) {
      const base = byName[names[0]];
      for (const name of names.slice(1)) {
        const other = byName[name];
        let differing = 0;
        let max = 0;
        let sum = 0;
        for (let i = 0; i < base.length; i += 4) {
          let pixel = 0;
          for (let c = 0; c < 4; c++) {
            const d = Math.abs(base[i + c] - other[i + c]);
            pixel = Math.max(pixel, d);
            sum += d;
          }
          if (pixel > 0) differing++;
          max = Math.max(max, pixel);
        }
        results.push({
          renderer,
          scale: Number(scale),
          name,
          differing,
          max,
          mean: sum / base.length,
        });
      }
    }
    return { renderer, glInfo, errors, results };
  }

  /**
   * Returns the median time an image element takes to decode each variant,
   * from a fresh object URL each time, so no decoded copy is reused.
   */
  async function decodeTimes() {
    /** @type {Record<string, number>} */
    const medians = {};
    for (const name of names) {
      const blob = await (await fetch(`/image/${name}`)).blob();
      const times = [];
      for (let run = 0; run < 7; run++) {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        const started = performance.now();
        image.src = url;
        await image.decode();
        times.push(performance.now() - started);
        URL.revokeObjectURL(url);
      }
      times.sort((a, b) => a - b);
      medians[name] = times[3];
    }
    return medians;
  }

  return {
    phaser: Phaser.VERSION,
    userAgent: navigator.userAgent,
    webgl: await drawAll(Phaser.WEBGL),
    canvas: await drawAll(Phaser.CANVAS),
    decode: await decodeTimes(),
  };
}

async function main() {
  const { values } = parseArgs({ options: { atlas: { type: "string" } } });
  const atlas = values.atlas ?? "classic/1x";
  const manifest = JSON.parse(
    execFileSync(
      "git",
      ["show", `HEAD:${ATLAS}/${atlas}/card_assets_atlas.json`],
      {
        cwd: REPO,
        encoding: "utf8",
      },
    ),
  );
  const texture = manifest.textures[0];
  const png = execFileSync(
    "git",
    ["show", `HEAD:${ATLAS}/${atlas}/${texture.image}`],
    {
      cwd: REPO,
      maxBuffer: 64 * 1024 * 1024,
    },
  );

  /** @type {Record<string, {bytes: Buffer, type: string}>} */
  const images = {};
  for (const [name, options] of Object.entries(VARIANTS)) {
    images[name] = options
      ? { bytes: await sharp(png).webp(options).toBuffer(), type: "image/webp" }
      : { bytes: png, type: "image/png" };
  }
  const phaser = await readFile(
    join(REPO, "frontend/node_modules/phaser/dist/phaser.min.js"),
  );

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const send = (
      /** @type {string} */ type,
      /** @type {Buffer | string} */ body,
    ) => {
      response.writeHead(200, { "content-type": type });
      response.end(body);
    };
    const imageMatch = /^\/image\/(.+)$/.exec(url.pathname);
    const manifestMatch = /^\/manifest\/(.+)\.json$/.exec(url.pathname);
    if (url.pathname === "/") {
      send(
        "text/html",
        '<!doctype html><body style="margin:0"><script src="/phaser.min.js"></script></body>',
      );
    } else if (url.pathname === "/phaser.min.js") {
      send("text/javascript", phaser);
    } else if (imageMatch?.[1] && images[imageMatch[1]]) {
      const image = images[imageMatch[1]];
      send(image.type, image.bytes);
    } else if (manifestMatch?.[1] && images[manifestMatch[1]]) {
      const name = manifestMatch[1];
      send(
        "application/json",
        JSON.stringify({ textures: [{ ...texture, image: `/image/${name}` }] }),
      );
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((done) =>
    server.listen(0, "127.0.0.1", () => done(undefined)),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    const result = await withChrome({ name: "phaser-webp" }, (devtools) =>
      withPage(
        devtools,
        { width: texture.size.w, height: texture.size.h, deviceScaleFactor: 1 },
        async (page) => {
          await page.navigate(`http://127.0.0.1:${port}/`);
          return page.evaluateWith(
            [],
            drawInPage,
            Object.keys(VARIANTS),
            texture.size,
          );
        },
      ),
    );
    const typed = /** @type {any} */ (result);
    console.log(
      `atlas page: ${atlas}/${texture.image}, ${texture.size.w}x${texture.size.h}`,
    );
    console.log(`Phaser ${typed.phaser}; ${typed.userAgent}`);
    for (const name of Object.keys(VARIANTS)) {
      console.log(
        `  ${name.padEnd(20)} ${images[name]?.bytes.length} bytes, served as ${images[name]?.type}`,
      );
    }
    for (const run of [typed.webgl, typed.canvas]) {
      console.log(`\n${run.renderer} ${run.glInfo}`);
      console.log(
        `  load errors: ${run.errors.length ? run.errors.join("; ") : "none"}`,
      );
      for (const r of run.results) {
        console.log(
          `  scale ${String(r.scale).padEnd(4)} ${r.name.padEnd(20)} ` +
            `${r.differing} pixels differ from the PNG's drawing, max ${r.max}, mean ${r.mean.toFixed(4)}`,
        );
      }
    }
    console.log(
      "\nMedian of 7 decodes by an image element (img.decode()), in ms:",
    );
    for (const [name, ms] of Object.entries(typed.decode)) {
      console.log(`  ${name.padEnd(20)} ${Number(ms).toFixed(1)}`);
    }
  } finally {
    server.close();
  }
}

await main();
