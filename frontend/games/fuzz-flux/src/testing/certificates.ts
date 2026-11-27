// The levels' certificates, a file a set, as `yarn certify:deals` writes
// them (tools/certify-deals.mjs), and each replayed: a deal of a level,
// dealt the level's own moves, cleared by its line through `play()`, at the
// line's last move (docs/fuzz-flux/design.md, "Deals and the guarantee").

import { isListOf, isRecord, isWhole } from "@fz/core/json";
import { deal } from "../rules/board/deal";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
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
};

/** What a failed replay says of how it came to fail, and when to certify again. */
const MOVED =
  "a change to the rules or to the level moved it, and its set is certified again only where that change is meant";

/**
 * Returns what keeps a level's certificate for one of its deals, by the
 * deal's seed, from clearing the level, dealt its own moves, at the line's
 * last move, played by the game's own rules: a sentence that says what
 * went wrong, or null where it clears it so.
 */
export function certificateProblem(
  entry: LevelEntry,
  seed: number,
  certificates: Readonly<Record<string, unknown>> = CERTIFICATES,
): string | null {
  const { set, data } = entry;
  const certify = `\`yarn certify:deals --set ${set.id}\``;
  const levels = certificates[set.id];
  if (levels === undefined) {
    return `The certificates keep no set "${set.id}", which ${levelNamed(entry)} is in: certify it with ${certify}, and its file joins \`CERTIFICATES\`.`;
  }
  const certificate = `The certificate of ${levelNamed(entry)} on its deal ${String(seed)}`;
  const line = keptIn(keptIn(levels, data.id), String(seed));
  if (line === undefined) {
    return `${certificate} keeps no line: certify its set again with ${certify}, and where the proof finds none, the deal or the rules are at fault.`;
  }
  if (!isListOf(line, isPair)) {
    return `${certificate} keeps ${JSON.stringify(line)}, not a list of moves, each a pair of squares: certify its set again with ${certify}, since no one writes its file but the script.`;
  }
  let game = deal(data, seed, ELEMENT_RULES);
  const squares = game.board.width * game.board.height;
  for (const [at, [from, to]] of line.entries()) {
    const move = `its move ${String(at + 1)} of ${String(line.length)}, ${String(from)} to ${String(to)}`;
    if ([from, to].some((square) => square < 0 || square >= squares)) {
      return `${certificate} plays a square off the board at ${move}: ${MOVED}.`;
    }
    const played = play(game, from, to, ELEMENT_RULES, WIND_RULE);
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

/** Returns a level as a sentence names it, by its place in the game and its name. */
function levelNamed({ number, data }: LevelEntry): string {
  return `level ${String(number)}, ${data.name},`;
}

/** Returns what a record read from JSON keeps under a key, or nothing for a value that isn't a record or keeps nothing there. */
function keptIn(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

/** Returns whether a value read from JSON is a move as a certificate keeps it, a pair of squares, from and to. */
function isPair(value: unknown): value is readonly [number, number] {
  return isListOf(value, isWhole) && value.length === 2;
}
