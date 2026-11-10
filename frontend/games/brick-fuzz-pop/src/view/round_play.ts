import type { EventLogView, NumberedEvent } from "@fz/core/event_log";
import type { BallRole, FlightEvent } from "../rules/flight/events";
import type { Wall } from "../rules/wall/wall";

/** Describes a round in play as the scene draws it at a moment, one record reused frame after frame. */
export interface RoundView {
  /** Each fuzzball in the air: where its middle is, its charge and whether it is a hot shot. */
  readonly balls: readonly {
    readonly ball: number;
    readonly role: BallRole;
    readonly x: number;
    readonly y: number;
    readonly charge: number;
    readonly hot: boolean;
  }[];
  /** The wall as it looks at this moment. */
  readonly wall: Wall;
  /** How far through the wall's step or jump it is, 0 to 1 through its ease. */
  readonly wallDrop: number;
  /**
   * The flight's events, each numbered from 1 in the flight's order, as
   * playback reaches them: those since the last frame give the flourishes
   * and the sounds.
   */
  readonly events: EventLogView<LoggedEvent>;
}

/**
 * Describes an event of the round in play as the view's log keeps it: the
 * flight's own event, numbered, so the writer fills a record of the log's
 * ring by pointing it at the next event, and no field of an older event of
 * another kind lingers in it.
 */
export interface LoggedEvent extends NumberedEvent {
  event: FlightEvent;
}
