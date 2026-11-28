// The levels' certificates, a file a set, as `yarn certify:deals` writes
// them (tools/certify-deals.mjs), and each replayed: a deal of a level,
// dealt the level's own moves, cleared by its line through `play()`, at the
// line's last move (docs/fuzz-flux/design.md, "Deals and the guarantee"),
// or turned to the frame the design's sketch keeps its certificates in.

import { isListOf, isRecord, isWhole } from "@fz/core/json";
import { deal } from "../rules/board/deal";
import { fromScreen } from "../rules/board/orientation";
import type { ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import bedtime from "../rules/levels/certificates/bedtime.json";
import warmUp from "../rules/levels/certificates/warm-up.json";
import type { LevelEntry } from "../rules/levels/levels";
import { play } from "../rules/move/play";

/**
 * Every set's certificates, by the set's id, as their files hold them: each
 * level's lines by its id, then each deal's by its seed, each move a pair
 * of squares, from and to, in the screen's frame. A set joins once it is
 * certified.
 */
export const CERTIFICATES: Readonly<Record<string, unknown>> = {
  "warm-up": warmUp,
  bedtime,
};

/** Says what a certificate is read from and replayed by: the certificates, as their files hold them, and the elements' rules and the wind's. */
export interface Replay {
  readonly certificates: Readonly<Record<string, unknown>>;
  readonly rules: Readonly<Record<ElementId, ElementRule>>;
  readonly wind: WindRule;
}

/** The game's own replay: its certificates, played by its own rules. */
export const GAME_REPLAY: Replay = {
  certificates: CERTIFICATES,
  rules: ELEMENT_RULES,
  wind: WIND_RULE,
};

/** Describes a move as a certificate keeps it: a pair of squares, the one picked up and the neighbor it is swapped with. */
export type KeptMove = readonly [from: number, to: number];

/** What a failed replay says of how it came to fail, and when to certify again. */
const MOVED =
  "a change to the rules or to the level moved it, and its set is certified again only where that change is meant";

/**
 * Returns what keeps a level's certificate for one of its deals, by the
 * deal's seed, from clearing the level, dealt its own moves, at the line's
 * last move: a sentence that says what went wrong, or null where it clears
 * it so.
 */
export function certificateProblem(
  entry: LevelEntry,
  seed: number,
  { certificates, rules, wind }: Replay = GAME_REPLAY,
): string | null {
  const { set, data } = entry;
  const certify = `\`yarn certify:deals --set ${set.id}\``;
  if (certificates[set.id] === undefined) {
    return `The certificates keep no set "${set.id}", which ${levelNamed(entry)} is in: certify it with ${certify}, and its file joins \`CERTIFICATES\`.`;
  }
  const certificate = `The certificate of ${levelNamed(entry)} on its deal ${String(seed)}`;
  const line = keptLineOf(entry, seed, certificates);
  if (line === undefined) {
    return `${certificate} keeps no line: certify its set again with ${certify}, and where the proof finds none, the deal or the rules are at fault.`;
  }
  if (!isListOf(line, isPair)) {
    return `${certificate} keeps ${JSON.stringify(line)}, not a list of moves, each a pair of squares: certify its set again with ${certify}, since no one writes its file but the script.`;
  }
  let game = deal(data, seed, rules);
  const squares = game.board.width * game.board.height;
  for (const [at, [from, to]] of line.entries()) {
    const move = `its move ${String(at + 1)} of ${String(line.length)}, ${String(from)} to ${String(to)}`;
    if ([from, to].some((square) => square < 0 || square >= squares)) {
      return `${certificate} plays a square off the board at ${move}: ${MOVED}.`;
    }
    const played = play(game, from, to, rules, wind);
    if (played.record.swap.refused) {
      return `${certificate} is refused ${move}: ${MOVED}.`;
    }
    game = played.game;
    if (game.outcome === "over") {
      return `${certificate} runs out of moves at ${move}: ${MOVED}.`;
    }
    if (game.outcome === "cleared" && at < line.length - 1) {
      return `${certificate} clears the level at ${move}: ${MOVED}.`;
    }
  }
  if (game.outcome === "playing") {
    return `${certificate} leaves the level in play after its last move: ${MOVED}.`;
  }
  return null;
}

/**
 * Returns a level's certificate for one of its deals, by the deal's seed,
 * as the design's sketch's certificates.json keeps it: each move turned
 * from the screen's frame to the board's own, as the board stands before
 * the move, which the line is replayed to find; or null where the
 * certificates keep no line, or one that isn't.
 *
 * It asks nothing of whether the line clears the level, which
 * `certificateProblem()` asks.
 *
 * @throws {RangeError} for a move of a square off the board, as `play()`
 *   does.
 */
export function sketchLineOf(
  entry: LevelEntry,
  seed: number,
  { certificates, rules, wind }: Replay = GAME_REPLAY,
): readonly KeptMove[] | null {
  const line = keptLineOf(entry, seed, certificates);
  if (!isListOf(line, isPair)) {
    return null;
  }
  let game = deal(entry.data, seed, rules);
  const turned: KeptMove[] = [];
  for (const [from, to] of line) {
    turned.push([fromScreen(game, from), fromScreen(game, to)]);
    game = play(game, from, to, rules, wind).game;
  }
  return turned;
}

/** Returns what certificates keep for a deal of a level, by the deal's seed, as read from JSON, or nothing. */
function keptLineOf(
  { set, data }: LevelEntry,
  seed: number,
  certificates: Readonly<Record<string, unknown>>,
): unknown {
  return keptAt(certificates, set.id, data.id, String(seed));
}

/** Returns a level as a sentence names it, by its place in the game and its name. */
function levelNamed({ number, data }: LevelEntry): string {
  return `level ${String(number)}, ${data.name},`;
}

/** Returns what a value read from JSON keeps at a path of keys, each a record's, or nothing where it keeps none. */
export function keptAt(value: unknown, ...keys: readonly string[]): unknown {
  return keys.reduce<unknown>(
    (kept, key) => (isRecord(kept) ? kept[key] : undefined),
    value,
  );
}

/** Returns whether a value read from JSON is a move as a certificate keeps it, a pair of squares, from and to. */
function isPair(value: unknown): value is KeptMove {
  return isListOf(value, isWhole) && value.length === 2;
}
