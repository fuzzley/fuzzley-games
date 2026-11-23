import type {
  FrameChange,
  LevelCard,
  RoundsPlayed,
} from "@fz/brick-wall/view/rounds_played";
import type { Round, RoundStart } from "../../rules/flight/events";
import type { PlayOptions, RoundPlay } from "../../view/play/round_play";
import type {
  FlightSoFar,
  RoundChange,
  RoundNews,
  RoundPhase,
  RoundView,
} from "../../view/run_state";

/** Describes what a frame of the flight came to beside a round's end: a floor bounce earned, or the call at the rally mark. */
export type FlightNews = Exclude<RoundNews, { readonly kind: "ended" }>;

/** Describes what a frame came to, as the round's driver takes it in, written in place. */
interface Change {
  settled: Round | null;
  opens: LevelCard | null;
}

/**
 * Plays a level's rounds as the view's `RoundPlay` does, read and moved as
 * every wall game's round's driver reads and moves its play
 * (`RoundsPlayed`): each flight released called out at the level's rally
 * mark, which the game hands it, and each frame's news split into the
 * round whose wall came to rest, which the driver takes in, and the
 * flight's own news, a floor bounce earned or the call, kept until the
 * next frame for the game to read.
 *
 * Make one for the game: the play it is handed numbers its events on
 * through every level and run.
 */
export class PlayedRounds implements RoundsPlayed<RoundStart, Round> {
  /** The rally a flight released calls out at: none until the game hands one. */
  private mark = Number.POSITIVE_INFINITY;
  private readonly change: Change = { settled: null, opens: null };
  private readonly heard: FlightNews[] = [];

  constructor(private readonly play: RoundPlay) {}

  /** The round in play as the scene draws it: the same record each frame. */
  get view(): RoundView {
    return this.play.view;
  }

  /** Where the round aimed, or in play, started. */
  get start(): RoundStart {
    return this.play.start;
  }

  /** The round in play once it is released, until the next is aimed; else null. */
  get round(): Round | null {
    return this.play.round;
  }

  /** Where the round stands: aimed, its flight played back, or its wall settling. */
  get phase(): RoundPhase {
    return this.play.phase;
  }

  /** What the round in play's flight has played back so far, or, while it is aimed, what it leaves with. */
  get soFar(): FlightSoFar {
    return this.play.soFar;
  }

  /** The points the round in play's flight has played back so far: its strikes' and those of the floor bounces it kept. */
  get scored(): number {
    return this.play.soFar.points;
  }

  /** The moment of the round in play's flight the playback has reached, in field units. */
  get moment(): number {
    return this.play.moment;
  }

  /** What the last frame played came to of the flight's own news, in order, written again each frame. */
  get news(): readonly FlightNews[] {
    return this.heard;
  }

  /** Takes the rally mark of the level in play, which the next flight released calls out at. */
  callAt(mark: number): void {
    this.mark = mark;
  }

  /** Aims a round from where it starts, leaving any round in play and any card's wait. */
  aim(start: RoundStart): void {
    this.play.aim(start);
  }

  /** Starts playing back the round released from the start aimed, called out at the rally mark last handed. */
  release(round: Round): void {
    this.play.release(round, this.mark);
  }

  /** Lands the flight in play at once, at the next frame played. */
  skip(): void {
    this.play.skip();
  }

  /** Plays the round on by a frame's time, and returns what the frame came to, one record written again each frame. */
  advance(deltaMs: number, options: Readonly<PlayOptions>): FrameChange<Round> {
    return this.taken(this.play.advance(deltaMs, options));
  }

  /**
   * Lands the flight in the air at once as the page is hidden, with nothing
   * heard or seen of it, and returns what the frame came to, as
   * `RoundPlay.landUnseen()` does.
   */
  landUnseen(options: Readonly<PlayOptions>): FrameChange<Round> {
    return this.taken(this.play.landUnseen(options));
  }

  /** Returns a frame's change as the driver takes it in, keeping the flight's own news for the game. */
  private taken({ news, opens }: RoundChange): FrameChange<Round> {
    const { change, heard } = this;
    heard.length = 0;
    change.settled = null;
    change.opens = opens;
    for (const each of news) {
      if (each.kind === "ended") {
        change.settled = each.round;
      } else {
        heard.push(each);
      }
    }
    return change;
  }
}
