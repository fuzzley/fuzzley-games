// What a workspace's Node scripts share: the command line each reads, where
// it prints, and the game's TypeScript it loads through Vite.

import { type ParseArgsOptionsConfig, parseArgs } from "node:util";

/**
 * Says what to print, and the code to exit with, for a command line that
 * asks a script for nothing: 0 for `--help`, and 2 for one it can't read.
 */
export interface Stop {
  readonly code: 0 | 2;
  readonly message: string;
}

/** Says where a script prints. */
export interface Printer {
  /** Prints a line of its output. */
  readonly print: (line: string) => void;
  /** Prints a line of what went wrong. */
  readonly printError: (line: string) => void;
}

/**
 * Says where a script prints, and what it loads from the game, each the
 * script's own unless a spec hands it another.
 */
export interface ScriptIo<Api> extends Partial<Printer> {
  /** Loads what the script takes from the game. */
  readonly load?: () => Promise<Api>;
}

/** Prints a script's output to stdout, and what went wrong to stderr. */
export const CONSOLE: Printer = {
  print: (line) => {
    console.log(line);
  },
  printError: (line) => {
    console.error(line);
  },
};

/** Says where a script prints, and keeps each line, for a spec to read back. */
export interface RecordingPrinter extends Printer {
  /** The lines of output, in the order printed. */
  readonly out: readonly string[];
  /** The lines of what went wrong, in the order printed. */
  readonly err: readonly string[];
}

/**
 * Returns a printer that keeps each line it is given, for a spec of a
 * script: its output in `out`, and what went wrong in `err`.
 */
export function recordingPrinter(): RecordingPrinter {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    print: (line) => {
      out.push(line);
    },
    printError: (line) => {
      err.push(line);
    },
  };
}

/** The values a command line gives a script's options. */
export type ArgValues<Options extends ParseArgsOptionsConfig> = ReturnType<
  typeof parseArgs<{ args: string[]; options: Options }>
>["values"];

/** What a command line gives a script: its options' values, and the words after them. */
export interface Args<Options extends ParseArgsOptionsConfig> {
  readonly values: ArgValues<Options>;
  /** The words after the options, which only a script that takes them is given. */
  readonly positionals: readonly string[];
}

/** Says what a script's command line holds. */
export interface ArgsConfig<Options extends ParseArgsOptionsConfig> {
  /** The script's options, besides `--help` (`-h`), which every script takes. */
  readonly options: Options;
  /** Whether it takes words after its options, such as the games to capture. */
  readonly allowPositionals?: boolean;
  /** What `--help` prints, which follows what is wrong with a command line it can't read. */
  readonly usage: string;
}

/** The option every script takes, which asks for its usage. */
const HELP = { help: { type: "boolean", short: "h" } } as const;

/**
 * Returns what a command line gives a script, or, for `--help` (`-h`), which
 * every script takes, or one it can't read, what to print and the code to
 * exit with.
 */
export function readArgs<Options extends ParseArgsOptionsConfig>(
  args: readonly string[],
  { options, allowPositionals = false, usage }: ArgsConfig<Options>,
): Args<Options> | Stop {
  try {
    const parsed = parseArgs({
      args: [...args],
      options: { ...options, ...HELP },
      allowPositionals,
    });
    // The values' type hangs on the options handed in, so TypeScript sees
    // `help` among them only once it is checked for.
    if ("help" in parsed.values && parsed.values.help === true) {
      return { code: 0, message: usage };
    }
    return { values: parsed.values, positionals: parsed.positionals };
  } catch (error) {
    if (!isUsageError(error)) throw error;
    return misread(error.message, usage);
  }
}

/**
 * Returns the stop for a command line a script can't read: what is wrong
 * with it, a blank line, then the script's usage.
 */
export function misread(problem: string, usage: string): Stop {
  return { code: 2, message: `${problem}\n\n${usage}` };
}

/**
 * Returns whether what a script read, of its command line or of a value on
 * it, is a stop rather than what it asked for.
 */
export function isStop(read: unknown): read is Stop {
  return typeof read === "object" && read !== null && "code" in read;
}

/**
 * Prints a stop's message, the usage asked for as output and a command line
 * misread as what went wrong, and returns the code to exit with.
 */
export function stopWith(stop: Stop, { print, printError }: Printer): number {
  if (stop.code === 0) print(stop.message);
  else printError(stop.message);
  return stop.code;
}

/** How wide a line of a usage may run. */
const USAGE_WIDTH = 78;

/**
 * Returns words broken into lines no wider than a usage's, as a usage says
 * what its script does, where each word fits.
 */
export function wrapped(words: string): string {
  const lines: string[] = [];
  let line = "";
  for (const word of words.split(" ")) {
    if (line && line.length + 1 + word.length > USAGE_WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(line);
  return lines.join("\n");
}

/** Returns whether `parseArgs()` threw for a command line it can't read. */
function isUsageError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_PARSE_ARGS_")
  );
}

/**
 * Returns a module of a workspace's TypeScript, by its path or its package's
 * name, loaded through Vite with none of the workspace's config, since Node
 * can't load an app's code as it is: it names its modules without
 * extensions and imports JSON, and `@fz/core` isn't written for Node to
 * strip its types.
 *
 * Vite is loaded only here, so a script that loads nothing through it
 * doesn't wait on it.
 */
export async function importThroughVite<Module = Record<string, unknown>>(
  id: string,
  root: string,
): Promise<Module> {
  const { runnerImport } = await import("vite");
  const { module } = await runnerImport<Module>(id, {
    configFile: false,
    root,
    logLevel: "silent",
  });
  return module;
}
