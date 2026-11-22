import { type FileServer, pngOfSize, serveFrom } from "./served_files";

/** What a request was answered with. */
interface Answer {
  readonly status: number;
  readonly response: unknown;
  readonly request: XMLHttpRequest;
}

/** Requests a URL, as Phaser's loader does, and waits for the answer. */
async function request(
  url: string,
  responseType: XMLHttpRequestResponseType = "text",
): Promise<Answer> {
  const request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = responseType;
  const answered = new Promise<Answer>((resolve) => {
    request.onload = () => {
      resolve({ status: request.status, response: request.response, request });
    };
  });
  request.send();
  return answered;
}

/** Shows an image at an address, and waits for it to load. */
async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  const loaded = new Promise<void>((resolve) => {
    image.addEventListener("load", () => {
      resolve();
    });
  });
  image.src = src;
  await loaded;
  return image;
}

/** Returns bytes as a `data:` URL of an image, a PNG unless told otherwise. */
function dataUrl(bytes: Uint8Array, type = "image/png"): string {
  return `data:${type};base64,${btoa(String.fromCharCode(...bytes))}`;
}

/**
 * Returns the start of a WebP whose first chunk is of a form, 30 bytes long
 * with room for that form's size, and a view of it: `RIFF`, `WEBP`, and the
 * chunk's name.
 */
function webpStart(form: string): { bytes: Uint8Array; view: DataView } {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  const ascii = new TextEncoder();
  bytes.set(ascii.encode("RIFF"), 0);
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(ascii.encode("WEBP"), 8);
  bytes.set(ascii.encode(form), 12);
  view.setUint32(16, bytes.length - 20, true);
  return { bytes, view };
}

/**
 * Returns a lossless WebP's header: 14 bits each of its width and height
 * less one, and above them the bit that says it has alpha, as an atlas
 * page's does.
 */
function vp8lOfSize(width: number, height: number): Uint8Array {
  const { bytes, view } = webpStart("VP8L");
  bytes[20] = 0x2f;
  view.setUint32(21, (width - 1) | ((height - 1) << 14) | (1 << 28), true);
  return bytes;
}

/** Returns an extended WebP's header: 24 bits each of its width and height less one. */
function vp8xOfSize(width: number, height: number): Uint8Array {
  const { bytes, view } = webpStart("VP8X");
  view.setUint16(24, (width - 1) & 0xffff, true);
  view.setUint8(26, (width - 1) >>> 16);
  view.setUint16(27, (height - 1) & 0xffff, true);
  view.setUint8(29, (height - 1) >>> 16);
  return bytes;
}

/**
 * Returns a lossy WebP's header: its frame's start code, then its width and
 * height, each with a scale in its top two bits.
 */
function vp8OfSize(width: number, height: number): Uint8Array {
  const { bytes, view } = webpStart("VP8 ");
  bytes.set([0x9d, 0x01, 0x2a], 23);
  view.setUint16(26, width | 0x4000, true);
  view.setUint16(28, height | 0x8000, true);
  return bytes;
}

/** Returns a RIFF file of another kind than WebP, holding a WebP's first chunk. */
function riffOf(kind: string): Uint8Array {
  const bytes = vp8lOfSize(3876, 1260);
  bytes.set(new TextEncoder().encode(kind), 8);
  return bytes;
}

/** Serves one file, at one path. */
function serving(path: string, file: string | Uint8Array): FileServer {
  return (url) => (url.pathname === path ? file : undefined);
}

describe("served files", () => {
  afterEach(() => {
    serveFrom(undefined);
  });

  it("answers a request with the file served at its URL", async () => {
    serveFrom(serving("/apple.json", '{"crisp":true}'));

    const answer = await request("/apple.json");

    expect([answer.status, answer.response]).toEqual([200, '{"crisp":true}']);
  });

  it("answers a request for a file not served with a 404", async () => {
    serveFrom(serving("/apple.json", "{}"));

    const answer = await request("/pear.json");

    expect(answer.status).toBe(404);
  });

  it("answers every request with a 404 while nothing serves", async () => {
    const answer = await request("/apple.json");

    expect(answer.status).toBe(404);
  });

  it("asks the server for the URL resolved against the page's", async () => {
    const asked: string[] = [];
    serveFrom((url) => {
      asked.push(url.href);
      return undefined;
    });

    const answer = await request("assets/apple.json");

    expect([asked, answer.request.responseURL]).toEqual([
      [new URL("assets/apple.json", document.baseURI).href],
      new URL("assets/apple.json", document.baseURI).href,
    ]);
  });

  it("asks the server as the request is sent, and answers on a later task", () => {
    const asked: string[] = [];
    serveFrom((url) => {
      asked.push(url.pathname);
      return "{}";
    });
    const request = new XMLHttpRequest();
    request.open("GET", "/apple.json");

    request.send();

    expect([asked, request.readyState]).toEqual([
      ["/apple.json"],
      XMLHttpRequest.OPENED,
    ]);
  });

  it("reads a response as its type asks", async () => {
    serveFrom(serving("/apple.json", '{"crisp":true}'));

    const answers = await Promise.all(
      (["json", "arraybuffer", "blob", ""] as const).map((type) =>
        request("/apple.json", type),
      ),
    );

    expect(answers.map(({ response }) => response)).toEqual([
      { crisp: true },
      expect.any(ArrayBuffer),
      expect.any(Blob),
      '{"crisp":true}',
    ]);
  });

  it.each([
    ["isn't JSON", "/apple.json"],
    ["isn't served", "/pear.json"],
  ])(
    "answers null to a request for JSON whose file %s, as a browser does",
    async (_, url) => {
      serveFrom(serving("/apple.json", "crisp"));

      const answer = await request(url, "json");

      expect(answer.response).toBeNull();
    },
  );

  it("gives a response's text whatever its type", async () => {
    serveFrom(serving("/apple.txt", new TextEncoder().encode("crisp")));

    const answer = await request("/apple.txt", "arraybuffer");

    expect(answer.request.responseText).toBe("crisp");
  });

  it("tells the request's listeners as well as its handler", async () => {
    const request = new XMLHttpRequest();
    request.open("GET", "/apple.json");
    const heard = new Promise<string>((resolve) => {
      request.addEventListener("load", (event) => {
        resolve(event.type);
      });
    });

    request.send();

    await expect(heard).resolves.toBe("load");
  });

  it("answers nothing once a request is aborted", async () => {
    const request = new XMLHttpRequest();
    request.open("GET", "/apple.json");
    const onload = vi.fn();
    request.onload = onload;

    request.send();
    request.abort();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect([onload.mock.calls.length, request.readyState]).toEqual([
      0,
      XMLHttpRequest.OPENED,
    ]);
  });

  it("answers nothing of its headers", () => {
    const request = new XMLHttpRequest();

    request.setRequestHeader("Accept", "image/png");
    request.overrideMimeType("image/png");

    expect([
      request.getAllResponseHeaders(),
      request.getResponseHeader("Content-Type"),
    ]).toEqual(["", null]);
  });

  it("decodes a served image at the size its PNG header gives", async () => {
    serveFrom(serving("/apple.png", pngOfSize(24, 16)));
    const answer = await request("/apple.png", "blob");

    const image = await loadImage(URL.createObjectURL(answer.response as Blob));

    expect([image.naturalWidth, image.naturalHeight]).toEqual([24, 16]);
  });

  // The 1x atlas page's size, whose fields cross the bytes' edges.
  it.each([
    ["lossless", vp8lOfSize(3876, 1260)],
    ["extended", vp8xOfSize(3876, 1260)],
    ["lossy", vp8OfSize(3876, 1260)],
  ])(
    "decodes a served %s WebP at the size its header gives",
    async (_, webp) => {
      serveFrom(serving("/page.webp", webp));
      const answer = await request("/page.webp", "blob");

      const image = await loadImage(
        URL.createObjectURL(answer.response as Blob),
      );

      expect([image.naturalWidth, image.naturalHeight]).toEqual([3876, 1260]);
    },
  );

  // The 2x atlas page's size, and one whose sides less one reach a third
  // byte.
  it.each([
    [4032, 3732],
    [65537, 65537],
  ])("decodes an extended WebP at %i × %i", async (width, height) => {
    const image = await loadImage(
      dataUrl(vp8xOfSize(width, height), "image/webp"),
    );

    expect([image.naturalWidth, image.naturalHeight]).toEqual([width, height]);
  });

  it.each([
    ["a RIFF file that is no WebP", riffOf("WAVE")],
    [
      "a WebP whose first chunk is of no form it knows",
      webpStart("ALPH").bytes,
    ],
    ["a lossless WebP's header cut short", vp8lOfSize(3876, 1260).slice(0, 24)],
    [
      "an extended WebP's header cut short",
      vp8xOfSize(3876, 1260).slice(0, 29),
    ],
    ["a lossy WebP's header cut short", vp8OfSize(3876, 1260).slice(0, 29)],
  ])("loads %s at 0 × 0", async (_, bytes) => {
    const image = await loadImage(dataUrl(bytes, "image/webp"));

    expect([image.naturalWidth, image.naturalHeight]).toEqual([0, 0]);
  });

  it("decodes an image written as a data: URL at its size", async () => {
    const image = await loadImage(dataUrl(pngOfSize(4, 6)));

    expect([image.naturalWidth, image.naturalHeight]).toEqual([4, 6]);
  });

  it("loads an image that is no PNG at 0 × 0", async () => {
    const image = await loadImage("data:image/svg+xml,%3Csvg%2F%3E");

    expect([image.naturalWidth, image.naturalHeight]).toEqual([0, 0]);
  });

  it("loads an image of a revoked object URL at 0 × 0", async () => {
    serveFrom(serving("/apple.png", pngOfSize(24, 16)));
    const answer = await request("/apple.png", "blob");
    const url = URL.createObjectURL(answer.response as Blob);
    URL.revokeObjectURL(url);

    const image = await loadImage(url);

    expect(image.naturalWidth).toBe(0);
  });

  it("decodes an image once it has loaded", async () => {
    const image = new Image();
    image.src = dataUrl(pngOfSize(4, 6));

    await image.decode();

    expect(image.naturalWidth).toBe(4);
  });

  it("decodes an image already loaded at once", async () => {
    const image = await loadImage(dataUrl(pngOfSize(4, 6)));

    await expect(image.decode()).resolves.toBeUndefined();
  });

  it("decodes an image of an object URL the page made itself", async () => {
    const url = URL.createObjectURL(
      new Blob(["<svg/>"], { type: "image/svg+xml" }),
    );
    const image = new Image(30, 20);
    image.src = url;

    await image.decode();

    expect([image.width, image.naturalWidth]).toEqual([30, 0]);
  });

  it("loads no image at any other address", async () => {
    const image = new Image();
    const onload = vi.fn();
    image.addEventListener("load", onload);

    image.src = "https://example.com/apple.png";
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect([image.src, onload.mock.calls.length]).toEqual([
      "https://example.com/apple.png",
      0,
    ]);
  });
});
