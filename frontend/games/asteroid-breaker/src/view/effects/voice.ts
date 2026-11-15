// The fuzzball's voice: which events it calls at, and its patience, by the
// field's own clock, so it speaks rarely and never in a pile-up.

import { stepsIn } from "../../rules/stepper";
import type { FieldEvent, FieldEventKind, FieldView } from "../field/frame";
import type { SoundName } from "./sounds";

/** The least time between two of the fuzzball's calls, in milliseconds. */
export const PATIENCE_MS = 4000;

/** The least steps of the field's between two calls. */
const PATIENCE_STEPS = stepsIn(PATIENCE_MS);

/** How many dashes the fuzzball calls at one of: the first, then every third. */
export const DASHES_A_CALL = 3;

/**
 * Every call the fuzzball makes, the rarest first, which wins a frame that
 * calls for more than one: a wave cleared, then the run's end and those
 * floating home, a knock, a rescue, a stray's arrival, a near miss and a
 * dash.
 */
export const CALLS_RAREST_FIRST = [
  "voice-cheer",
  "voice-aww",
  "voice-ouch",
  "voice-yay",
  "voice-ooh",
  "voice-eep",
  "voice-whee",
] as const satisfies readonly SoundName[];

/** Names a call of the fuzzball's, which its rank holds. */
export type Call = (typeof CALLS_RAREST_FIRST)[number];

/** The call the fuzzball makes at a dash, one dash in {@link DASHES_A_CALL}. */
const DASH_CALL: Call = "voice-whee";

/**
 * The call each event the fuzzball speaks at calls for: a wave cleared
 * cheered, a fuzzball knocked loose an ouch, one caught a yay, whether a
 * stray or one knocked loose, a stray's arrival an ooh, and one floating
 * home, as the run's end sends everyone, an aww.
 */
const CALLS: Readonly<Partial<Record<FieldEventKind, Call>>> = {
  dashed: DASH_CALL,
  cleared: "voice-cheer",
  knocked: "voice-ouch",
  recaught: "voice-yay",
  joined: "voice-yay",
  home: "voice-yay",
  strayed: "voice-ooh",
  floated: "voice-aww",
  lost: "voice-aww",
};

/**
 * Returns the call an event calls for, or null for none: a dash's whether
 * or not its turn has come.
 */
export function callOf(event: Readonly<FieldEvent>): Call | null {
  return CALLS[event.kind] ?? null;
}

/** The calls by rank, from 0 for the rarest. */
const RANKED: readonly Call[] = CALLS_RAREST_FIRST;

/** A rank past every call's, which a frame's call starts from. */
const NO_RANK = RANKED.length;

/** Notes a call the fuzzball makes, at a place across the field from -1 to 1. */
export type NoteCall = (call: Call, across: number) => void;

/**
 * Keeps the fuzzball's voice: hears the events of a frame that call for a
 * call, and speaks the rarest of them, at most once in {@link PATIENCE_MS}
 * of the field's steps.
 *
 * It calls at one dash in {@link DASHES_A_CALL}, counted over every field
 * it hears, the first among them, a turn passing whether or not its call
 * is heard; a call due while it keeps its patience is dropped, not put
 * off, however rare, so it never speaks twice in four seconds. Its
 * patience starts afresh with each new field, which only comes after a
 * card. It makes nothing as it hears or speaks.
 */
export class Voice {
  /** The field the last frame showed, whose steps time the calls. */
  private field: FieldView | null = null;
  /** The field's step of the last call, or null for none on this field. */
  private calledAt: number | null = null;
  /** How many dashes it has heard. */
  private dashes = 0;
  /** The rarest call the frame calls for, by its rank, and where. */
  private rank = NO_RANK;
  private across = 0;

  /** Hears the field a frame shows, before its events: a new one starts its patience afresh. */
  hearField(field: FieldView): void {
    if (field === this.field) return;
    this.field = field;
    this.calledAt = null;
  }

  /**
   * Hears an event of the frame, at a place across the field from -1 to
   * 1, keeping its call where it calls for one rarer than the frame's
   * others.
   */
  hear(event: Readonly<FieldEvent>, across: number): void {
    const call = callOf(event);
    if (call === null) return;
    if (call === DASH_CALL) {
      const turn = this.dashes % DASHES_A_CALL === 0;
      this.dashes += 1;
      if (!turn) return;
    }
    const rank = RANKED.indexOf(call);
    if (rank >= this.rank) return;
    this.rank = rank;
    this.across = across;
  }

  /**
   * Speaks the frame's rarest call, where it calls for one and its
   * patience has run since its last, and forgets the frame's calls.
   */
  speak(note: NoteCall): void {
    const call = RANKED[this.rank];
    this.rank = NO_RANK;
    if (call === undefined || this.field === null) return;
    const now = this.field.steps;
    if (this.calledAt !== null && now - this.calledAt < PATIENCE_STEPS) return;
    this.calledAt = now;
    note(call, this.across);
  }
}
