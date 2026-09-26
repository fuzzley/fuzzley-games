import {
  decodeBase64Url,
  encodeBase64Url,
} from "@/engine/core/common/base64url";
import { gunzip, gzip } from "@/engine/core/common/gzip";
import {
  readNumber,
  readObject,
  readRecord,
  readString,
} from "@/engine/core/common/json_reader";
import { GameSnapshot, readGameSnapshot } from "@/engine/tableau/game_snapshot";
import { GameOptionValues } from "../provider/game_catalog";

/** A game as a bug report carries it: which game, by which rules, and where. */
export interface GamePosition {
  readonly gameId: string;
  readonly options: GameOptionValues;
  readonly snapshot: GameSnapshot;
}

/** Marks encoded game state and its format version. */
const PREFIX = "fs1.";

/** Finds encoded game state in surrounding text, such as a pasted report. */
const ENCODED = /fs1\.([A-Za-z0-9_-]+)/;

/** The most a position may unpack to before decoding gives up on it. */
export const MAX_DECODED_BYTES = 1_000_000;

/** Encodes a position as URL-safe text: JSON, gzipped, then base64url. */
export async function encodePosition(position: GamePosition): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(position));
  return PREFIX + encodeBase64Url(await gzip(json));
}

/**
 * Decodes the position in a piece of text, which may be a report's whole
 * game-state field as pasted.
 *
 * @throws Error if the text holds no position, or one that is corrupt, too
 *   large to unpack, or not shaped like a position.
 */
export async function decodePosition(
  text: string,
  maxBytes = MAX_DECODED_BYTES,
): Promise<GamePosition> {
  const encoded = ENCODED.exec(text)?.[1];
  if (!encoded) throw new Error("There is no game state in that text.");

  let json: Uint8Array | null;
  try {
    json = await gunzip(decodeBase64Url(encoded), maxBytes);
  } catch {
    throw new Error("The game state is corrupt.");
  }
  if (!json) {
    throw new Error(`The game state unpacks to over ${maxBytes} bytes.`);
  }
  return readPosition(parseJson(new TextDecoder().decode(json)));
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("The game state is corrupt.");
  }
}

function readPosition(value: unknown): GamePosition {
  const position = readObject(value, "position");
  return {
    gameId: readString(position.gameId, "position.gameId"),
    options: readRecord(position.options, "position.options", readNumber),
    snapshot: readGameSnapshot(position.snapshot, "position.snapshot"),
  };
}
