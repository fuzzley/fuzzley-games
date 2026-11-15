import {
  DUCK,
  DUCK_AT_START,
  type Duck,
  FADE_SECONDS,
  LIMITER,
  type MixedPlay,
  type MixedSound,
  NO_TAKE,
  PAN_WIDTH,
  ROOM,
  SOUND_LEVELS,
  type SoundLevel,
  VARIATION,
  VOICES,
  type VariationLimits,
  type Voice,
  acrossOf,
  duckedGain,
  ducksOthers,
  fadeGain,
  fadedShare,
  gainOf,
  isDucked,
  isVaried,
  loopPhase,
  mixedPlay,
  nextTake,
  panOf,
  takeMarkers,
  variedDetune,
  variedGain,
  voiceGivingWay,
} from "./sound_mix";

/** Returns a random source that draws the numbers given, in turn. */
function drawing(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0;
}

/** Returns the takes a sound plays over some plays, from its first. */
function takesPlayed(takes: number, plays: number): number[] {
  const played: number[] = [];
  let last = NO_TAKE;
  for (let play = 0; play < plays; play++) {
    last = nextTake(last, takes);
    played.push(last);
  }
  return played;
}

/** Returns a voice of a sound, its family the sound's own unless given, at a level, started at a count. */
function voice(
  name: string,
  started: number,
  level: SoundLevel = "small",
  family = name,
): Voice {
  return { name, family, level, started };
}

/** Returns voices of one sound, of a family, at a level, started in turn from a count. */
function voicesOf(
  name: string,
  count: number,
  {
    family = name,
    level = "small",
    from = 1,
  }: { family?: string; level?: SoundLevel; from?: number } = {},
): Voice[] {
  return Array.from({ length: count }, (_, at) =>
    voice(name, from + at, level, family),
  );
}

describe("SOUND_LEVELS", () => {
  it("lists the levels from the quietest", () => {
    expect(SOUND_LEVELS).toEqual(["tick", "small", "medium", "large", "huge"]);
  });
});

describe("nextTake", () => {
  it("plays a sound's first take first", () => {
    expect(nextTake(NO_TAKE, 3)).toBe(0);
  });

  it("plays the takes in turn, from the first again after the last", () => {
    expect(takesPlayed(3, 7)).toEqual([0, 1, 2, 0, 1, 2, 0]);
  });

  it("never plays a take twice running where there are two", () => {
    expect(takesPlayed(2, 4)).toEqual([0, 1, 0, 1]);
  });

  it("plays a sound of one take by that take every time", () => {
    expect(takesPlayed(1, 3)).toEqual([0, 0, 0]);
  });
});

describe("takeMarkers", () => {
  it("names a sound's one take by the sound's own name", () => {
    expect(takeMarkers("dash-ready", 1)).toEqual(["dash-ready"]);
  });

  it("names each of several takes by its number from 1", () => {
    expect(takeMarkers("hit-iron", 3)).toEqual([
      "hit-iron-1",
      "hit-iron-2",
      "hit-iron-3",
    ]);
  });
});

describe("isVaried", () => {
  it.each<SoundLevel>(["tick", "small"])(
    "varies a noisy sound at the level %s",
    (level) => {
      expect(isVaried({ level, tuned: false })).toBe(true);
    },
  );

  it.each<SoundLevel>(["medium", "large", "huge"])(
    "leaves a noisy sound at the level %s as it is",
    (level) => {
      expect(isVaried({ level, tuned: false })).toBe(false);
    },
  );

  it("never varies a tuned sound, which must stay in key", () => {
    expect(isVaried({ level: "tick", tuned: true })).toBe(false);
  });

  it("varies the levels a variation names", () => {
    const variation = { ...VARIATION, levels: ["huge"] as const };

    expect(isVaried({ level: "huge", tuned: false }, variation)).toBe(true);
  });
});

describe("VARIATION", () => {
  it("varies a noisy tick or small sound by up to 40 cents and 1.5 dB", () => {
    expect(VARIATION).toEqual({
      cents: 40,
      decibels: 1.5,
      levels: ["tick", "small"],
    });
  });
});

describe("variedDetune", () => {
  it("lowers a play 40 cents for the least number drawn", () => {
    expect(variedDetune(drawing(0))).toBe(-40);
  });

  it("raises it 40 cents for a number near 1", () => {
    expect(variedDetune(drawing(0.999_999))).toBeCloseTo(40, 3);
  });

  it("leaves it as it is for the middle number", () => {
    expect(variedDetune(drawing(0.5))).toBe(0);
  });

  it("varies it as far as it is asked", () => {
    expect(variedDetune(drawing(0.75), 60)).toBe(30);
  });
});

describe("variedGain", () => {
  it("quiets a play 1.5 dB for the least number drawn", () => {
    expect(variedGain(drawing(0))).toBeCloseTo(gainOf(-1.5), 12);
  });

  it("leaves it as loud for the middle number", () => {
    expect(variedGain(drawing(0.5))).toBe(1);
  });

  it("varies it as far as it is asked", () => {
    expect(variedGain(drawing(1), 6)).toBeCloseTo(gainOf(6), 12);
  });
});

describe("gainOf", () => {
  it("returns 6 dB down as about a half", () => {
    expect(gainOf(-6)).toBeCloseTo(0.501, 3);
  });

  it("returns no change as 1", () => {
    expect(gainOf(0)).toBe(1);
  });
});

describe("acrossOf", () => {
  it.each([
    [0, -1],
    [20, 0],
    [40, 1],
    [30, 0.5],
  ])("puts x %s of a field 40 wide at %s across", (x, across) => {
    expect(acrossOf(x, 40)).toBe(across);
  });
});

describe("panOf", () => {
  it("pans a sound at the field's right edge 60% of the way right", () => {
    expect(panOf(1)).toBe(0.6);
  });

  it("pans one at the left edge as far left", () => {
    expect(panOf(-1)).toBe(-PAN_WIDTH);
  });

  it.each([
    [-3, -PAN_WIDTH],
    [3, PAN_WIDTH],
  ])("pans a sound at %s, past an edge, no further", (across, pan) => {
    expect(panOf(across)).toBe(pan);
  });

  it("leaves a sound in the middle in the middle", () => {
    expect(panOf(0)).toBe(0);
  });

  it("pans as far to a side as it is asked", () => {
    expect(panOf(0.5, 0.7)).toBe(0.35);
  });
});

describe("voiceGivingWay", () => {
  it("makes room for a play where few sound", () => {
    const voices = [voice("tap", 1), voice("ring", 2)];

    expect(voiceGivingWay(voices, "tap", "tap")).toBe(ROOM);
  });

  it("makes room where nothing sounds", () => {
    expect(voiceGivingWay([], "tap", "tap")).toBe(ROOM);
  });

  it("makes room for a sound's fourth voice", () => {
    const voices = voicesOf("tap", 3);

    expect(voiceGivingWay(voices, "tap", "tap")).toBe(ROOM);
  });

  it("has the oldest of a sound's four voices give way to its fifth", () => {
    const voices = [voice("tap", 4), voice("tap", 2), voice("tap", 3)];
    voices.push(voice("tap", 5));

    expect(voiceGivingWay(voices, "tap", "tap")).toBe(1);
  });

  it("has one of the sound's own give way, even where another sounds older", () => {
    const voices = [
      voice("ring", 1, "tick"),
      ...voicesOf("tap", 4, { from: 2 }),
    ];

    expect(voiceGivingWay(voices, "tap", "tap")).toBe(1);
  });

  it("makes room for a sound's play where four of another sound", () => {
    const voices = voicesOf("ring", 4);

    expect(voiceGivingWay(voices, "tap", "tap")).toBe(ROOM);
  });

  it("has one of a family give way where eight of it sound", () => {
    const voices = [
      ...voicesOf("stone", 4, { family: "rocks" }),
      ...voicesOf("ice", 4, { family: "rocks", from: 5 }),
    ];

    expect(voiceGivingWay(voices, "iron", "rocks")).toBe(0);
  });

  it("has the quietest of a family give way before an older louder one", () => {
    const voices = [
      ...voicesOf("blast", 4, { family: "rocks", level: "huge" }),
      ...voicesOf("ice", 4, { family: "rocks", from: 5, level: "small" }),
    ];

    expect(voiceGivingWay(voices, "iron", "rocks")).toBe(4);
  });

  it("has none of another family give way where the play's family is full", () => {
    const voices = [
      voice("shot", 1, "tick", "ship"),
      ...voicesOf("stone", 8, { family: "rocks", from: 2 }),
    ];

    expect(voiceGivingWay(voices, "ice", "rocks")).toBe(1);
  });

  it("leaves a family's voices be where the play's family has room", () => {
    const voices = voicesOf("stone", 8, { family: "rocks" });

    expect(voiceGivingWay(voices, "shot", "ship")).toBe(ROOM);
  });

  /** Returns voices of as many sounds as given, each of its own family, at a level, started in turn from a count. */
  function voicesApart(
    count: number,
    level: SoundLevel,
    from: number,
  ): Voice[] {
    return Array.from({ length: count }, (_, at) =>
      voice(`sound-${String(from + at)}`, from + at, level),
    );
  }

  it("makes room for a twenty-fourth voice in all", () => {
    const voices = voicesApart(23, "large", 1);

    expect(voiceGivingWay(voices, "new", "new")).toBe(ROOM);
  });

  it("has the quietest of all give way where twenty-four sound, the oldest of those first", () => {
    const voices = [
      voice("shot", 1, "medium"),
      ...voicesApart(3, "large", 2),
      voice("ping", 25, "tick"),
      ...voicesApart(18, "large", 5),
      voice("tap", 30, "tick"),
    ];

    expect(voiceGivingWay(voices, "new", "new")).toBe(4);
  });

  it("makes room for a family's eighth voice", () => {
    const voices = voicesOf("stone", 7, { family: "rocks" });

    expect(voiceGivingWay(voices, "ice", "rocks")).toBe(ROOM);
  });

  it("keeps to the limits it is given", () => {
    const voices = voicesOf("tap", 2);

    expect(
      voiceGivingWay(voices, "tap", "tap", { sound: 2, family: 9, all: 9 }),
    ).toBe(0);
  });

  it("lets twenty-four sound in all, four of a sound and eight of a family", () => {
    expect(VOICES).toEqual({ sound: 4, family: 8, all: 24 });
  });
});

describe("ducksOthers", () => {
  it("has a huge sound duck the others", () => {
    expect(ducksOthers("huge")).toBe(true);
  });

  it("has a large one duck none", () => {
    expect(ducksOthers("large")).toBe(false);
  });

  it("has the levels a duck names duck the others", () => {
    expect(ducksOthers("large", { ...DUCK, by: ["large"] })).toBe(true);
  });
});

describe("isDucked", () => {
  it.each<SoundLevel>(["tick", "small"])(
    "ducks a sound at the level %s",
    (level) => {
      expect(isDucked(level)).toBe(true);
    },
  );

  it.each<SoundLevel>(["medium", "large", "huge"])(
    "leaves a sound at the level %s be",
    (level) => {
      expect(isDucked(level)).toBe(false);
    },
  );

  it("ducks the levels a duck names", () => {
    expect(isDucked("medium", { ...DUCK, levels: ["medium"] })).toBe(true);
  });
});

describe("duckedGain", () => {
  /** A duck that's easy to read: 12 dB down over a tenth, held to a second, back over half of one. */
  const SLOW: Duck = {
    ...DUCK,
    decibels: 12,
    attack: 0.1,
    heldUntil: 1,
    release: 0.5,
  };
  const DOWN = gainOf(-6);

  it("ducks the busy levels under a huge sound 6 dB, held until a third of a second, in over 20 ms and out over 100", () => {
    expect(DUCK).toEqual({
      by: ["huge"],
      levels: ["tick", "small"],
      decibels: 6,
      attack: 0.02,
      heldUntil: 1 / 3,
      release: 0.1,
    });
  });

  it("leaves a sound be before anything ducked it", () => {
    expect(duckedGain(-0.1)).toBe(1);
  });

  it("leaves it be as the duck starts", () => {
    expect(duckedGain(0)).toBe(1);
  });

  it("turns it down a share of the way through the attack", () => {
    expect(duckedGain(0.05, SLOW)).toBeCloseTo((1 + gainOf(-12)) / 2, 12);
  });

  it("holds it 6 dB down once the attack is done", () => {
    expect(duckedGain(DUCK.attack)).toBe(DOWN);
  });

  it("holds it down until a third of a second has passed", () => {
    expect(duckedGain(0.33)).toBe(DOWN);
  });

  it("starts it back up once a third of a second has passed", () => {
    expect(duckedGain(0.34)).toBeGreaterThan(DOWN);
  });

  it("brings it back up a share of the way through the release", () => {
    expect(duckedGain(1.25, SLOW)).toBeCloseTo((1 + gainOf(-12)) / 2, 12);
  });

  it("leaves it be once the release is done", () => {
    expect(duckedGain(1 / 3 + 0.1)).toBe(1);
  });
});

describe("DUCK_AT_START", () => {
  it("ducks a play as the mix does, down from its start", () => {
    expect(duckedGain(0, DUCK_AT_START)).toBe(gainOf(-6));
  });

  it("lets it up as the mix does", () => {
    expect(duckedGain(1 / 3 + 0.05, DUCK_AT_START)).toBe(
      duckedGain(1 / 3 + 0.05),
    );
  });

  it("never turns a play down further as time passes, so the latest of two ducks is the deeper", () => {
    const gains = Array.from({ length: 50 }, (_, i) =>
      duckedGain(i / 100, DUCK_AT_START),
    );

    expect(gains).toEqual(gains.toSorted((one, other) => one - other));
  });
});

describe("mixedPlay", () => {
  /** A noisy sound of three takes at a busy level, which the mix varies and ducks. */
  const BUSY: MixedSound = {
    family: "rocks",
    level: "small",
    takes: 3,
    tuned: false,
  };

  /** Returns a play's record to write into, with nothing of a play in it. */
  function blank(): MixedPlay {
    return { take: 99, detune: 99, gain: 99 };
  }

  /** Returns how a sound plays first, long after any duck, drawing the numbers given. */
  function played(sound: MixedSound, ...draws: number[]): Readonly<MixedPlay> {
    return mixedPlay(sound, NO_TAKE, Infinity, drawing(...draws), blank());
  }

  it("plays a sound's first take first", () => {
    expect(played(BUSY, 0.5, 0.5).take).toBe(0);
  });

  it("plays the take after the last, in turn", () => {
    const takes = [NO_TAKE, 0, 1, 2].map(
      (last) => mixedPlay(BUSY, last, Infinity, drawing(), blank()).take,
    );

    expect(takes).toEqual([0, 1, 2, 0]);
  });

  it("varies a busy noisy sound, its raise drawn before its loudness", () => {
    expect(played(BUSY, 1, 0)).toEqual({
      take: 0,
      detune: 40,
      gain: gainOf(-1.5),
    });
  });

  it("leaves a tuned sound as the play asks", () => {
    expect(played({ ...BUSY, tuned: true }, 1, 1)).toEqual({
      take: 0,
      detune: 0,
      gain: 1,
    });
  });

  it("leaves a sound at a level the variation doesn't name as the play asks", () => {
    expect(played({ ...BUSY, level: "medium" }, 1, 1)).toEqual({
      take: 0,
      detune: 0,
      gain: 1,
    });
  });

  it("ducks a busy sound 6 dB from the start of a sound that ducks others", () => {
    const play = mixedPlay(BUSY, NO_TAKE, 0, drawing(0.5, 0.5), blank());

    expect(play.gain).toBe(gainOf(-6));
  });

  it("lets a busy sound be once the duck is done", () => {
    const play = mixedPlay(BUSY, NO_TAKE, 0.5, drawing(0.5, 0.5), blank());

    expect(play.gain).toBe(1);
  });

  it("ducks no sound at a level the duck doesn't name", () => {
    const loud = { ...BUSY, level: "huge" } as const;

    expect(mixedPlay(loud, NO_TAKE, 0, drawing(), blank()).gain).toBe(1);
  });

  it("varies and ducks by the limits it is given", () => {
    const variation: VariationLimits = {
      cents: 10,
      decibels: 3,
      levels: ["medium"],
    };
    const duck: Duck = { ...DUCK_AT_START, levels: ["medium"], decibels: 12 };
    const medium = { ...BUSY, level: "medium" } as const;

    const play = mixedPlay(
      medium,
      NO_TAKE,
      0,
      drawing(1, 1),
      blank(),
      variation,
      duck,
    );

    expect(play).toEqual({ take: 0, detune: 10, gain: gainOf(3 - 12) });
  });

  it("writes the play into the record it is given", () => {
    const into = blank();

    expect(mixedPlay(BUSY, NO_TAKE, Infinity, drawing(), into)).toBe(into);
  });
});

describe("LIMITER", () => {
  it("holds the peaks from 3 dB under full scale, hard and fast", () => {
    expect(LIMITER).toEqual({
      threshold: -3,
      knee: 0,
      ratio: 20,
      attack: 0.003,
      release: 0.1,
    });
  });
});

describe("loopPhase", () => {
  it("starts a layer at its start on the shared start", () => {
    expect(loopPhase(0, 8)).toBe(0);
  });

  it("starts one late as far into its loop as the others are", () => {
    expect(loopPhase(19, 8)).toBe(3);
  });

  it("counts a time before the shared start back from the loop's end", () => {
    expect(loopPhase(-1, 8)).toBe(7);
  });

  it("starts a loop of no length at its start", () => {
    expect(loopPhase(5, 0)).toBe(0);
  });
});

describe("fadedShare", () => {
  it("fades a layer in by the share of its fade that passed", () => {
    expect(fadedShare(0, 1, 0.5)).toBe(0.25);
  });

  it("fades over two seconds", () => {
    expect(FADE_SECONDS).toBe(2);
  });

  it("fades at once where a fade takes no time", () => {
    expect(fadedShare(0.2, 1, 0, 0)).toBe(1);
  });

  it("fades one out the same way", () => {
    expect(fadedShare(1, 0, 0.5, 1)).toBe(0.5);
  });

  it("stops a fade in at the whole way", () => {
    expect(fadedShare(0.9, 1, 1, 1)).toBe(1);
  });

  it("stops a fade out at nothing", () => {
    expect(fadedShare(0.1, 0, 1, 1)).toBe(0);
  });

  it("leaves a layer at its target be", () => {
    expect(fadedShare(1, 1, 1, 1)).toBe(1);
  });
});

describe("fadeGain", () => {
  it("holds two layers crossing at the same pace to one loudness", () => {
    const share = 0.3;

    expect(fadeGain(share) ** 2 + fadeGain(1 - share) ** 2).toBeCloseTo(1, 12);
  });

  it.each([
    [0, 0],
    [1, 1],
    [-1, 0],
    [2, 1],
  ])("gives a layer %s of the way in a gain of %s", (share, gain) => {
    expect(fadeGain(share)).toBeCloseTo(gain, 12);
  });
});
