import type pins from "../../../games.json";
import type { CategoryId } from "../provider/categories";

/** A build served under /play/<build>/, by its name in frontend/games.json. */
export type BuildName = keyof typeof pins;

/** Names a game in one of the builds served under /play/. */
export interface PlayLocation {
  readonly build: BuildName;
  /** The game's id in that build, when it holds several games. */
  readonly id?: string;
}

/** Describes how many people play a game at once. */
export interface PlayerCount {
  readonly min: number;
  readonly max: number;
}

/** Describes a game the site lists, hosted or still to come. */
export interface Game {
  /** Its page is /games/<slug>. */
  readonly slug: string;
  readonly name: string;
  readonly category: CategoryId;
  /** One line on how it plays. */
  readonly blurb: string;
  /** Other names to find it by, such as its rule variants. */
  readonly aliases?: readonly string[];
  readonly players: PlayerCount;
  /** How long one game typically takes. */
  readonly minutes: number;
  /** The ISO date the game went up on the site. */
  readonly added: string;
  /** Where the game is played, or omitted for one still to come. */
  readonly play?: PlayLocation;
}

/** Returns the address a game is played at. */
export function playUrl(play: PlayLocation): string {
  return play.id ? `/play/${play.build}/#/${play.id}` : `/play/${play.build}/`;
}

/**
 * Returns a screenshot of a new deal, as the build ships it: `thumb` is the
 * board alone, `preview` the whole screen.
 */
export function screenshotUrl(
  play: PlayLocation,
  kind: "thumb" | "preview",
): string {
  const id = play.id ?? play.build;
  return `/play/${play.build}/docs/screenshots/${id}/${kind}.webp`;
}

/**
 * Returns a game's picture: its build's screenshot of a new deal, or for a
 * game still to come, a drawing of its layout in public/thumbnails/.
 */
export function thumbnailUrl(game: Game): string {
  return game.play
    ? screenshotUrl(game.play, "thumb")
    : `/thumbnails/${game.slug}.svg`;
}

/** Returns every picture the site shows of a game: its thumbnail and preview. */
export function imagesOf(game: Game): string[] {
  return game.play
    ? [thumbnailUrl(game), screenshotUrl(game.play, "preview")]
    : [thumbnailUrl(game)];
}

/** Returns how many play a game: "Solo", "2 players" or "2–4 players". */
export function describePlayers({ min, max }: PlayerCount): string {
  if (max === 1) return "Solo";
  return min === max ? `${max} players` : `${min}–${max} players`;
}

/** Returns a number of games: "1 game" or "41 games". */
export function describeGameCount(count: number): string {
  return count === 1 ? "1 game" : `${count} games`;
}

/** Returns how long a game takes, such as "5 min". */
export function describeLength(minutes: number): string {
  return `${minutes} min`;
}
