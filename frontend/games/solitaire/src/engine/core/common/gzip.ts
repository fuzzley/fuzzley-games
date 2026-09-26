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
