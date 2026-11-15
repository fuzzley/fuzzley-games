import { LIMITER } from "@fz/core/sound_mix";
import { Sound } from "phaser";

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
 * plays through Web Audio; where it plays otherwise, or its speakers say
 * they take no channel, which none could be set to, it does nothing.
 */
export function playMono(manager: Sound.BaseSoundManager, mono: boolean): void {
  if (!(manager instanceof Sound.WebAudioSoundManager)) return;
  const { destination } = manager.context;
  if (destination.maxChannelCount < 1) return;
  // The speakers take what they are given in as many channels as they
  // count, mixing two down to one as Web Audio's "speakers" rules say; a
  // speaker of one channel counts no more.
  const channels = mono ? 1 : Math.min(2, destination.maxChannelCount);
  if (destination.channelCount !== channels) {
    destination.channelCount = channels;
  }
}

/**
 * Returns the time a game's sound keeps, in seconds: its audio context's,
 * where it plays through Web Audio, by which a sound is scheduled, else
 * the time handed in, in milliseconds, as a scene's clock keeps it.
 */
export function soundTime(
  manager: Sound.BaseSoundManager,
  elseMs: number,
): number {
  return manager instanceof Sound.WebAudioSoundManager
    ? manager.context.currentTime
    : elseMs / 1000;
}
