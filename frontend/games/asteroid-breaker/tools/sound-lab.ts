// Asteroid Breaker's sound lab, which its dev server alone serves, at
// sound-lab/ (`@fz/dev/sound-lab`, in vite.config.ts): the sprite the scene
// plays, the candidates designed with ZzFX to replace its sounds, and scenes
// played as the game plays them, at its gun's rate and its chain's rise.

import {
  type LabCue,
  type LabScene,
  type LabSound,
  mountSoundLab,
} from "@fz/dev/sound-lab-page";
import type { ZzfxSound } from "@fz/dev/zzfx";
import { SHOT_EVERY_MS } from "../src/rules/tuning";
import spritemap from "../src/scene/sounds/sounds.json";
import spriteUrl from "../src/scene/sounds/sounds.wav?url";
import {
  CHAIN_MOST_CENTS,
  CHAIN_STEP_CENTS,
  SOUNDS,
  type SoundName,
} from "../src/view/effects/effects";

/** What plays each sound in the game, as `tools/build-sounds.mjs` describes its recipe. */
const PLAYS: Readonly<Record<SoundName, string>> = {
  fired: "A shot, heard many times a second while fire is held.",
  small: "A small rock broken, raised along a chain.",
  medium: "A medium rock broken.",
  large: "A large rock or a boulder broken.",
  rung: "Iron hit that holds.",
  blast: "A blast, or the Nova.",
  caught: "A pickup caught.",
  dashed: "A dash.",
  warned: "A comet's warning.",
  lost: "A ship lost.",
  cleared: "A wave cleared.",
  gained: "A ship gained.",
  home: "A stray brought home.",
  thrust: "The thrust's hum, looped while the thrust is held.",
};

/**
 * The candidates, designed to be heard against the sounds the game ships:
 * a shot with a saw's bite, breaks that crack and crunch rather than thud,
 * a blast with a crunching tail and an echo, and a thrust that buzzes.
 */
const CANDIDATES: Readonly<Partial<Record<SoundName, ZzfxSound>>> = {
  fired: {
    volume: 0.6,
    frequency: 1250,
    release: 0.07,
    shape: 2,
    slide: -24,
    filter: -2600,
  },
  small: {
    frequency: 900,
    decay: 0.015,
    release: 0.1,
    shape: 4,
    slide: -6,
    noise: 0.6,
    bitCrush: 0.1,
    sustainVolume: 0.35,
    filter: 350,
  },
  medium: {
    frequency: 380,
    decay: 0.03,
    release: 0.2,
    shape: 4,
    slide: -3,
    noise: 0.7,
    bitCrush: 0.2,
    sustainVolume: 0.5,
    filter: 120,
  },
  large: {
    frequency: 260,
    attack: 0.002,
    decay: 0.05,
    release: 0.32,
    shape: 4,
    slide: -2,
    noise: 0.8,
    bitCrush: 0.4,
    sustainVolume: 0.5,
    filter: 60,
  },
  blast: {
    frequency: 140,
    attack: 0.004,
    decay: 0.1,
    sustain: 0.12,
    release: 0.55,
    shape: 4,
    slide: -0.7,
    noise: 1.5,
    bitCrush: 0.3,
    delay: 0.11,
    sustainVolume: 0.5,
    filter: 45,
  },
  // Held as long as the loop needs: the lab fades its end into its start.
  thrust: {
    volume: 0.6,
    frequency: 110,
    sustain: 1.2,
    release: 0,
    shape: 2,
    noise: 0.4,
    tremolo: 0.15,
    repeatTime: 0.07,
    filter: -1000,
  },
};

/** The time between the gun's shots while fire is held, in seconds. */
const SHOT_EVERY_S = SHOT_EVERY_MS / 1000;

/** Returns how far the game raises the break that is `count` in its chain, in cents, as the view's `detuneOf()` does. */
function chainDetune(count: number): number {
  return Math.min(Math.max(count - 1, 0) * CHAIN_STEP_CENTS, CHAIN_MOST_CENTS);
}

/** Returns the gun's shots while fire is held from one time to another, in seconds, at a place across the field. */
function shots(from: number, to: number, x = 0): LabCue<SoundName>[] {
  const count = Math.floor((to - from) / SHOT_EVERY_S) + 1;
  return Array.from({ length: count }, (_, i) => ({
    at: from + i * SHOT_EVERY_S,
    sound: "fired",
    x,
  }));
}

const SCENES: readonly LabScene<SoundName>[] = [
  {
    name: "Hold fire",
    what: `The gun held for two seconds, a shot every ${String(SHOT_EVERY_MS)} ms: the sound the game plays most.`,
    cues: shots(0, 2),
  },
  {
    name: "A chain of breaks",
    what: "Small rocks broken one after another under fire, each a semitone higher than the last, up to a fifth.",
    cues: [
      ...shots(0, 1.3),
      ...Array.from({ length: 10 }, (_, i) => ({
        at: 0.1 + i * 0.12,
        sound: "small" as const,
        detune: chainDetune(i + 1),
        x: -0.8 + i * 0.18,
      })),
    ],
  },
  {
    name: "A boulder to rubble",
    what: "A large rock broken, its pieces broken in turn, down to the small ones, as one chain.",
    cues: [
      ...shots(0, 1.4, -0.1),
      { at: 0.3, sound: "large", detune: chainDetune(1), x: -0.1 },
      { at: 0.6, sound: "medium", detune: chainDetune(2), x: -0.4 },
      { at: 0.74, sound: "medium", detune: chainDetune(3), x: 0.2 },
      { at: 0.98, sound: "small", detune: chainDetune(4), x: -0.6 },
      { at: 1.1, sound: "small", detune: chainDetune(5), x: -0.3 },
      { at: 1.24, sound: "small", detune: chainDetune(6), x: 0.3 },
      { at: 1.36, sound: "small", detune: chainDetune(7), x: 0.6 },
    ],
  },
  {
    name: "A blast in a crowd",
    what: "A blast takes a crowd of rocks with it, each size heard once in its frame, then the pieces it threw are shot down: the mix at its busiest.",
    cues: [
      ...shots(0, 0.3),
      { at: 0.4, sound: "blast", x: 0 },
      { at: 0.4, sound: "large", detune: chainDetune(1), x: -0.5 },
      { at: 0.4, sound: "medium", detune: chainDetune(2), x: 0.4 },
      { at: 0.4, sound: "small", detune: chainDetune(3), x: -0.2 },
      ...shots(0.9, 1.6, 0.2),
      { at: 1.05, sound: "small", detune: chainDetune(4), x: 0.7 },
      { at: 1.33, sound: "medium", detune: chainDetune(5), x: -0.6 },
      { at: 1.6, sound: "small", detune: chainDetune(6), x: 0.1 },
    ],
  },
  {
    name: "Thrust and fire",
    what: "The thrust held for two and a half seconds while the gun fires and a rock breaks: the loop under everything else.",
    cues: [
      { at: 0, sound: "thrust", holdFor: 2.5 },
      ...shots(0.3, 2.2),
      { at: 1.2, sound: "medium", detune: chainDetune(1), x: 0.5 },
    ],
  },
];

const sounds: readonly LabSound<SoundName>[] = SOUNDS.map((name) => {
  const candidate = CANDIDATES[name];
  const plays = PLAYS[name];
  return candidate === undefined ? { name, plays } : { name, plays, candidate };
});

mountSoundLab({
  game: "Asteroid Breaker",
  sprite: { url: spriteUrl, spritemap },
  sounds,
  scenes: SCENES,
});
