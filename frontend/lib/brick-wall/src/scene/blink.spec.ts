import { runBareScene } from "@fz/phaser/testing";
import { type Scene, Scenes } from "phaser";
import { blink } from "./blink";

/** The scene's events a blinking listens for. */
const HEARD = [Scenes.Events.UPDATE, Scenes.Events.SHUTDOWN] as const;

/** Returns a scene running till the test finishes, and a cue drawn in it. */
async function cueInScene() {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  return { run, cue: run.scene.add.rectangle(0, 0, 10, 10) };
}

/** Reads that a cue blinks, never held steady. */
const never = () => false;

/** Returns how many listen for each of the events a blinking listens for. */
function listening(scene: Scene): number[] {
  return HEARD.map((event) => scene.events.listenerCount(event));
}

describe("blink", () => {
  it("shows a hidden cue as it starts to blink, then blinks it over its period", async () => {
    const { run, cue } = await cueInScene();
    cue.setVisible(false);
    const shown: boolean[] = [];

    blink(run.scene, cue, 1000, never);
    shown.push(cue.visible);
    for (const step of [250, 500, 500]) {
      run.advance(step);
      shown.push(cue.visible);
    }

    expect(shown).toEqual([true, true, false, true]);
  });

  it("blinks each cue from when it starts", async () => {
    const { run, cue } = await cueInScene();
    const later = run.scene.add.rectangle(0, 0, 10, 10);

    blink(run.scene, cue, 1000, never);
    run.advance(500);
    blink(run.scene, later, 1000, never);
    run.advance(250);

    expect([cue.visible, later.visible]).toEqual([false, true]);
  });

  it("holds a cue shown while it reads steady, and blinks it once it doesn't", async () => {
    const { run, cue } = await cueInScene();
    let steady = true;
    cue.setVisible(false);
    const shown: boolean[] = [];

    blink(run.scene, cue, 1000, () => steady);
    run.advance(750);
    shown.push(cue.visible);
    steady = false;
    run.advance(20);
    shown.push(cue.visible);

    expect(shown).toEqual([true, false]);
  });

  it("stops blinking a cue when told, shows it and listens for nothing more", async () => {
    const { run, cue } = await cueInScene();
    const before = listening(run.scene);
    const stop = blink(run.scene, cue, 1000, never);
    run.advance(750);

    stop();
    run.advance(1000);

    expect({ shown: cue.visible, listening: listening(run.scene) }).toEqual({
      shown: true,
      listening: before,
    });
  });

  it("stops blinking a cue as the scene ends, leaving nothing listening for its frames", async () => {
    const { run, cue } = await cueInScene();
    blink(run.scene, cue, 1000, never);

    run.scene.scene.stop();
    run.advance(20);

    expect(run.scene.events.listenerCount(Scenes.Events.UPDATE)).toBe(0);
  });

  it.each([
    ["blinking", false],
    ["held steady", true],
  ])(
    "throws for a period too short as it starts %s, listening for nothing",
    async (_, steady) => {
      const { run, cue } = await cueInScene();
      const before = listening(run.scene);

      const started = () => blink(run.scene, cue, 100, () => steady);

      expect(started).toThrow(RangeError);
      expect(listening(run.scene)).toEqual(before);
    },
  );
});
