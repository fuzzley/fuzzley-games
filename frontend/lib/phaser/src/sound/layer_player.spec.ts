import { fadeGain } from "@fz/core/sound_mix";
import { type Scene, Sound, type Types } from "phaser";
import type { MockInstance } from "vitest";
import type { HostedScene } from "../host";
import { type SceneRun, cacheSounds, runBareScene } from "../testing";
import { LayerPlayer, type SoundLayer } from "./layer_player";
import { soundTime } from "./output";

// The headless game plays no Web Audio, so a spec stands in for its clock.
vi.mock("./output", { spy: true });

/** Names a layer of the specs' beds. */
type Name = "bed" | "pulse" | "other";

/** Two beds and a layer over them, in two formats or one, the layer a little quiet. */
const LAYERS: Readonly<Record<Name, SoundLayer>> = {
  bed: { key: "bed", url: ["bed.ogg", "bed.m4a"] },
  pulse: { key: "pulse", url: "pulse.ogg", volume: 0.5 },
  other: { key: "other-bed", url: "other.ogg" },
};

/** Describes a layer's play the game started: its sound and the config it started with. */
interface Started {
  readonly sound: Sound.BaseSound;
  readonly config: Types.Sound.SoundConfig;
}

describe("LayerPlayer", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene, to make a player in. */
  async function startScene(): Promise<Scene> {
    run = await runBareScene();
    return run.scene;
  }

  /**
   * Starts a bare scene with a player of the layers, every file loaded,
   * each loop the length given, in seconds; the headless game decodes no
   * audio, so a sound it makes has none of its own.
   */
  async function startPlayer(
    seconds = 8,
  ): Promise<{ scene: Scene; player: LayerPlayer<Name> }> {
    const scene = await startScene();
    const player = new LayerPlayer(scene, LAYERS);
    for (const { key } of Object.values(LAYERS)) cacheSounds(scene, key);
    // The headless game's sound manager is the one that plays nothing.
    const manager = scene.sound as Sound.NoAudioSoundManager;
    const add = manager.add.bind(manager);
    vi.spyOn(manager, "add").mockImplementation((key, config) =>
      Object.assign(add(key, config), { totalDuration: seconds }),
    );
    return { scene, player };
  }

  /** Has each sound play as one does where audio plays, and returns each play, in turn. */
  function playing(): Started[] {
    const started: Started[] = [];
    vi.spyOn(Sound.NoAudioSound.prototype, "play").mockImplementation(function (
      this: Sound.NoAudioSound,
      config,
    ) {
      Object.assign(this, { isPlaying: true });
      started.push({
        sound: this,
        config: typeof config === "object" ? { ...config } : {},
      });
      return true;
    });
    return started;
  }

  /** Returns the sounds of a layer the game holds, not yet let go. */
  function soundsOf(scene: Scene, name: Name): Sound.BaseSound[] {
    return scene.sound
      .getAll(LAYERS[name].key)
      .filter((sound) => !sound.pendingRemove);
  }

  /** Returns the volume a layer's one sound plays at, or undefined where it plays none. */
  function volumeOf(scene: Scene, name: Name): number | undefined {
    const [sound] = soundsOf(scene, name);
    return sound === undefined
      ? undefined
      : (sound as Sound.NoAudioSound).volume;
  }

  /** Moves the game on, a frame at a time. */
  function wait(ms: number): void {
    run?.advance(ms);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(soundTime).mockReset();
    run?.destroy();
    run = null;
  });

  /** Watches what a scene asks of its loader: the files it adds, and how often it starts it. */
  function watchLoader(scene: Scene): {
    readonly audio: MockInstance<Scene["load"]["audio"]>;
    readonly start: MockInstance<Scene["load"]["start"]>;
  } {
    return {
      audio: vi.spyOn(scene.load, "audio"),
      start: vi.spyOn(scene.load, "start"),
    };
  }

  // The headless game loads no audio, so these watch the calls themselves.
  it("asks Phaser to load a layer as it is first held, in each of its formats, once", async () => {
    const scene = await startScene();
    const loader = watchLoader(scene);
    const player = new LayerPlayer(scene, LAYERS);
    player.hold("bed", true);
    player.hold("pulse", true);

    wait(500);

    expect({
      audio: loader.audio.mock.calls,
      started: loader.start.mock.calls.length,
    }).toEqual({
      audio: [
        ["bed", ["bed.ogg", "bed.m4a"]],
        ["pulse", "pulse.ogg"],
      ],
      started: 2,
    });
  });

  it("asks for no layer's file before a scene holds it", async () => {
    const scene = await startScene();
    const loader = watchLoader(scene);
    new LayerPlayer(scene, LAYERS);

    wait(500);

    expect({
      audio: loader.audio.mock.calls,
      started: loader.start.mock.calls.length,
    }).toEqual({ audio: [], started: 0 });
  });

  it("asks for a layer's file ahead, as it is told to fetch it", async () => {
    const scene = await startScene();
    const loader = watchLoader(scene);
    const player = new LayerPlayer(scene, LAYERS);
    player.fetch("other");

    wait(16);

    expect({
      audio: loader.audio.mock.calls,
      started: loader.start.mock.calls.length,
    }).toEqual({ audio: [["other-bed", "other.ogg"]], started: 1 });
  });

  it("asks for a layer's file fetched ahead no more once it is held", async () => {
    const scene = await startScene();
    const loader = watchLoader(scene);
    const player = new LayerPlayer(scene, LAYERS);
    player.fetch("other");
    wait(16);
    player.hold("other", true);

    wait(500);

    expect(loader.audio).toHaveBeenCalledOnce();
  });

  it("asks for no file already in the cache", async () => {
    const scene = await startScene();
    cacheSounds(scene, LAYERS.bed.key);
    const loader = watchLoader(scene);
    const player = new LayerPlayer(scene, LAYERS);
    player.hold("bed", true);

    wait(16);

    expect({
      audio: loader.audio.mock.calls,
      started: loader.start.mock.calls.length,
    }).toEqual({ audio: [], started: 0 });
  });

  it("starts a layer held looping, silent, a moment ahead, at the bar line's start", async () => {
    const { player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);

    wait(16);

    expect(started.map(({ config }) => config)).toEqual([
      { loop: true, volume: 0, delay: 0.05, seek: 0 },
    ]);
  });

  it("plays nothing it isn't held to", async () => {
    const { scene } = await startPlayer();
    playing();

    wait(500);

    expect(soundsOf(scene, "bed")).toEqual([]);
  });

  it("fades a layer held in, half way in a second", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);

    wait(1000);

    expect(volumeOf(scene, "bed")).toBeCloseTo(fadeGain(0.5), 12);
  });

  it("fades a layer in all the way in two seconds, to its own volume", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("pulse", true);

    wait(2500);

    expect(volumeOf(scene, "pulse")).toBe(0.5);
  });

  it("fades as fast as it is told", async () => {
    const scene = await startScene();
    const player = new LayerPlayer(scene, LAYERS, 0.5);
    cacheSounds(scene, LAYERS.bed.key);
    playing();
    player.hold("bed", true);

    wait(500);

    expect(volumeOf(scene, "bed")).toBe(1);
  });

  it("fades no further while the sound's clock stands still, as it does before the player's first touch", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);
    wait(500);
    vi.mocked(soundTime).mockReturnValue(
      soundTime(scene.sound, scene.time.now),
    );

    wait(1000);

    expect(volumeOf(scene, "bed")).toBeCloseTo(fadeGain(0.25), 12);
  });

  it("fades a layer let go out", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);
    wait(2500);
    player.hold("bed", false);

    wait(1000);

    expect(volumeOf(scene, "bed")).toBeCloseTo(fadeGain(0.5), 12);
  });

  it("stops a layer once it has faded out", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);
    wait(2500);
    player.hold("bed", false);

    wait(2500);

    expect(soundsOf(scene, "bed")).toEqual([]);
  });

  it("fades a layer held again as it fades out back in from where it stands, on the sound it played", async () => {
    const { scene, player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);
    wait(2500);
    player.hold("bed", false);
    wait(1000);
    player.hold("bed", true);

    wait(500);

    expect(started).toHaveLength(1);
    expect(volumeOf(scene, "bed")).toBeCloseTo(fadeGain(0.75), 12);
  });

  it("starts a layer held before its file has loaded once it has", async () => {
    const scene = await startScene();
    const player = new LayerPlayer(scene, LAYERS);
    playing();
    player.hold("bed", true);
    wait(500);

    cacheSounds(scene, LAYERS.bed.key);
    wait(16);

    expect(soundsOf(scene, "bed")).toHaveLength(1);
  });

  it("starts a layer held late as far into its loop as the layers playing are", async () => {
    const { player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);
    wait(3000);
    player.hold("pulse", true);

    wait(16);

    expect(started[1]?.config.seek).toBeCloseTo(3, 9);
  });

  it("starts a layer held late on its own loop, past its length", async () => {
    const { player } = await startPlayer(2);
    const started = playing();
    player.hold("bed", true);
    wait(3000);
    player.hold("pulse", true);

    wait(16);

    expect(started[1]?.config.seek).toBeCloseTo(1, 9);
  });

  it("starts the bar line again once nothing plays", async () => {
    const { player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);
    wait(1000);
    player.hold("bed", false);
    wait(1000);
    player.hold("pulse", true);

    wait(16);

    expect(started[1]?.config.seek).toBe(0);
  });

  it("crosses from one bed to another at one loudness", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);
    wait(2500);
    player.hold("bed", false);
    player.hold("other", true);

    wait(704);

    const power =
      (volumeOf(scene, "bed") ?? 0) ** 2 + (volumeOf(scene, "other") ?? 0) ** 2;
    expect(power).toBeCloseTo(1, 12);
  });

  it("starts a layer held again where another destroyed its sound", async () => {
    const { scene, player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);
    wait(2500);
    scene.sound.removeAll();

    wait(16);

    const [sound] = soundsOf(scene, "bed");
    expect({
      played: started.length,
      anew: sound === started[1]?.sound,
    }).toEqual({ played: 2, anew: true });
  });

  it("starts the bar line again where another destroyed every sound", async () => {
    const { scene, player } = await startPlayer();
    const started = playing();
    player.hold("bed", true);
    player.hold("pulse", true);
    wait(3000);
    scene.sound.removeAll();

    wait(16);

    expect(started.slice(2).map(({ config }) => config.seek)).toEqual([0, 0]);
  });

  it("stops every layer as the scene ends", async () => {
    const { scene, player } = await startPlayer();
    playing();
    player.hold("bed", true);
    player.hold("pulse", true);
    wait(500);

    scene.game.scene.stop(scene.scene.key);

    expect([...soundsOf(scene, "bed"), ...soundsOf(scene, "pulse")]).toEqual(
      [],
    );
  });

  it("starts nothing once its scene has ended, though the scene starts again", async () => {
    const { scene, player } = await startPlayer();
    playing();
    scene.game.scene.stop(scene.scene.key);
    scene.game.scene.start(scene.scene.key);
    player.hold("bed", true);

    wait(500);

    expect(soundsOf(scene, "bed")).toEqual([]);
  });
});
