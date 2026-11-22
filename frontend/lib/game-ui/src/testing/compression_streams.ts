import { afterEach, beforeEach, vi } from "vitest";

/** Describes the part of Node's `process` this needs, lacking Node's types. */
interface NodeProcess {
  getBuiltinModule(
    id: "node:stream/web",
  ): Pick<typeof globalThis, "CompressionStream" | "DecompressionStream">;
}

// The library's code is checked without Node's types, so Node's global
// `process` is declared here rather than imported.
declare const process: NodeProcess;

/**
 * Stands Node's compression streams in for the ones jsdom lacks, which a bug
 * report packs its state with, in each test of the spec file or `describe`
 * it is called in. After each test it takes off every global stubbed with
 * `vi.stubGlobal()`, one stubbed in a `beforeAll` too, so a spec that calls
 * it stubs its own globals in a test or a `beforeEach`.
 */
export function installCompressionStreams(): void {
  const streams = process.getBuiltinModule("node:stream/web");
  beforeEach(() => {
    vi.stubGlobal("CompressionStream", streams.CompressionStream);
    vi.stubGlobal("DecompressionStream", streams.DecompressionStream);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
