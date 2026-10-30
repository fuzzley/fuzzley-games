/** A file served to a game: text, such as JSON, or bytes, such as a PNG's. */
export type ServedFile = string | Uint8Array;

/**
 * Answers a request for a file, as a server would: with the file at the URL,
 * resolved against the page's, or with nothing, for a 404.
 */
export type FileServer = (url: URL) => ServedFile | undefined;

/** Answers every request while no run serves files: none is found. */
const NOTHING: FileServer = () => undefined;

/** Answers the requests made now. */
let server: FileServer = NOTHING;

/** The bytes of each blob a request answered with, which an image decodes. */
const bodies = new WeakMap<Blob, Uint8Array>();

/** The blob behind each object URL made, until it is revoked. */
const objects = new Map<string, Blob>();

/** The images that have loaded, whose `decode()` resolves at once. */
const loaded = new WeakSet<HTMLImageElement>();

/** Serves a game's requests from a server, or answers each with a 404. */
export function serveFrom(serve: FileServer | undefined): void {
  server = serve ?? NOTHING;
}

/**
 * Answers every request and decodes every image as a browser does, from
 * {@link serveFrom}'s server, so nothing a spec loads reaches the network.
 *
 * An image whose `src` is a `data:` URL, or an object URL, loads on a later
 * task, at the size its PNG header gives, or at 0 × 0 if it is no PNG, and
 * `decode()` resolves once it has. One at any other address loads as jsdom
 * loads it, which is not at all.
 */
export function installServedFiles(): void {
  for (const scope of new Set<object>([globalThis, window])) {
    Object.defineProperty(scope, "XMLHttpRequest", {
      configurable: true,
      writable: true,
      value: ServedRequest,
    });
  }

  let made = 0;
  URL.createObjectURL = (blob: Blob | MediaSource): string => {
    const url = `blob:headless/${made++}`;
    if (blob instanceof Blob) objects.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url: string): void => {
    objects.delete(url);
  };

  const src = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: true,
    get(this: HTMLImageElement): string {
      return (src?.get?.call(this) as string | undefined) ?? "";
    },
    set(this: HTMLImageElement, value: string): void {
      src?.set?.call(this, value);
      loaded.delete(this);
      const bytes = imageBytes(value);
      if (!bytes) return;
      const { width, height } = pngSize(bytes);
      Object.defineProperties(this, {
        naturalWidth: { configurable: true, value: width },
        naturalHeight: { configurable: true, value: height },
      });
      setTimeout(() => {
        loaded.add(this);
        this.dispatchEvent(new Event("load"));
      });
    },
  });
  // jsdom decodes nothing, so an image decodes as soon as it loads.
  HTMLImageElement.prototype.decode = async function decode(
    this: HTMLImageElement,
  ): Promise<void> {
    if (loaded.has(this)) return;
    await new Promise<void>((resolve) => {
      this.addEventListener(
        "load",
        () => {
          resolve();
        },
        { once: true },
      );
    });
  };
}

/** The events a request raises, each also to its `on…` handler. */
const REQUEST_EVENTS = ["load", "error", "timeout", "progress"] as const;

/**
 * Asks {@link serveFrom}'s server for a file as the request is sent, and
 * answers on a later task with the file or a 404, in place of
 * `XMLHttpRequest`, as far as a loader reads one.
 */
class ServedRequest extends EventTarget {
  static readonly UNSENT = 0;
  static readonly OPENED = 1;
  static readonly DONE = 4;

  readyState = ServedRequest.UNSENT;
  status = 0;
  statusText = "";
  responseURL = "";
  responseType: XMLHttpRequestResponseType = "";
  response: unknown = null;
  timeout = 0;
  withCredentials = false;
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  ontimeout: ((event: Event) => void) | null = null;
  onprogress: ((event: Event) => void) | null = null;
  private url = "";
  private aborted = false;
  private text = "";

  constructor() {
    super();
    for (const type of REQUEST_EVENTS) {
      this.addEventListener(type, (event) => {
        this[`on${type}`]?.call(this, event);
      });
    }
  }

  get responseText(): string {
    return this.text;
  }

  open(_method: string, url: string | URL): void {
    this.url = String(url);
    this.readyState = ServedRequest.OPENED;
  }

  setRequestHeader(): void {
    // A served file is the same whatever the request says.
  }

  overrideMimeType(): void {
    // A response is read as its `responseType` says.
  }

  getAllResponseHeaders(): string {
    return "";
  }

  getResponseHeader(): string | null {
    return null;
  }

  abort(): void {
    this.aborted = true;
  }

  send(): void {
    const url = new URL(this.url, document.baseURI);
    const file = server(url);
    setTimeout(() => {
      if (this.aborted) return;
      this.responseURL = url.href;
      this.readyState = ServedRequest.DONE;
      this.status = file === undefined ? 404 : 200;
      this.statusText = file === undefined ? "Not Found" : "OK";
      this.respond(file ?? "Not Found");
      this.dispatchEvent(new Event("load"));
    });
  }

  /** Sets the response to a file, read as the `responseType` asks. */
  private respond(file: ServedFile): void {
    const bytes =
      typeof file === "string" ? new TextEncoder().encode(file) : file;
    this.text =
      typeof file === "string" ? file : new TextDecoder().decode(file);
    switch (this.responseType) {
      case "blob": {
        const blob = new Blob([bytes.slice()]);
        bodies.set(blob, bytes);
        this.response = blob;
        break;
      }
      case "arraybuffer":
        this.response = bytes.slice().buffer;
        break;
      case "json":
        this.response = parsedJson(this.text);
        break;
      default:
        this.response = this.text;
    }
  }
}

/** Returns text parsed as JSON, or null for text that isn't, as an XHR answers. */
function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Returns the bytes an image at an address decodes, from a `data:` URL or an
 * object URL of a served file, or undefined for any other address.
 */
function imageBytes(src: string): Uint8Array | undefined {
  if (src.startsWith("blob:")) {
    const blob = objects.get(src);
    return (blob && bodies.get(blob)) ?? new Uint8Array();
  }
  if (!src.startsWith("data:")) return undefined;
  const comma = src.indexOf(",");
  const payload = src.slice(comma + 1);
  if (src.slice(0, comma).endsWith(";base64")) {
    return Uint8Array.from(atob(payload), (letter) => letter.charCodeAt(0));
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

/** The bytes every PNG starts with. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Returns a PNG's size from its header, or 0 × 0 for bytes that are no PNG. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const isPng =
    bytes.length >= 24 &&
    PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (!isPng) return { width: 0, height: 0 };
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  return { width: header.getUint32(16), height: header.getUint32(20) };
}

/**
 * Returns a PNG of a size, as far as the harness decodes one: its signature
 * and header, for a spec to serve as an image without reading one from disk.
 */
export function pngOfSize(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set(PNG_SIGNATURE);
  const header = new DataView(bytes.buffer);
  header.setUint32(8, 13);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  header.setUint32(16, width);
  header.setUint32(20, height);
  // 8-bit RGBA, as a browser's encoder writes one.
  bytes.set([8, 6], 24);
  return bytes;
}
