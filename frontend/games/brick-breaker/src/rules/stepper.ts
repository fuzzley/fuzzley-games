import { createStepper } from "@fz/core/clock";
import { MAX_STEPS_PER_FRAME, STEP_S } from "./tuning";

/** The field's steps, {@link STEP_S} long, at most {@link MAX_STEPS_PER_FRAME} a frame. */
const FIELD_STEPS = createStepper(STEP_S * 1000, MAX_STEPS_PER_FRAME);

/** How long a step of the field is, in milliseconds. */
export const STEP_MS = FIELD_STEPS.stepMs;

/** Returns how many of the field's steps a time spans, to the nearest. */
export const stepsIn = FIELD_STEPS.stepsIn;

/** Returns a clock of the field's steps, with no time under way. */
export const createFieldClock = FIELD_STEPS.createClock;
