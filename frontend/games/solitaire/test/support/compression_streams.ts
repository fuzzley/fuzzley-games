/** Describes the part of Node's `process` this needs, lacking Node's types. */
interface NodeProcess {
  getBuiltinModule(
    id: "node:stream/web",
  ): Pick<typeof globalThis, "CompressionStream" | "DecompressionStream">;
}

/**
 * Puts Node's compression streams on the global scope where jsdom leaves them
 * off, for the bug report's encoding.
 */
export function installCompressionStreams(): void {
  if (typeof CompressionStream !== "undefined") return;

  const { process } = globalThis as unknown as { process: NodeProcess };
  const streams = process.getBuiltinModule("node:stream/web");
  for (const name of ["CompressionStream", "DecompressionStream"] as const) {
    Object.defineProperty(globalThis, name, {
      value: streams[name],
      writable: true,
      configurable: true,
    });
  }
}
