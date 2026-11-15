import { Sound } from "phaser";

/**
 * How the limiter after a game's master volume holds its peaks: hard and
 * fast, 3 dB under full scale, so thirty breaks under a blast never clip.
 */
export const LIMITER = {
  threshold: -3,
  knee: 0,
  ratio: 20,
  attack: 0.003,
  release: 0.1,
} as const satisfies DynamicsCompressorOptions;

/** The master volumes given a limiter, so each is given one, however many players ask. */
const limited = new WeakSet<AudioNode>();

/**
 * Puts a limiter between a game's master volume and its speakers, where it
 * plays through Web Audio; where it plays otherwise, or its master volume
 * has one already, it does nothing.
 *
 * The limiter belongs to the game's sound manager, which outlives a scene,
 * so every scene a host shows plays through it.
 */
export function limitSound(manager: Sound.BaseSoundManager): void {
  if (!(manager instanceof Sound.WebAudioSoundManager)) return;
  const { context, masterVolumeNode } = manager;
  if (limited.has(masterVolumeNode)) return;
  limited.add(masterVolumeNode);
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold;
  limiter.knee.value = LIMITER.knee;
  limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack;
  limiter.release.value = LIMITER.release;
  // Phaser connects the master volume to the speakers and nothing else.
  masterVolumeNode.disconnect();
  masterVolumeNode.connect(limiter).connect(context.destination);
}

/**
 * Sums a game's two ears into one, for one ear or one speaker, where a
 * sound panned away would be lost, or lets them be two again, where it
 * plays through Web Audio; where it plays otherwise, it does nothing.
 */
export function playMono(manager: Sound.BaseSoundManager, mono: boolean): void {
  if (!(manager instanceof Sound.WebAudioSoundManager)) return;
  const { destination } = manager.context;
  // The speakers take what they are given in as many channels as they
  // count, mixing two down to one as Web Audio's "speakers" rules say; a
  // speaker of one channel counts no more.
  destination.channelCount = mono
    ? 1
    : Math.min(2, destination.maxChannelCount);
}
