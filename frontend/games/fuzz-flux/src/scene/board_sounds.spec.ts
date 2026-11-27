import { cacheSounds } from "@fz/phaser/testing";
import type { MockInstance } from "vitest";
import { Sound } from "phaser";
import { MOVE_FIXTURES } from "../testing/move_fixtures";
import {
  type Board,
  drawnPlay,
  playTo,
  startBoard,
} from "../testing/scene_shell";
import type { SoundName } from "../view/effects/sounds";
import type { SoundCue } from "../view/timeline/timeline";
import { SOUND_SPRITE } from "./board_sounds";

/** A wave's note two rungs up the ladder, softer than its own, at the tap. */
const NOTE: SoundCue = {
  atMs: 0,
  sound: "note-g5",
  cents: 200,
  volume: 0.6,
};

/** A pop a little after the note, past the first frame. */
const POP: SoundCue = { atMs: 40, sound: "pop", cents: 0, volume: 1 };

/** Describes the board heard: the scene run for a shell, and what the sound player was asked to play since. */
interface Heard extends Board {
  readonly played: MockInstance<
    (name: SoundName, detune: number, across: number, volume?: number) => void
  >;
}

/** Runs the scene on a board, set up as a spec says, and hears what it plays from the next frame. */
async function startHearing(
  setUp: Parameters<typeof startBoard>[1] = () => undefined,
): Promise<Heard> {
  const board = await startBoard(MOVE_FIXTURES.bunch, setUp);
  const played = vi.spyOn(board.scene.sounds.player, "playAt");
  return { ...board, played };
}

describe("BoardSounds", () => {
  it("can be heard again once the player wants sound", async () => {
    const { shell, run, scene } = await startBoard(
      MOVE_FIXTURES.bunch,
      (each) => {
        each.wantsSound = false;
      },
    );

    shell.wantsSound = true;
    run.advance(16);

    expect(scene.sound.mute).toBe(false);
  });

  it("are muted while the player wants none", async () => {
    const { shell, run, scene } = await startBoard(MOVE_FIXTURES.bunch);

    shell.wantsSound = false;
    run.advance(16);

    expect(scene.sound.mute).toBe(true);
  });

  it("leave the board drawn where the sprite can't be loaded", async () => {
    const { run, scene } = await startBoard(MOVE_FIXTURES.bunch);

    expect({ loaded: scene.sounds.player.loaded, ready: run.ready }).toEqual({
      loaded: false,
      ready: true,
    });
  });

  it("play each cue of the play's timeline as the play reaches its moment, as far tuned and as loud as it says", async () => {
    const board = await startHearing();

    playTo(board, drawnPlay({ sounds: [NOTE, POP] }), 32);

    expect(board.played.mock.calls).toEqual([["note-g5", 200, 0, 0.6]]);
  });

  it("play each cue once, not again in the frames after", async () => {
    const board = await startHearing();

    playTo(board, drawnPlay({ sounds: [NOTE, POP] }), 96);

    expect(board.played.mock.calls).toEqual([
      ["note-g5", 200, 0, 0.6],
      ["pop", 0, 0, 1],
    ]);
  });

  it("play none of a play that lands at once", async () => {
    const board = await startHearing();

    playTo(board, { ...drawnPlay({ sounds: [NOTE, POP] }), landed: true }, 96);

    expect(board.played).not.toHaveBeenCalled();
  });

  it("play each of the shell's cues as the scene's clock reaches its moment", async () => {
    const board = await startHearing();
    const nowMs = board.shell.ticks.at(-1)?.nowMs ?? 0;

    board.shell.shellCues = [{ ...POP, atMs: nowMs }];
    board.run.advance(48);

    expect(board.played.mock.calls).toEqual([["pop", 0, 0, 1]]);
  });

  it("reach the sprite, tuned and as loud as the cue says", async () => {
    const board = await startBoard(MOVE_FIXTURES.bunch);
    cacheSounds(board.scene, SOUND_SPRITE.key);
    const play = vi.spyOn(Sound.NoAudioSound.prototype, "play");
    onTestFinished(() => {
      play.mockRestore();
    });

    playTo(board, drawnPlay({ sounds: [NOTE] }), 16);

    expect(play.mock.calls).toEqual([
      ["note-g5", { detune: 200, volume: 0.6 }],
    ]);
  });
});
