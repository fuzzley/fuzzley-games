/// <reference types="vite/client" />
// The sound lab, the page `@fz/dev/sound-lab` has a game's dev server serve:
// the sounds the game ships beside candidates designed with ZzFX, each alone
// and in scenes played as the game plays them, varied, panned and limited or
// not, and the notes on how to make better ones. A game's lab module hands
// mountSoundLab() its sprite, its sounds and its scenes. Only a browser runs
// it.

import "./sound_lab_page.scss";
import {
  VARY_CENTS,
  VARY_DECIBELS,
  decibelsOf,
  gainToMatch,
  loudnessOf,
  panOf,
  seamless,
  variedPlay,
} from "./sound_lab_mix.ts";
import { SOUND_LAB_NOTES } from "./sound_lab_notes.ts";
import type { SpriteEntry } from "./sounds.ts";
import {
  ZZFX_SAMPLE_RATE,
  type ZzfxSound,
  formatZzfx,
  parseZzfx,
  zzfxCode,
  zzfxSamples,
} from "./zzfx.ts";

/** Describes a sound of the game's sprite, as the lab shows it. */
export interface LabSound<Name extends string> {
  readonly name: Name;
  /** What plays it in the game, in a few words. */
  readonly plays: string;
  /** The candidate designed to replace it, or none yet. */
  readonly candidate?: ZzfxSound;
}

/** Describes a sound a scene plays, as the game would play it. */
export interface LabCue<Name extends string> {
  /** When it plays, in seconds from the scene's start. */
  readonly at: number;
  readonly sound: Name;
  /** How far the game raises it, in cents. */
  readonly detune?: number;
  /** Where across the field it happens, from -1 at its left edge to 1 at its right, for the lab's panning. */
  readonly x?: number;
  /** How long a looping sound is held, in seconds. */
  readonly holdFor?: number;
}

/** Describes a moment of play the lab plays, its sounds as the game would play them. */
export interface LabScene<Name extends string> {
  readonly name: string;
  /** What happens in it, in a sentence. */
  readonly what: string;
  readonly cues: readonly LabCue<Name>[];
}

/** Describes a game's sound lab. */
export interface SoundLab<Name extends string> {
  /** The game's name, which titles the page. */
  readonly game: string;
  /** The sprite the game plays, its address and its map, as `@fz/dev/sounds` writes them. */
  readonly sprite: {
    readonly url: string;
    readonly spritemap: {
      readonly spritemap: Readonly<Record<Name, SpriteEntry>>;
    };
  };
  /** Every sound of the sprite, in its order. */
  readonly sounds: readonly LabSound<Name>[];
  readonly scenes: readonly LabScene<Name>[];
}

/** Which sounds a play takes: the sprite's, or the candidates, each sound without one taking the sprite's. */
type Source = "current" | "candidate";

/** Holds how the lab plays, as its controls set it. */
interface Playing {
  source: Source;
  vary: boolean;
  pan: boolean;
  limit: boolean;
  match: boolean;
  volume: number;
}

/** Holds a candidate as rendered, with what brings it as loud as the sound it would replace. */
interface Rendered {
  readonly buffer: AudioBuffer;
  readonly match: number;
}

/** How long a looping candidate's end fades into its start, in seconds. */
const LOOP_FADE_S = 0.08;

/** How long a looping sound is held where its cue doesn't say, in seconds. */
const HOLD_S = 1;

/** How far ahead a scene is scheduled, in seconds, so its first sound isn't late. */
const START_AHEAD_S = 0.05;

/** The breath between the sounds the game ships and the candidates, when a scene plays both, in seconds. */
const BETWEEN_S = 0.7;

/** What starts the key the page keeps an edited candidate under, before the game's name and the sound's. */
const STORAGE_PREFIX = "fz-sound-lab";

/** Plays the sprite's sounds and the candidates, through the lab's mix. */
class LabPlayer<Name extends string> {
  readonly settings: Playing = {
    source: "current",
    vary: false,
    pan: false,
    limit: false,
    match: true,
    volume: 0.8,
  };

  private readonly context = new AudioContext();
  private readonly volume = new GainNode(this.context);
  private readonly limiter = new DynamicsCompressorNode(this.context, {
    threshold: -9,
    knee: 6,
    ratio: 12,
    attack: 0.002,
    release: 0.12,
  });
  private readonly current = new Map<Name, AudioBuffer>();
  private readonly candidates = new Map<Name, Rendered>();
  private readonly sounding = new Set<AudioBufferSourceNode>();
  private readonly lab: SoundLab<Name>;

  constructor(lab: SoundLab<Name>) {
    this.lab = lab;
    this.mix();
  }

  /** Loads the sprite and cuts it into its sounds. */
  async load(): Promise<void> {
    const response = await fetch(this.lab.sprite.url);
    const sprite = await this.context.decodeAudioData(
      await response.arrayBuffer(),
    );
    const samples = sprite.getChannelData(0);
    for (const { name } of this.lab.sounds) {
      const { start, end } = this.lab.sprite.spritemap.spritemap[name];
      const from = Math.round(start * sprite.sampleRate);
      const to = Math.round(end * sprite.sampleRate);
      const buffer = new AudioBuffer({
        length: to - from,
        sampleRate: sprite.sampleRate,
      });
      buffer.copyToChannel(samples.slice(from, to), 0);
      this.current.set(name, buffer);
    }
  }

  /** Returns whether the game loops a sound while something is held. */
  loops(name: Name): boolean {
    return this.lab.sprite.spritemap.spritemap[name].loop;
  }

  /**
   * Renders a sound's candidate, or forgets it for none, and returns it, or
   * throws for one that can't be played, as a loop too short to fade.
   */
  setCandidate(name: Name, sound: ZzfxSound | null): Rendered | null {
    this.candidates.delete(name);
    if (sound === null) return null;
    const made = zzfxSamples(sound);
    const samples = this.loops(name)
      ? seamless(made, ZZFX_SAMPLE_RATE, LOOP_FADE_S)
      : made;
    if (samples.length === 0) throw new RangeError("It lasts no time.");
    const buffer = new AudioBuffer({
      length: samples.length,
      sampleRate: ZZFX_SAMPLE_RATE,
    });
    buffer.copyToChannel(samples, 0);
    const current = this.current.get(name);
    const match =
      current === undefined
        ? 1
        : gainToMatch(
            loudnessOf(samples, ZZFX_SAMPLE_RATE),
            loudnessOf(current.getChannelData(0), current.sampleRate),
          );
    const rendered = { buffer, match };
    this.candidates.set(name, rendered);
    return rendered;
  }

  /** Returns whether a sound has a candidate. */
  hasCandidate(name: Name): boolean {
    return this.candidates.has(name);
  }

  /** Puts the limiter on the mix or takes it off, and sets its volume, as the settings say. */
  mix(): void {
    this.volume.gain.value = this.settings.volume;
    this.volume.disconnect();
    this.limiter.disconnect();
    if (this.settings.limit) {
      this.volume.connect(this.limiter).connect(this.context.destination);
    } else {
      this.volume.connect(this.context.destination);
    }
  }

  /** Plays a scene from a source, after a wait in seconds, and returns how long it lasts. */
  async playScene(
    scene: LabScene<Name>,
    source: Source,
    after = 0,
  ): Promise<number> {
    await this.context.resume();
    const start = this.context.currentTime + START_AHEAD_S + after;
    let length = 0;
    for (const cue of scene.cues) {
      const played = this.play(cue, start + cue.at, source);
      length = Math.max(length, cue.at + played);
    }
    return length;
  }

  /** Stops every sound playing or waiting to. */
  stop(): void {
    for (const node of this.sounding) node.stop();
    this.sounding.clear();
  }

  /** Plays a cue at a time on the context's clock, and returns how long it lasts. */
  private play(cue: LabCue<Name>, when: number, source: Source): number {
    const candidate =
      source === "candidate" ? this.candidates.get(cue.sound) : undefined;
    const buffer = candidate?.buffer ?? this.current.get(cue.sound);
    if (buffer === undefined) return 0;
    const loop = this.loops(cue.sound);
    const varied = this.settings.vary
      ? variedPlay(Math.random)
      : { detune: 0, gain: 1 };
    const node = new AudioBufferSourceNode(this.context, {
      buffer,
      loop,
      detune: (cue.detune ?? 0) + varied.detune,
    });
    const matched = candidate && this.settings.match ? candidate.match : 1;
    const gain = new GainNode(this.context, { gain: varied.gain * matched });
    const pan = new StereoPannerNode(this.context, {
      pan: this.settings.pan ? panOf(cue.x ?? 0) : 0,
    });
    node.connect(gain).connect(pan).connect(this.volume);
    node.addEventListener("ended", () => this.sounding.delete(node));
    this.sounding.add(node);
    node.start(when);
    if (!loop) return buffer.duration;
    const held = cue.holdFor ?? HOLD_S;
    node.stop(when + held);
    return held;
  }
}

/** Describes an element to make: its classes, its text and its attributes. */
interface Made {
  readonly className?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** Returns a new element of a tag, as described, holding children. */
function make<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  { className, text, attrs = {} }: Made = {},
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  if (className !== undefined) element.className = className;
  if (text !== undefined) element.textContent = text;
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

/**
 * Returns a button that runs an action when pressed, named for assistive
 * technology as given, where its text alone repeats another's.
 */
function button(
  text: string,
  action: () => void,
  {
    tone = "secondary",
    label,
  }: { tone?: "main" | "secondary"; label?: string } = {},
): HTMLButtonElement {
  const made = make("button", {
    className: tone === "main" ? "fz-button" : "fz-button fz-button-secondary",
    text,
    attrs:
      label === undefined
        ? { type: "button" }
        : { type: "button", "aria-label": label },
  });
  made.addEventListener("click", action);
  return made;
}

/** Returns a checkbox with its label, which calls back with its state as it changes. */
function checkbox(
  text: string,
  checked: boolean,
  changed: (checked: boolean) => void,
): HTMLLabelElement {
  const input = make("input", { attrs: { type: "checkbox" } });
  input.checked = checked;
  input.addEventListener("change", () => {
    changed(input.checked);
  });
  return make("label", { className: "lab-choice" }, [input, text]);
}

/** Returns what a candidate's matching gain does to it, in words. */
function matchedBy(gain: number): string {
  const decibels = decibelsOf(gain);
  const by = Math.abs(decibels).toFixed(1);
  return decibels < 0
    ? `Matching turns it down ${by} dB to the game's sound.`
    : `Matching turns it up ${by} dB to the game's sound.`;
}

/** Returns what the page keeps, or null where it keeps nothing or can't be read. */
function kept(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Keeps a value under a key, or forgets the key for null, where the page can keep anything. */
function keep(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // A page that can't keep anything keeps the candidate until it reloads.
  }
}

/** Mounts a game's sound lab into an element, the page's body unless given. */
export function mountSoundLab<Name extends string>(
  lab: SoundLab<Name>,
  host: HTMLElement = document.body,
): void {
  const player = new LabPlayer(lab);
  const status = make("p", {
    className: "lab-status",
    attrs: { role: "status" },
  });
  const say = (text: string): void => {
    status.textContent = text;
  };
  const sceneGaps: (() => void)[] = [];
  const updateScenes = (): void => {
    for (const update of sceneGaps) update();
  };

  const controls = make("div", { className: "lab-controls" }, [
    make("fieldset", { className: "lab-group" }, [
      make("legend", { text: "Play" }),
      ...(
        [
          ["current", "The sounds the game ships"],
          ["candidate", "The candidates"],
        ] as const
      ).map(([source, text]) => {
        const input = make("input", {
          attrs: { type: "radio", name: "lab-source", value: source },
        });
        input.checked = player.settings.source === source;
        input.addEventListener("change", () => {
          if (input.checked) player.settings.source = source;
        });
        return make("label", { className: "lab-choice" }, [input, text]);
      }),
    ]),
    make("fieldset", { className: "lab-group" }, [
      make("legend", { text: "Mix" }),
      checkbox(
        `Vary each play (±${String(VARY_CENTS)} cents, ±${String(VARY_DECIBELS)} dB)`,
        player.settings.vary,
        (checked) => {
          player.settings.vary = checked;
        },
      ),
      checkbox("Pan by place", player.settings.pan, (checked) => {
        player.settings.pan = checked;
      }),
      checkbox("Limiter on the mix", player.settings.limit, (checked) => {
        player.settings.limit = checked;
        player.mix();
      }),
      checkbox(
        "Match loudness (candidates to the sounds they replace)",
        player.settings.match,
        (checked) => {
          player.settings.match = checked;
        },
      ),
    ]),
    make("div", { className: "lab-group lab-volume" }, [
      make("label", { text: "Volume", attrs: { for: "lab-volume" } }),
      (() => {
        const range = make("input", {
          attrs: {
            id: "lab-volume",
            type: "range",
            min: "0",
            max: "1",
            step: "0.05",
          },
        });
        range.value = String(player.settings.volume);
        range.addEventListener("input", () => {
          player.settings.volume = Number(range.value);
          player.mix();
        });
        return range;
      })(),
      button("Stop", () => {
        player.stop();
        say("Stopped.");
      }),
    ]),
  ]);

  const scenes = lab.scenes.map((scene) => {
    const missing = make("p", { className: "lab-missing" });
    sceneGaps.push(() => {
      const without = [...new Set(scene.cues.map((cue) => cue.sound))].filter(
        (name) => !player.hasCandidate(name),
      );
      missing.textContent =
        without.length === 0
          ? ""
          : `No candidate for ${without.join(", ")}: the candidates play the game's.`;
    });
    return make("article", { className: "lab-card" }, [
      make("h3", { text: scene.name }),
      make("p", { text: scene.what }),
      missing,
      make("div", { className: "lab-actions" }, [
        button(
          "Play",
          () => {
            const source = player.settings.source;
            void player.playScene(scene, source).then(() => {
              say(
                `${scene.name}: ${source === "current" ? "the sounds the game ships" : "the candidates"}.`,
              );
            });
          },
          { tone: "main", label: `Play ${scene.name}` },
        ),
        button(
          "Current, then candidate",
          () => {
            void (async () => {
              const length = await player.playScene(scene, "current");
              await player.playScene(scene, "candidate", length + BETWEEN_S);
              say(
                `${scene.name}: the sounds the game ships, then the candidates.`,
              );
            })();
          },
          { label: `${scene.name}: current, then candidate` },
        ),
      ]),
    ]);
  });

  const sounds = lab.sounds.map((sound) => {
    const key = `${STORAGE_PREFIX}:${lab.game}:${sound.name}`;
    const designed =
      sound.candidate === undefined ? "" : formatZzfx(sound.candidate);
    const editor = make("textarea", {
      className: "lab-editor",
      attrs: {
        id: `lab-${sound.name}`,
        rows: "2",
        spellcheck: "false",
        placeholder: "Paste a list from ZzFX's designer",
      },
    });
    editor.value = kept(key) ?? designed;
    const note = make("p", { className: "lab-note" });
    const playCandidate = button(
      "Candidate",
      () => {
        void player.playScene(
          { name: sound.name, what: "", cues: [{ at: 0, sound: sound.name }] },
          "candidate",
        );
      },
      { label: `${sound.name}: candidate` },
    );
    const copy = button(
      "Copy as code",
      () => {
        const parsed = parseZzfx(editor.value);
        if (parsed === null) return;
        const code = zzfxCode(parsed);
        navigator.clipboard.writeText(code).then(
          () => {
            say(`Copied ${sound.name}'s candidate.`);
          },
          () => {
            say(`${sound.name}: ${code}`);
          },
        );
      },
      { label: `Copy ${sound.name}'s candidate as code` },
    );
    const render = (): void => {
      const text = editor.value.trim();
      keep(key, editor.value === designed ? null : editor.value);
      const parsed = text === "" ? null : parseZzfx(text);
      try {
        const rendered = player.setCandidate(sound.name, parsed);
        note.textContent =
          text === ""
            ? "No candidate yet."
            : rendered === null
              ? "Not a ZzFX parameter list: the game's sound plays instead."
              : `${matchedBy(rendered.match)}${editor.value === designed ? "" : " Edited here."}`;
      } catch (error) {
        note.textContent = `Can't play it: ${error instanceof Error ? error.message : String(error)}`;
      }
      const has = player.hasCandidate(sound.name);
      playCandidate.disabled = !has;
      copy.disabled = !has;
      updateScenes();
    };
    editor.addEventListener("input", render);
    const reset = button(
      "Reset",
      () => {
        editor.value = designed;
        render();
      },
      { label: `Reset ${sound.name}'s candidate` },
    );
    return {
      render,
      card: make("article", { className: "lab-card lab-sound" }, [
        make("h3", {}, [
          make("code", { text: sound.name }),
          player.loops(sound.name) ? " (loops)" : "",
        ]),
        make("p", { text: sound.plays }),
        make("div", { className: "lab-actions" }, [
          button(
            "Current",
            () => {
              void player.playScene(
                {
                  name: sound.name,
                  what: "",
                  cues: [{ at: 0, sound: sound.name }],
                },
                "current",
              );
            },
            { tone: "main", label: `${sound.name}: current` },
          ),
          playCandidate,
        ]),
        make(
          "label",
          { className: "lab-label", attrs: { for: `lab-${sound.name}` } },
          [
            "ZzFX parameters",
            make("span", {
              className: "fz-visually-hidden",
              text: ` for ${sound.name}`,
            }),
          ],
        ),
        editor,
        note,
        make("div", { className: "lab-actions" }, [copy, reset]),
      ]),
    };
  });

  const notes = make("div", { className: "lab-prose" });
  notes.innerHTML = SOUND_LAB_NOTES;

  host.append(
    make("main", { className: "lab" }, [
      make("header", { className: "lab-header" }, [
        make("p", {
          className: "lab-kicker",
          text: "Served by the dev server only",
        }),
        make("h1", { text: `Sound lab: ${lab.game}` }),
        make("p", {
          className: "lab-lede",
          text: `The sounds ${lab.game} ships, beside candidates designed with ZzFX, alone and as the game plays them, and notes on better sounds for every game. The build leaves this page out.`,
        }),
        make(
          "nav",
          { className: "lab-nav", attrs: { "aria-label": "Parts" } },
          [
            make("a", { text: "Scenes", attrs: { href: "#scenes" } }),
            make("a", { text: "Sounds", attrs: { href: "#sounds" } }),
            make("a", { text: "Notes", attrs: { href: "#notes" } }),
          ],
        ),
      ]),
      make("section", { className: "lab-panel", attrs: { id: "scenes" } }, [
        make("h2", { text: "Scenes" }),
        controls,
        status,
        make("div", { className: "lab-grid" }, scenes),
      ]),
      make("section", { className: "lab-panel", attrs: { id: "sounds" } }, [
        make("h2", { text: "Sounds" }),
        make("p", {
          className: "lab-intro",
          text: "Each sound of the sprite, and its candidate as ZzFX's designer copies one. Edit a candidate, or paste one from the designer, and the scenes play it at once.",
        }),
        make(
          "div",
          { className: "lab-grid" },
          sounds.map(({ card }) => card),
        ),
      ]),
      make("section", { className: "lab-panel", attrs: { id: "notes" } }, [
        make("h2", { text: "Notes" }),
        notes,
      ]),
    ]),
  );

  say("Loading the sprite…");
  player.load().then(
    () => {
      for (const { render } of sounds) render();
      say("Ready. Pick a scene.");
    },
    (error: unknown) => {
      say(
        `Couldn't load the sprite: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  );
}
