import { LIMITER } from "@fz/core/sound_mix";
import { Sound } from "phaser";
import { limitSound, playMono, soundTime } from "./output";

/** Stands in for an audio node, keeping what it is connected to. */
class FakeNode {
  readonly to: FakeNode[] = [];

  connect(node: FakeNode): FakeNode {
    this.to.push(node);
    return node;
  }

  disconnect(): void {
    this.to.length = 0;
  }
}

/** Stands in for a compressor, its settings each a value. */
class FakeCompressor extends FakeNode {
  readonly threshold = { value: -24 };
  readonly knee = { value: 30 };
  readonly ratio = { value: 12 };
  readonly attack = { value: 0.003 };
  readonly release = { value: 0.25 };
}

/** Stands in for the speakers, as many channels as they count. */
class FakeDestination extends FakeNode {
  /** How many times the channels were set. */
  sets = 0;
  private channels = 2;

  constructor(readonly maxChannelCount = 2) {
    super();
  }

  get channelCount(): number {
    return this.channels;
  }

  set channelCount(count: number) {
    this.sets += 1;
    this.channels = count;
  }
}

/** Describes a game's sound played through Web Audio, as these specs fake it. */
interface FakeWebAudio {
  readonly manager: Sound.WebAudioSoundManager;
  readonly master: FakeNode;
  readonly destination: FakeDestination;
  /** The compressors the context made, in turn. */
  readonly compressors: FakeCompressor[];
}

/**
 * Returns a Web Audio sound manager over fake nodes, its master volume
 * connected to the speakers, as Phaser's is: jsdom has no Web Audio, so
 * the headless game plays through no manager like it.
 */
function fakeWebAudio(channels = 2): FakeWebAudio {
  const destination = new FakeDestination(channels);
  const master = new FakeNode();
  master.connect(destination);
  const compressors: FakeCompressor[] = [];
  const context = {
    currentTime: 12.5,
    destination,
    createDynamicsCompressor: (): FakeCompressor => {
      const made = new FakeCompressor();
      compressors.push(made);
      return made;
    },
  };
  // Phaser's own, but for what it would build on a context of its own.
  const manager = Object.assign(
    Object.create(
      Sound.WebAudioSoundManager.prototype,
    ) as Sound.WebAudioSoundManager,
    { context, masterVolumeNode: master },
  );
  return { manager, master, destination, compressors };
}

/** Returns a sound manager that plays nothing, as the headless game's is. */
function noAudio(): Sound.BaseSoundManager {
  return Object.create(
    Sound.NoAudioSoundManager.prototype,
  ) as Sound.NoAudioSoundManager;
}

describe("limitSound", () => {
  it("puts a limiter between the master volume and the speakers", () => {
    const { manager, master, destination, compressors } = fakeWebAudio();

    limitSound(manager);

    expect({
      master: master.to,
      limiter: compressors[0]?.to,
    }).toEqual({ master: [compressors[0]], limiter: [destination] });
  });

  it("sets the limiter as the mix asks", () => {
    const { manager, compressors } = fakeWebAudio();

    limitSound(manager);

    const [limiter] = compressors;
    expect({
      threshold: limiter?.threshold.value,
      knee: limiter?.knee.value,
      ratio: limiter?.ratio.value,
      attack: limiter?.attack.value,
      release: limiter?.release.value,
    }).toEqual(LIMITER);
  });

  it("limits a game's sound once, however often it is asked", () => {
    const { manager, master, compressors } = fakeWebAudio();
    limitSound(manager);

    limitSound(manager);

    expect({ made: compressors.length, master: master.to }).toEqual({
      made: 1,
      master: [compressors[0]],
    });
  });

  it("does nothing where the game plays no Web Audio", () => {
    expect(() => {
      limitSound(noAudio());
    }).not.toThrow();
  });
});

describe("playMono", () => {
  it("has the speakers take one channel for mono", () => {
    const { manager, destination } = fakeWebAudio();

    playMono(manager, true);

    expect(destination.channelCount).toBe(1);
  });

  it("has them take two again once mono is off", () => {
    const { manager, destination } = fakeWebAudio();
    playMono(manager, true);

    playMono(manager, false);

    expect(destination.channelCount).toBe(2);
  });

  it("keeps a speaker of one channel at one once mono is off", () => {
    const { manager, destination } = fakeWebAudio(1);
    playMono(manager, true);

    playMono(manager, false);

    expect(destination.channelCount).toBe(1);
  });

  it.each([true, false])(
    "sets nothing, mono %s, where the speakers say they take no channel",
    (mono) => {
      const { manager, destination } = fakeWebAudio(0);

      playMono(manager, mono);

      expect(destination.sets).toBe(0);
    },
  );

  it("sets nothing where the speakers already take the channels asked", () => {
    const { manager, destination } = fakeWebAudio();

    playMono(manager, false);

    expect(destination.sets).toBe(0);
  });

  it("does nothing where the game plays no Web Audio", () => {
    expect(() => {
      playMono(noAudio(), true);
    }).not.toThrow();
  });
});

describe("soundTime", () => {
  it("reads the audio context's clock, where the game plays through Web Audio", () => {
    const { manager } = fakeWebAudio();

    expect(soundTime(manager, 4000)).toBe(12.5);
  });

  it("reads the time handed in, in seconds, where it plays otherwise", () => {
    expect(soundTime(noAudio(), 4000)).toBe(4);
  });
});
