import { FrameSounds } from "./frame_sounds";

/** The sounds of the sprite here, in its order. */
const SOUNDS = ["tap", "ring", "thud"] as const;

/** Names a sound of the sprite here. */
type Sound = (typeof SOUNDS)[number];

/** Returns what a frame's sounds play, each as its name and how far it rose. */
function played(sounds: FrameSounds<Sound>): [Sound, number][] {
  const plays: [Sound, number][] = [];
  sounds.playEach((name, detune) => plays.push([name, detune]));
  return plays;
}

describe("FrameSounds", () => {
  it("plays nothing before a sound is heard", () => {
    const sounds = new FrameSounds(SOUNDS);

    expect(played(sounds)).toEqual([]);
  });

  it("plays each sound heard once, at the most it rose", () => {
    const sounds = new FrameSounds(SOUNDS);
    sounds.hear("ring", 100);
    sounds.hear("thud", 0);
    sounds.hear("ring", 300);
    sounds.hear("ring", 200);

    expect(played(sounds)).toEqual([
      ["ring", 300],
      ["thud", 0],
    ]);
  });

  it("plays them in the sprite's order, whatever order they were heard in", () => {
    const sounds = new FrameSounds(SOUNDS);
    sounds.hear("ring", 0);
    sounds.hear("thud", 0);
    sounds.hear("tap", 0);

    expect(played(sounds)).toEqual([
      ["tap", 0],
      ["ring", 0],
      ["thud", 0],
    ]);
  });

  it("plays a sound lowered below its own pitch", () => {
    const sounds = new FrameSounds(SOUNDS);
    sounds.hear("thud", -100);

    expect(played(sounds)).toEqual([["thud", -100]]);
  });

  it("forgets the sounds it played", () => {
    const sounds = new FrameSounds(SOUNDS);
    sounds.hear("tap", 0);
    played(sounds);

    expect(played(sounds)).toEqual([]);
  });
});
