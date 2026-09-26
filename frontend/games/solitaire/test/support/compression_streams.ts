/** The part of Node's `process` this needs; the specs have no Node types. */
interface NodeProcess {
  getBuiltinModule(
    id: "node:stream/web",
  ): Pick<typeof globalThis, "CompressionStream" | "DecompressionStream">;
}

/**
 * Puts Node's compression streams on the global scope when the jsdom
 * environment has left them off, as it does. The bug report encodes game state
 * with them.
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
