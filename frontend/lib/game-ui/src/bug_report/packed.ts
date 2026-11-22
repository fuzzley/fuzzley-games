// A game's state packed into text for a bug report, and read back. A script
// in Node imports this file whole, its types stripped, so it imports nothing
// and keeps to what Node can erase: no enum, namespace or parameter property.

/** Encodes bytes as unpadded base64url: letters, digits, `-` and `_`. */
export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes base64url, padded or not.
 *
 * @throws Error if the text is not base64url.
 */
export function decodeBase64Url(text: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    throw new Error("The text is not base64url.");
  }
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Gzips bytes with the platform's `CompressionStream`. */
export function gzip(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  return pipe(bytes, new CompressionStream("gzip"));
}

/**
 * Gunzips bytes, or returns null once the output passes `maxBytes`, so a small
 * input cannot unpack into an unbounded one.
 *
 * @throws Error if the bytes are not gzip.
 */
export async function gunzip(
  bytes: Uint8Array<ArrayBuffer>,
  maxBytes = Infinity,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    return await pipe(bytes, new DecompressionStream("gzip"), maxBytes);
  } catch {
    throw new Error("The bytes are not gzip.");
  }
}

/** Runs bytes through a compression stream. */
function pipe(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>>;

/** Runs bytes through a compression stream, or null once past `maxBytes`. */
function pipe(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null>;

async function pipe(
  input: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes = Infinity,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const writer = stream.writable.getWriter();
  // Failures surface on the reading side; this only keeps them from also
  // being reported as unhandled here.
  const written = writer
    .write(input)
    .then(() => writer.close())
    .catch(() => undefined);

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    totalBytes += read.value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(read.value);
  }
  await written;

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

/** The most a state may unpack to before unpacking gives up on it. */
const MAX_UNPACKED_BYTES = 1_000_000;

/**
 * Reads a tag: a game's two lowercase letters, then the version of its
 * state's shape, from 1 and with no leading zero, so each version has one
 * spelling.
 */
const TAG = /^([a-z]{2})([1-9]\d*)$/;

/**
 * The start of gzip's header in base64url, which every packed state starts
 * with, so that a word with a dot in it, such as `sn1.txt`, is passed over.
 */
const GZIP_HEADER = "H4sI";

/** Finds a state packed under any tag: the tag, its letters and its version. */
const ANY_PACKED = new RegExp(
  `(?<![A-Za-z0-9])(([a-z]{2})([1-9]\\d*))\\.${GZIP_HEADER}`,
  "g",
);

/** Describes a tag: whose state it is, and which shape of it. */
interface Tag {
  readonly game: string;
  readonly version: number;
}

/**
 * Reads a tag, such as `bb1`.
 *
 * @throws Error if it isn't two letters and a version.
 */
function readTag(tag: string): Tag {
  const [, game, version] = TAG.exec(tag) ?? [];
  if (game === undefined) {
    throw new Error(
      `A tag is two lowercase letters and a version, such as bb1: ${tag}`,
    );
  }
  return { game, version: Number(version) };
}

/** Packs a value as `<tag>.` and the base64url of its gzipped JSON. */
export async function packState(tag: string, value: unknown): Promise<string> {
  readTag(tag);
  const json = new TextEncoder().encode(JSON.stringify(value));
  return `${tag}.${encodeBase64Url(await gzip(json))}`;
}

/**
 * Returns the tag of the first state packed in a piece of text, whichever
 * game's it is, or undefined where it holds none.
 */
export function packedTag(text: string): string | undefined {
  const [first] = text.matchAll(ANY_PACKED);
  return first?.[1];
}

/**
 * Finds the state packed under a tag in a piece of text, such as a report's
 * whole game-state field, and returns its JSON parsed, still unchecked.
 *
 * @throws Error saying what is wrong: no state, another game's, a newer
 *   version's or an older one's, corrupt, or too large to unpack.
 */
export async function unpackState(
  tag: string,
  text: string,
  maxBytes = MAX_UNPACKED_BYTES,
): Promise<unknown> {
  const wanted = readTag(tag);
  const packed = new RegExp(
    `(?<![A-Za-z0-9])${tag}\\.(${GZIP_HEADER}[A-Za-z0-9_-]*)`,
  ).exec(text)?.[1];
  if (packed === undefined) throw new Error(whyMissing(wanted, text));

  let json: Uint8Array | null;
  try {
    json = await gunzip(decodeBase64Url(packed), maxBytes);
  } catch {
    throw new Error("The game state is corrupt.");
  }
  if (!json) {
    throw new Error(`The game state unpacks to over ${maxBytes} bytes.`);
  }
  try {
    return JSON.parse(new TextDecoder().decode(json)) as unknown;
  } catch {
    throw new Error("The game state is corrupt.");
  }
}

/** Says why text holds no state under a tag: none at all, or whose it holds. */
function whyMissing(wanted: Tag, text: string): string {
  const found = [...text.matchAll(ANY_PACKED)].map(([, , game, version]) => ({
    game,
    version: Number(version),
  }));
  const sameGame = found.find(({ game }) => game === wanted.game);
  if (sameGame) {
    return sameGame.version > wanted.version
      ? "The game state is from a newer build."
      : "The game state is from an older build.";
  }
  return found.length > 0
    ? "The game state is from another game."
    : "There is no game state in that text.";
}
