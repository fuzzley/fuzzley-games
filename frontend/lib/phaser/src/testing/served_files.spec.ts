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

/** Returns bytes as a `data:` URL of a PNG. */
function pngDataUrl(bytes: Uint8Array): string {
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
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

  it("decodes an image written as a data: URL at its size", async () => {
    const image = await loadImage(pngDataUrl(pngOfSize(4, 6)));

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
