/// <reference types="vite/client" />
// The sound lab, the page `@fz/dev/sound-lab` has a game's dev server serve:
// the sounds a game plays, each with its takes, alone and in scenes played
// as the game plays them, by the game's mix or plainly, beside the sounds it
// played before where it keeps them, and the notes on its sounds. A game's
// lab module hands mountSoundLab() its sprite, its sounds and its scenes.
// Only a browser runs it.

import "./sound_lab_page.scss";
import {
  DUCK,
  GameMix,
  HOLD_S,
  LIMITER,
  type MixCue,
  type SoundMix,
  type TakePlay,
  type TakeSprite,
  VARY_CENTS,
  VARY_DECIBELS,
  VARIATION,
  VOICES,
  panAt,
  soundingFor,
  variedPlay,
} from "./sound_lab_mix.ts";
import { soundLabNotes } from "./sound_lab_notes.ts";
import type { SpriteEntry } from "./sounds.ts";

/** Describes a sound of a game's sprite, as the lab shows it. */
export interface LabSound<Name extends string> {
  readonly name: Name;
  /** What plays it in the game, in a few words. */
  readonly plays: string;
}

/**
 * Describes a sound a scene plays, as the game would play it: when, which,
 * raised how far, where across the field, how loud and, for a loop, held
 * how long.
 */
export type LabCue<Name extends string> = MixCue<Name>;

/** Describes a moment of play the lab plays, its sounds as the game would play them. */
export interface LabScene<Name extends string, Before extends string = never> {
  readonly name: string;
  /** What happens in it, in a sentence. */
  readonly what: string;
  readonly cues: readonly LabCue<Name>[];
  /** The same moment as the game played it before, where the lab keeps the sounds it played then. */
  readonly before?: readonly LabCue<Before>[];
}

/** Describes a sprite, as `@fz/dev/sounds` or a game's sound build writes one. */
export interface LabSprite {
  /** Its address, or its addresses in formats of which the lab loads the first the browser plays. */
  readonly url: string | readonly string[];
  /** Its map, each take by its name. */
  readonly spritemap: {
    readonly spritemap: Readonly<Record<string, SpriteEntry>>;
  };
}

/** Describes a set of sounds the lab plays: their sprite, and each sound, in the order the lab shows them. */
export interface LabSounds<Name extends string> {
  readonly sprite: LabSprite;
  readonly sounds: readonly LabSound<Name>[];
}

/** Describes a game's sound lab. */
export interface SoundLab<
  Name extends string,
  Before extends string = never,
> extends LabSounds<Name> {
  /** The game's name, which titles the page. */
  readonly game: string;
  readonly scenes: readonly LabScene<Name, Before>[];
  /**
   * How the game mixes its sounds, for one that plays them by a mix: each
   * sound's family, level, takes and tuning, by which the lab plays them,
   * or plainly, as the page's control says.
   */
  readonly mix?: SoundMix<Name>;
  /** The sounds the game played before, which the lab plays as it played them, beside its own. */
  readonly before?: LabSounds<Before>;
}

/** Which of a lab's sets of sounds a play takes: the game's, or those it played before. */
type Source = "after" | "before";

/** Holds how the lab plays, as its controls set it. */
interface Playing {
  source: Source;
  /** Whether the game's sounds play by its mix, where it has one. */
  mixed: boolean;
  /** Whether a lab with no mix varies, pans and limits its plays, each at the lab's numbers. */
  vary: boolean;
  pan: boolean;
  limit: boolean;
  volume: number;
}

/**
 * How the lab limits a mix of its own, where the game has none: softer than
 * a game's limiter, as it was tried before the games had one.
 */
const LAB_LIMITER: DynamicsCompressorOptions = {
  threshold: -9,
  knee: 6,
  ratio: 12,
  attack: 0.002,
  release: 0.12,
};

/** How far ahead a scene is scheduled, in seconds, so its first sound isn't late. */
const START_AHEAD_S = 0.05;

/** The breath between a scene before and after, when the lab plays both, in seconds. */
const BETWEEN_S = 0.7;

/** The type a sprite's file is served as, by its extension, for asking the browser whether it plays it. */
const AUDIO_TYPES: Readonly<Record<string, string>> = {
  ogg: 'audio/ogg; codecs="vorbis"',
  m4a: 'audio/mp4; codecs="mp4a.40.2"',
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/** Returns the address of a sprite the browser plays: the first of its formats it can, else the first. */
function playableUrl(url: LabSprite["url"]): string {
  if (typeof url === "string") return url;
  const probe = new Audio();
  const playable = url.find((each) => {
    const extension = each.split("?")[0]?.split(".").pop() ?? "";
    const type = AUDIO_TYPES[extension];
    return type !== undefined && probe.canPlayType(type) !== "";
  });
  return playable ?? url[0] ?? "";
}

/** Holds a sprite's takes, each cut out of it, by its name. */
class Takes implements TakeSprite {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly sprite: LabSprite;

  constructor(sprite: LabSprite) {
    this.sprite = sprite;
  }

  /** Loads the sprite and cuts it into its takes. */
  async load(context: AudioContext): Promise<void> {
    const response = await fetch(playableUrl(this.sprite.url));
    const whole = await context.decodeAudioData(await response.arrayBuffer());
    for (const [take, { start, end }] of Object.entries(
      this.sprite.spritemap.spritemap,
    )) {
      const from = Math.round(start * whole.sampleRate);
      const to = Math.round(end * whole.sampleRate);
      const buffer = new AudioBuffer({
        length: Math.max(to - from, 1),
        numberOfChannels: whole.numberOfChannels,
        sampleRate: whole.sampleRate,
      });
      for (let channel = 0; channel < whole.numberOfChannels; channel++) {
        buffer.copyToChannel(
          whole.getChannelData(channel).slice(from, to),
          channel,
        );
      }
      this.buffers.set(take, buffer);
    }
  }

  /** Returns a take's samples, once loaded. */
  bufferOf(take: string): AudioBuffer | undefined {
    return this.buffers.get(take);
  }

  lengthOf(take: string): number {
    const entry = this.sprite.spritemap.spritemap[take];
    return entry === undefined ? 0 : entry.end - entry.start;
  }

  loops(take: string): boolean {
    return this.sprite.spritemap.spritemap[take]?.loop ?? false;
  }
}

/** Plays a game's sounds, and those it played before, through the lab's mix or the game's. */
class LabPlayer<Name extends string, Before extends string> {
  readonly settings: Playing = {
    source: "after",
    mixed: true,
    vary: false,
    pan: false,
    limit: false,
    volume: 0.8,
  };

  private readonly context = new AudioContext();
  /** Where the plays the game's mix limits go, as the game limits them, ahead of the lab's volume. */
  private readonly limited = new GainNode(this.context);
  /** Where every other play goes. */
  private readonly plain = new GainNode(this.context);
  private readonly volume = new GainNode(this.context);
  private readonly limiter: DynamicsCompressorNode;
  private readonly after: Takes;
  private readonly before: Takes | undefined;
  private readonly gameMix: GameMix<Name> | undefined;
  private readonly sounding = new Set<AudioBufferSourceNode>();

  constructor(lab: SoundLab<Name, Before>) {
    this.after = new Takes(lab.sprite);
    this.before = lab.before && new Takes(lab.before.sprite);
    this.gameMix = lab.mix && new GameMix(lab.mix, Math.random);
    this.limiter = new DynamicsCompressorNode(
      this.context,
      lab.mix ? LIMITER : LAB_LIMITER,
    );
    this.plain.connect(this.volume);
    if (lab.mix) {
      this.limited.connect(this.limiter).connect(this.volume);
      this.volume.connect(this.context.destination);
    }
    this.mix();
  }

  /** Whether the game plays its sounds by a mix. */
  get hasMix(): boolean {
    return this.gameMix !== undefined;
  }

  /** Loads the sprites and cuts each into its takes. */
  async load(): Promise<void> {
    await Promise.all([
      this.after.load(this.context),
      this.before?.load(this.context),
    ]);
  }

  /** Returns a sound's takes, by their names in the sprite, in turn. */
  takesOf(name: Name): readonly string[] {
    return this.gameMix?.takesOf(name) ?? [name];
  }

  /** Returns whether the game loops a sound while something is held. */
  loops(name: Name): boolean {
    return this.after.loops(this.firstTakeOf(name));
  }

  /** Returns whether the game looped a sound it played before while something was held. */
  loopedBefore(name: Before): boolean {
    return this.before?.loops(name) ?? false;
  }

  /**
   * Sets the lab's volume and, for a lab with no game's mix, puts its own
   * limiter on after the volume or takes it off, as the settings say.
   */
  mix(): void {
    this.volume.gain.value = this.settings.volume;
    if (this.hasMix) return;
    this.volume.disconnect();
    this.limiter.disconnect();
    if (this.settings.limit) {
      this.volume.connect(this.limiter).connect(this.context.destination);
    } else {
      this.volume.connect(this.context.destination);
    }
  }

  /**
   * Plays a scene's cues of the game's sounds, after a wait in seconds, by
   * its mix where it has one and the settings keep it on, else plainly, and
   * returns how long they last.
   */
  async playAfter(cues: readonly LabCue<Name>[], after = 0): Promise<number> {
    const mixing = this.settings.mixed ? this.gameMix : undefined;
    return mixing
      ? this.playAll(
          mixing.plan(cues, this.after),
          this.after,
          this.limited,
          after,
        )
      : this.playAll(
          this.plainPlays(cues, this.after, (name) => this.firstTakeOf(name)),
          this.after,
          this.plain,
          after,
        );
  }

  /**
   * Plays a scene's cues of the sounds the game played before, plainly, as
   * it played them, after a wait in seconds, and returns how long they last.
   */
  async playBefore(
    cues: readonly LabCue<Before>[],
    after = 0,
  ): Promise<number> {
    if (this.before === undefined) return 0;
    return this.playAll(
      this.plainPlays(cues, this.before, (name) => name),
      this.before,
      this.plain,
      after,
    );
  }

  /** Plays a take of the game's sounds alone, plainly, whether the mix is on or off. */
  async playTake(take: string): Promise<void> {
    const held = this.after.loops(take) ? HOLD_S : null;
    await this.playAll(
      [{ take, at: 0, detune: 0, gain: 1, pan: 0, stopsAt: held }],
      this.after,
      this.plain,
      0,
    );
  }

  /** Stops every sound playing or waiting to. */
  stop(): void {
    for (const node of this.sounding) node.stop();
    this.sounding.clear();
  }

  /** Returns the first take of a sound of the game's. */
  private firstTakeOf(name: Name): string {
    return this.takesOf(name)[0] ?? name;
  }

  /**
   * Plays some plays of a sprite's takes into a bus, after a wait in
   * seconds, and returns how long they last.
   */
  private async playAll(
    plays: readonly TakePlay[],
    takes: Takes,
    bus: AudioNode,
    after: number,
  ): Promise<number> {
    await this.context.resume();
    const start = this.context.currentTime + START_AHEAD_S + after;
    let length = 0;
    for (const play of plays) {
      length = Math.max(length, this.schedule(play, takes, bus, start) - start);
    }
    return length;
  }

  /**
   * Returns how cues play with no game's mix: each its sound's first take,
   * raised and as loud as its cue says, and, for a lab with no mix of its
   * own, varied and panned at the lab's numbers where the settings say.
   */
  private plainPlays<Sound extends string>(
    cues: readonly LabCue<Sound>[],
    takes: Takes,
    firstTakeOf: (sound: Sound) => string,
  ): TakePlay[] {
    const ownMix = !this.hasMix;
    return cues.map((cue) => {
      const take = firstTakeOf(cue.sound);
      const varied =
        ownMix && this.settings.vary
          ? variedPlay(Math.random)
          : { detune: 0, gain: 1 };
      return {
        take,
        at: cue.at,
        detune: (cue.detune ?? 0) + varied.detune,
        gain: (cue.volume ?? 1) * varied.gain,
        pan: ownMix && this.settings.pan ? panAt(cue.x ?? 0) : 0,
        stopsAt: takes.loops(take) ? cue.at + (cue.holdFor ?? HOLD_S) : null,
      };
    });
  }

  /**
   * Schedules a play into a bus from a start on the context's clock, and
   * returns when it ends there.
   */
  private schedule(
    play: TakePlay,
    takes: Takes,
    bus: AudioNode,
    start: number,
  ): number {
    const buffer = takes.bufferOf(play.take);
    if (buffer === undefined) return start;
    const node = new AudioBufferSourceNode(this.context, {
      buffer,
      loop: takes.loops(play.take),
      detune: play.detune,
    });
    const gain = new GainNode(this.context, { gain: play.gain });
    const pan = new StereoPannerNode(this.context, { pan: play.pan });
    node.connect(gain).connect(pan).connect(bus);
    node.addEventListener("ended", () => this.sounding.delete(node));
    this.sounding.add(node);
    const when = start + play.at;
    node.start(when);
    if (play.stopsAt === null) {
      return when + soundingFor(buffer.duration, play.detune);
    }
    node.stop(start + play.stopsAt);
    return start + play.stopsAt;
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

/** Returns a source's name, as the lab says it. */
function sourceWords(source: Source): string {
  return source === "after" ? "after" : "before";
}

/** Returns what a sound of a game's mix is, in words: its family, its level, its takes and its tuning. */
function mixedWords(sound: SoundMix<string>[string]): string {
  const takes = sound.takes === 1 ? "1 take" : `${String(sound.takes)} takes`;
  const tuned = sound.tuned ? ", in key" : "";
  return `${sound.family}, ${sound.level}, ${takes}${tuned}`;
}

/** Mounts a game's sound lab into an element, the page's body unless given. */
export function mountSoundLab<
  Name extends string,
  Before extends string = never,
>(lab: SoundLab<Name, Before>, host: HTMLElement = document.body): void {
  const player = new LabPlayer(lab);
  const { before } = lab;
  const status = make("p", {
    className: "lab-status",
    attrs: { role: "status" },
  });
  const say = (text: string): void => {
    status.textContent = text;
  };

  const sources = make("fieldset", { className: "lab-group" }, [
    make("legend", { text: "Play" }),
    ...(
      [
        ["after", "After: the sounds the game plays"],
        ["before", "Before: the sounds it played before"],
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
  ]);

  const mixing = player.hasMix
    ? [
        checkbox(
          "The game's mix: takes in turn, the busy sounds varied, each placed, its voices held, ducked under a huge one, and a limiter",
          player.settings.mixed,
          (checked) => {
            player.settings.mixed = checked;
          },
        ),
        make("p", {
          className: "lab-note",
          text: before
            ? "Off, each sound plays its first take plainly. The sounds before play as the game played them, plainly."
            : "Off, each sound plays its first take plainly.",
        }),
      ]
    : [
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
      ];

  const controls = make("div", { className: "lab-controls" }, [
    ...(before ? [sources] : []),
    make("fieldset", { className: "lab-group" }, [
      make("legend", { text: "Mix" }),
      ...mixing,
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
    const both = scene.before;
    const play = (): void => {
      const source = before ? player.settings.source : "after";
      if (source === "before" && both === undefined) {
        say(`${scene.name}: the game played nothing of it before.`);
        return;
      }
      const playing =
        source === "after" || both === undefined
          ? player.playAfter(scene.cues)
          : player.playBefore(both);
      void playing.then(() => {
        say(
          before ? `${scene.name}: ${sourceWords(source)}.` : `${scene.name}.`,
        );
      });
    };
    return make("article", { className: "lab-card" }, [
      make("h3", { text: scene.name }),
      make("p", { text: scene.what }),
      ...(before && both === undefined
        ? [
            make("p", {
              className: "lab-missing",
              text: "No before: the game played nothing of it then.",
            }),
          ]
        : []),
      make("div", { className: "lab-actions" }, [
        button("Play", play, { tone: "main", label: `Play ${scene.name}` }),
        ...(before && both !== undefined
          ? [
              button(
                "Before, then after",
                () => {
                  void (async () => {
                    const length = await player.playBefore(both);
                    await player.playAfter(scene.cues, length + BETWEEN_S);
                    say(`${scene.name}: before, then after.`);
                  })();
                },
                { label: `${scene.name}: before, then after` },
              ),
            ]
          : []),
      ]),
    ]);
  });

  const sounds = lab.sounds.map((sound) => {
    const mixed = lab.mix?.[sound.name];
    const takes = player.takesOf(sound.name);
    return make("article", { className: "lab-card lab-sound" }, [
      make("h3", {}, [
        make("code", { text: sound.name }),
        player.loops(sound.name) ? " (loops)" : "",
      ]),
      ...(mixed === undefined
        ? []
        : [make("p", { className: "lab-note", text: mixedWords(mixed) })]),
      make("p", { text: sound.plays }),
      make("div", { className: "lab-actions" }, [
        button(
          "Play",
          () => {
            void player.playAfter([{ at: 0, sound: sound.name }]);
          },
          { tone: "main", label: `Play ${sound.name}` },
        ),
        ...(takes.length > 1
          ? takes.map((take, index) =>
              button(
                `Take ${String(index + 1)}`,
                () => {
                  void player.playTake(take);
                },
                { label: `${sound.name}: take ${String(index + 1)}` },
              ),
            )
          : []),
      ]),
    ]);
  });

  const beforeSounds = (before?.sounds ?? []).map((sound) =>
    make("article", { className: "lab-card lab-sound" }, [
      make("h3", {}, [
        make("code", { text: sound.name }),
        player.loopedBefore(sound.name) ? " (loops)" : "",
      ]),
      make("p", { text: sound.plays }),
      make("div", { className: "lab-actions" }, [
        button(
          "Play",
          () => {
            void player.playBefore([{ at: 0, sound: sound.name }]);
          },
          { tone: "main", label: `Play ${sound.name} as before` },
        ),
      ]),
    ]),
  );

  const notes = make("div", { className: "lab-prose" });
  notes.innerHTML = soundLabNotes({
    variation: VARIATION,
    voices: VOICES,
    duck: DUCK,
  });

  const beforePart: [string, string][] = before ? [["before", "Before"]] : [];
  const parts: [string, string][] = [
    ["scenes", "Scenes"],
    ["sounds", "Sounds"],
    ...beforePart,
    ["notes", "Notes"],
  ];

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
          text: `The sounds ${lab.game} plays, each alone and as the game plays them${before ? ", beside the sounds it played before" : ""}, and notes on its sounds. The build leaves this page out.`,
        }),
        make(
          "nav",
          { className: "lab-nav", attrs: { "aria-label": "Parts" } },
          parts.map(([id, text]) =>
            make("a", { text, attrs: { href: `#${id}` } }),
          ),
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
          text: player.hasMix
            ? "Each sound the game plays, by its mix or plainly, as the control above says, and each of its takes alone."
            : "Each sound of the sprite.",
        }),
        make("div", { className: "lab-grid" }, sounds),
      ]),
      ...(before
        ? [
            make(
              "section",
              { className: "lab-panel", attrs: { id: "before" } },
              [
                make("h2", { text: "Before" }),
                make("p", {
                  className: "lab-intro",
                  text: "Each sound the game played before, as it played them.",
                }),
                make("div", { className: "lab-grid" }, beforeSounds),
              ],
            ),
          ]
        : []),
      make("section", { className: "lab-panel", attrs: { id: "notes" } }, [
        make("h2", { text: "Notes" }),
        notes,
      ]),
    ]),
  );

  say("Loading the sounds…");
  player.load().then(
    () => {
      say("Ready. Pick a scene.");
    },
    (error: unknown) => {
      say(
        `Couldn't load the sounds: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  );
}
